import type { ElementBehavior, ElementRenderContext } from './types'
import type { LayoutNode } from '../../core/layout/types'
import type { KeyEvent } from '../terminal/input'
import { registerElement } from './registry'

function getValue(node: LayoutNode): string {
    return node._inputValue ?? String(node.props.value ?? node.props.modelValue ?? '')
}

function emitUpdate(node: LayoutNode): void {
    const handler = node.events.get('update:modelvalue')
    if (handler) handler(node._inputValue!)
}

function ensureState(node: LayoutNode): void {
    if (node._inputValue === undefined) {
        node._inputValue = getValue(node)
        node._cursorPos = node._inputValue.length
        node._prevCursorPos = node._cursorPos
    }
}

/**
 * Compute {line, col} from a flat cursor offset within a multi-line string.
 * Used for hard-line navigation (when wrapping is not available).
 */
function getCursorLineCol(value: string, cursorPos: number): { line: number; col: number } {
    const before = value.slice(0, cursorPos)
    const lines = before.split('\n')
    return {
        line: lines.length - 1,
        col: (lines[lines.length - 1] ?? '').length,
    }
}

/**
 * Convert {line, col} back to a flat cursor offset.
 * Clamps col to the target line's length.
 * Used for hard-line navigation.
 */
function getFlatPos(lines: string[], targetLine: number, targetCol: number): number {
    const clampedLine = Math.max(0, Math.min(targetLine, lines.length - 1))
    let pos = 0
    for (let i = 0; i < clampedLine; i++) {
        pos += (lines[i]?.length ?? 0) + 1 // +1 for \n
    }
    pos += Math.min(targetCol, lines[clampedLine]?.length ?? 0)
    return pos
}

/**
 * Visual line with wrapping info.
 */
interface VisualLine {
    text: string      // displayable text (does not include the \n)
    startPos: number  // flat offset in the full value string
}

/**
 * Split value into visual lines based on content width.
 * Respects hard newlines and soft-wraps long lines at width boundary.
 * Uses character-based wrapping (predictable, aligns with terminal editors).
 */
function buildVisualLines(value: string, width: number): VisualLine[] {
    if (width <= 0) return []
    const result: VisualLine[] = []
    const hardLines = value.split('\n')
    let flatPos = 0
    for (const hardLine of hardLines) {
        if (hardLine.length === 0) {
            // Empty hard line (blank line)
            result.push({ text: '', startPos: flatPos })
        } else {
            // Soft-wrap the hard line
            let offset = 0
            while (offset < hardLine.length) {
                result.push({
                    text: hardLine.slice(offset, offset + width),
                    startPos: flatPos + offset,
                })
                offset += width
            }
        }
        flatPos += hardLine.length + 1 // +1 for '\n'
    }
    return result
}

/**
 * Get the visual line and column for a flat cursor position.
 */
function getVisualPos(visualLines: VisualLine[], flatPos: number): { vLine: number; col: number } {
    for (let i = visualLines.length - 1; i >= 0; i--) {
        if (flatPos >= visualLines[i]!.startPos) {
            return { vLine: i, col: flatPos - visualLines[i]!.startPos }
        }
    }
    return { vLine: 0, col: 0 }
}

