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
    }
}

/**
 * Compute {line, col} from a flat cursor offset within a multi-line string.
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

const textareaBehavior: ElementBehavior = {
    handleKey(node: LayoutNode, key: KeyEvent, requestRender: () => void): void {
        ensureState(node)

        const val = node._inputValue!
        const pos = node._cursorPos!
        const lines = val.split('\n')
        const { line, col } = getCursorLineCol(val, pos)

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
            node._cursorPos = line > 0
                ? getFlatPos(lines, line - 1, col)
                : 0
        } else if (key.name === 'down') {
            node._cursorPos = line < lines.length - 1
                ? getFlatPos(lines, line + 1, col)
                : val.length
        } else if (key.name === 'home') {
            node._cursorPos = getFlatPos(lines, line, 0)
        } else if (key.name === 'end') {
            node._cursorPos = getFlatPos(lines, line, lines[line]?.length ?? 0)
        } else if (key.name === 'enter') {
            node._inputValue = val.slice(0, pos) + '\n' + val.slice(pos)
            node._cursorPos = pos + 1
        } else if (!key.ctrl && !key.meta && key.sequence && key.sequence.length === 1) {
            node._inputValue = val.slice(0, pos) + key.sequence + val.slice(pos)
            node._cursorPos = pos + 1
        }

        emitUpdate(node)
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
        const cursorPos = node._cursorPos ?? value.length
        const { line: cursorLine } = getCursorLineCol(value, cursorPos)

        // Adjust vertical scroll so the cursor stays visible
        let scrollY = node.scrollY
        if (cursorLine < scrollY) scrollY = cursorLine
        if (cursorLine >= scrollY + contentHeight) scrollY = cursorLine - contentHeight + 1
        node.scrollY = scrollY

        const lines = value.split('\n')
        for (let i = 0; i < contentHeight; i++) {
            const lineIndex = scrollY + i
            const line = lines[lineIndex] ?? ''
            buffer.write(contentX, contentY + i, line.slice(0, contentWidth).padEnd(contentWidth, ' '), cellStyle)
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
        const { line, col } = getCursorLineCol(value, cursorPos)

        const visibleLine = line - node.scrollY
        if (visibleLine < 0 || visibleLine >= contentHeight) return null

        // Horizontal scroll: keep cursor visible within the line
        const scrollX = Math.max(0, col - contentWidth + 1)
        return { x: contentX + (col - scrollX), y: contentY + visibleLine }
    },
}

registerElement('textarea', textareaBehavior)