const textareaBehavior: ElementBehavior = {
    handleKey(node: LayoutNode, key: KeyEvent, requestRender: () => void): void {
        ensureState(node)

        const val = node._inputValue!
        const pos = node._cursorPos!

        // Determine content width for visual wrapping
        const layout = node.layout
        const contentWidth = layout
            ? layout.width - 2 * layout.border.width - layout.padding.left - layout.padding.right
            : 0

        // Use visual lines if we have layout and width; otherwise fall back to hard lines
        const visualLines = contentWidth > 0 ? buildVisualLines(val, contentWidth) : null
        const navInfo = visualLines ? getVisualPos(visualLines, pos) : getCursorLineCol(val, pos)

        if (key.name === 'backspace') {
            if (pos > 0) {
                node._inputValue = val.slice(0, pos - 1) + val.slice(pos)
                node._cursorPos = pos - 1
            }
        } else if (key.name === 'delete') {
            node._inputValue = val.slice(0, pos) + val.slice(pos + 1)
        } else if (key.name === 'left') {
            node._cursorPos = Math.max(0, pos - 1)
        } else if (key.name === 'right') {
            node._cursorPos = Math.min(val.length, pos + 1)
        } else if (key.name === 'up') {
            if (visualLines) {
                const vLine = navInfo.vLine
                const col = navInfo.col
                if (vLine > 0) {
                    const prevLine = visualLines[vLine - 1]!
                    node._cursorPos = prevLine.startPos + Math.min(col, prevLine.text.length)
                } else {
                    node._cursorPos = 0
                }
            } else {
                // Fallback: hard-line navigation
                const lines = val.split('\n')
                const line = navInfo.line as number
                const col = navInfo.col as number
                node._cursorPos = line > 0 ? getFlatPos(lines, line - 1, col) : 0
            }
        } else if (key.name === 'down') {
            if (visualLines) {
                const vLine = navInfo.vLine
                const col = navInfo.col
                if (vLine < visualLines.length - 1) {
                    const nextLine = visualLines[vLine + 1]!
                    node._cursorPos = nextLine.startPos + Math.min(col, nextLine.text.length)
                } else {
                    node._cursorPos = val.length
                }
            } else {
                // Fallback: hard-line navigation
                const lines = val.split('\n')
                const line = navInfo.line as number
                const col = navInfo.col as number
                node._cursorPos = line < lines.length - 1
                    ? getFlatPos(lines, line + 1, col)
                    : val.length
            }
        } else if (key.name === 'home') {
            if (visualLines) {
                const vLine = navInfo.vLine
                node._cursorPos = visualLines[vLine]!.startPos
            } else {
                // Fallback: hard-line navigation
                const lines = val.split('\n')
                const line = navInfo.line as number
                node._cursorPos = getFlatPos(lines, line, 0)
            }
        } else if (key.name === 'end') {
            if (visualLines) {
                const vLine = navInfo.vLine
                const vl = visualLines[vLine]!
                node._cursorPos = vl.startPos + vl.text.length
            } else {
                // Fallback: hard-line navigation
                const lines = val.split('\n')
                const line = navInfo.line as number
                node._cursorPos = getFlatPos(lines, line, lines[line]?.length ?? 0)
            }
        } else if (key.name === 'enter') {
            node._inputValue = val.slice(0, pos) + '\n' + val.slice(pos)
            node._cursorPos = pos + 1
        } else if (!key.ctrl && !key.meta && key.sequence && key.sequence.length === 1) {
            node._inputValue = val.slice(0, pos) + key.sequence + val.slice(pos)
            node._cursorPos = pos + 1
        }

        // Only emit when value actually changed (guard against spurious updates)
        if (node._inputValue !== val) {
            emitUpdate(node)
        }
        requestRender()
    },

    render(node: LayoutNode, { buffer, cellStyle, adjustedY }: ElementRenderContext): void {
        const layout = node.layout!
        const border = layout.border.width
        const padding = layout.padding

        const contentX = layout.x + border + padding.left
        const contentY = adjustedY + border + padding.top
        const contentWidth = layout.width - 2 * border - padding.left - padding.right
        const contentHeight = layout.height - 2 * border - padding.top - padding.bottom

        if (contentWidth <= 0 || contentHeight <= 0) return

        const value = getValue(node)

        // Render placeholder when empty
        const placeholder = node.props.placeholder as string | undefined
        if (value.length === 0 && placeholder) {
            const placeholderStyle = { ...cellStyle, dim: true }
            for (let i = 0; i < contentHeight; i++) {
                const line = i === 0 ? placeholder.slice(0, contentWidth) : ''
                buffer.write(contentX, contentY + i, line.padEnd(contentWidth, ' '), i === 0 ? placeholderStyle : cellStyle)
            }
            return
        }

        // Build visual lines (with soft wrapping)
        const visualLines = buildVisualLines(value, contentWidth)
        const cursorPos = node._cursorPos ?? value.length
        const { vLine: cursorVLine } = getVisualPos(visualLines, cursorPos)

        // Track content height for scrollbar rendering
        node.contentHeight = visualLines.length

        // Adjust vertical scroll so the cursor stays visible, but preserve manual scrolling
        let scrollY = node.scrollY ?? 0

        // Only auto-scroll if the cursor position CHANGED (keyboard navigation)
        // This prevents resetting scroll after mouse wheel scrolling
        const prevCursorPos = node._prevCursorPos ?? cursorPos
        const cursorMoved = cursorPos !== prevCursorPos
        node._prevCursorPos = cursorPos

        if (cursorMoved) {
            // Cursor position changed - auto-scroll to keep it visible
            if (cursorVLine < scrollY) {
                scrollY = cursorVLine
            } else if (cursorVLine >= scrollY + contentHeight) {
                scrollY = cursorVLine - contentHeight + 1
            }
        }
        // Otherwise, preserve scroll (from mouse wheel or previous state)

        // Clamp to valid range
        const maxScroll = Math.max(0, visualLines.length - contentHeight)
        scrollY = Math.min(scrollY, maxScroll)
        node.scrollY = scrollY

        // Render visual lines
        for (let i = 0; i < contentHeight; i++) {
            const vl = visualLines[scrollY + i]
            const text = vl ? vl.text : ''
            buffer.write(contentX, contentY + i, text.padEnd(contentWidth, ' '), cellStyle)
        }
    },

    getCursorPos(node: LayoutNode): { x: number; y: number } | null {
        if (!node.layout) return null
        const { layout } = node
        const border = layout.border.width
        const padding = layout.padding
        const contentX = layout.x + border + padding.left
        const contentY = layout.y + border + padding.top
        const contentWidth = layout.width - 2 * border - padding.left - padding.right
        const contentHeight = layout.height - 2 * border - padding.top - padding.bottom

        const value = getValue(node)
        const cursorPos = node._cursorPos ?? value.length
        const visualLines = buildVisualLines(value, contentWidth)
        const { vLine, col } = getVisualPos(visualLines, cursorPos)

        const visibleLine = vLine - node.scrollY
        if (visibleLine < 0 || visibleLine >= contentHeight) return null

        return { x: contentX + col, y: contentY + visibleLine }
    },
}

registerElement('textarea', textareaBehavior)
