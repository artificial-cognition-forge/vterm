import type { ElementBehavior, ElementRenderContext } from './types'
import type { LayoutNode } from '../../core/layout/types'
import type { KeyEvent } from '../terminal/input'
import { registerElement } from './registry'
import {
    buildVisualLines, getVisualPos, getCursorLineCol, getFlatPos, findWordBoundary,
    getNodeValue, emitNodeUpdate, insertText, deleteSelection,
    getContentGeometry, getAdjustedContentGeometry,
} from './text-utils'

const getValue = getNodeValue
const emitUpdate = emitNodeUpdate

function ensureState(node: LayoutNode): void {
    if (node._inputValue === undefined) {
        node._inputValue = getValue(node)
        node._cursorPos = node._inputValue.length
        node._prevCursorPos = node._cursorPos
        node._selectionStart = node._cursorPos
        node._selectionEnd = node._cursorPos
    }
}

const textareaBehavior: ElementBehavior = {
    handleKey(node: LayoutNode, key: KeyEvent, requestRender: () => void): void {
        ensureState(node)

        const val = node._inputValue!
        const pos = node._cursorPos!
        let selStart = node._selectionStart ?? pos
        let selEnd = node._selectionEnd ?? pos

        // Handle Ctrl+A (select all)
        if (key.ctrl && key.name === 'a') {
            selStart = 0
            selEnd = val.length
            node._selectionStart = selStart
            node._selectionEnd = selEnd
            node._cursorPos = val.length
            requestRender()
            return
        }

        // Determine content width for visual wrapping
        const layout = node.layout
        const contentWidth = layout
            ? layout.width - 2 * layout.border.width - layout.padding.left - layout.padding.right
            : 0

        // Use visual lines if we have layout and width; otherwise fall back to hard lines
        const visualLines = contentWidth > 0 ? buildVisualLines(val, contentWidth) : null
        const navInfo = visualLines ? getVisualPos(visualLines, pos) : getCursorLineCol(val, pos)

        // Handle Ctrl+Shift+Left/Right for word selection
        if (key.ctrl && key.shift && (key.name === 'left' || key.name === 'right')) {
            // Anchor selection at current cursor if not already selecting
            if (selStart === pos && selEnd === pos) {
                selStart = pos
            }
            let newPos = pos
            if (key.name === 'left') {
                newPos = findWordBoundary(val, pos, 'left')
            } else if (key.name === 'right') {
                newPos = findWordBoundary(val, pos, 'right')
            }
            node._cursorPos = newPos
            // Extend selection from original anchor
            if (newPos < selStart) {
                node._selectionStart = newPos
                node._selectionEnd = selStart
            } else {
                node._selectionStart = selStart
                node._selectionEnd = newPos
            }
            requestRender()
            return
        }

        // Handle shift+arrow for selection
        const isShift = key.shift ?? false
        if (isShift && (key.name === 'left' || key.name === 'right' || key.name === 'home' || key.name === 'end' || key.name === 'up' || key.name === 'down')) {
            // Anchor selection at current cursor if not already selecting
            if (selStart === pos && selEnd === pos) {
                selStart = pos
            }
            // Move cursor and extend selection
            let newPos = pos
            if (key.name === 'left') {
                newPos = Math.max(0, pos - 1)
            } else if (key.name === 'right') {
                newPos = Math.min(val.length, pos + 1)
            } else if (key.name === 'home') {
                if (visualLines) {
                    const vLine = (navInfo as any).vLine
                    newPos = visualLines[vLine]!.startPos
                } else {
                    const lines = val.split('\n')
                    const line = (navInfo as any).line as number
                    newPos = getFlatPos(lines, line, 0)
                }
            } else if (key.name === 'end') {
                if (visualLines) {
                    const vLine = (navInfo as any).vLine
                    const vl = visualLines[vLine]!
                    newPos = vl.startPos + vl.text.length
                } else {
                    const lines = val.split('\n')
                    const line = (navInfo as any).line as number
                    newPos = getFlatPos(lines, line, lines[line]?.length ?? 0)
                }
            } else if (key.name === 'up') {
                if (visualLines) {
                    const vLine = (navInfo as any).vLine
                    const col = navInfo.col
                    if (vLine > 0) {
                        const prevLine = visualLines[vLine - 1]!
                        newPos = prevLine.startPos + Math.min(col, prevLine.text.length)
                    } else {
                        newPos = 0
                    }
                } else {
                    const lines = val.split('\n')
                    const line = (navInfo as any).line as number
                    const col = navInfo.col as number
                    newPos = line > 0 ? getFlatPos(lines, line - 1, col) : 0
                }
            } else if (key.name === 'down') {
                if (visualLines) {
                    const vLine = (navInfo as any).vLine
                    const col = navInfo.col
                    if (vLine < visualLines.length - 1) {
                        const nextLine = visualLines[vLine + 1]!
                        newPos = nextLine.startPos + Math.min(col, nextLine.text.length)
                    } else {
                        newPos = val.length
                    }
                } else {
                    const lines = val.split('\n')
                    const line = (navInfo as any).line as number
                    const col = navInfo.col as number
                    newPos = line < lines.length - 1
                        ? getFlatPos(lines, line + 1, col)
                        : val.length
                }
            }
            node._cursorPos = newPos
            // Extend selection from original anchor
            if (newPos < selStart) {
                node._selectionStart = newPos
                node._selectionEnd = selStart
            } else {
                node._selectionStart = selStart
                node._selectionEnd = newPos
            }
            requestRender()
            return
        }

        // Clear selection on any non-shift movement
        if (key.name === 'left' || key.name === 'right' || key.name === 'home' || key.name === 'end' || key.name === 'up' || key.name === 'down') {
            selStart = pos
            selEnd = pos
        }

        if (key.name === 'backspace') {
            const r = deleteSelection(val, pos, selStart, selEnd, false)
            node._inputValue = r.value
            node._cursorPos = r.cursor
            node._selectionStart = r.cursor
            node._selectionEnd = r.cursor
        } else if (key.name === 'delete') {
            const r = deleteSelection(val, pos, selStart, selEnd, true)
            node._inputValue = r.value
            node._cursorPos = r.cursor
            node._selectionStart = r.cursor
            node._selectionEnd = r.cursor
        } else if (key.ctrl && key.name === 'left') {
            node._cursorPos = findWordBoundary(val, pos, 'left')
            node._selectionStart = node._cursorPos
            node._selectionEnd = node._cursorPos
        } else if (key.ctrl && key.name === 'right') {
            node._cursorPos = findWordBoundary(val, pos, 'right')
            node._selectionStart = node._cursorPos
            node._selectionEnd = node._cursorPos
        } else if (key.name === 'left') {
            node._cursorPos = Math.max(0, pos - 1)
            node._selectionStart = node._cursorPos
            node._selectionEnd = node._cursorPos
        } else if (key.name === 'right') {
            node._cursorPos = Math.min(val.length, pos + 1)
            node._selectionStart = node._cursorPos
            node._selectionEnd = node._cursorPos
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
            node._selectionStart = node._cursorPos
            node._selectionEnd = node._cursorPos
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
            node._selectionStart = node._cursorPos
            node._selectionEnd = node._cursorPos
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
            node._selectionStart = node._cursorPos
            node._selectionEnd = node._cursorPos
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
            node._selectionStart = node._cursorPos
            node._selectionEnd = node._cursorPos
        } else if (key.name === 'enter' && key.shift) {
            // Shift+Enter inserts a newline (normal textarea behavior)
            const r = insertText(val, pos, '\n', selStart, selEnd)
            node._inputValue = r.value
            node._cursorPos = r.cursor
            node._selectionStart = r.cursor
            node._selectionEnd = r.cursor
        } else if (key.name === 'enter') {
            // Bare Enter is not consumed here - let useKeys handlers take priority
            // Applications can bind useKeys('enter', ...) to handle submission
            return
        } else if (!key.ctrl && !key.meta && key.sequence && key.sequence.length === 1) {
            const r = insertText(val, pos, key.sequence, selStart, selEnd)
            node._inputValue = r.value
            node._cursorPos = r.cursor
            node._selectionStart = r.cursor
            node._selectionEnd = r.cursor
        }

        // Only emit when value actually changed (guard against spurious updates)
        if (node._inputValue !== val) {
            emitUpdate(node)
        }
        requestRender()
    },

    render(node: LayoutNode, { buffer, cellStyle, adjustedY, selectionBg }: ElementRenderContext): void {
        const { contentX, contentY, contentWidth, contentHeight } = getAdjustedContentGeometry(node, adjustedY)

        if (contentWidth <= 0 || contentHeight <= 0) return

        const value = getValue(node)
        const cursorPos = node._cursorPos ?? value.length
        const selStart = node._selectionStart ?? cursorPos
        const selEnd = node._selectionEnd ?? cursorPos
        const selectionMinMax = [Math.min(selStart, selEnd), Math.max(selStart, selEnd)]

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

        // Render visual lines with selection highlighting
        for (let i = 0; i < contentHeight; i++) {
            const vl = visualLines[scrollY + i]
            const text = vl ? vl.text : ''
            const vLineStart = vl ? vl.startPos : -1

            for (let j = 0; j < contentWidth; j++) {
                const absPos = vLineStart + j
                const char = j < text.length ? text[j] : ' '

                if (j < text.length && absPos >= selectionMinMax[0] && absPos < selectionMinMax[1]) {
                    buffer.writeCell(contentX + j, contentY + i, {
                        char,
                        color: cellStyle.color ?? null,
                        background: selectionBg,
                        bold: cellStyle.bold ?? false,
                        underline: cellStyle.underline ?? false,
                        italic: cellStyle.italic ?? false,
                        inverse: false,
                        dim: false,
                    })
                } else {
                    const normalStyle = {
                        color: cellStyle.color ?? null,
                        background: cellStyle.background ?? null,
                        bold: cellStyle.bold ?? false,
                        underline: cellStyle.underline ?? false,
                        italic: cellStyle.italic ?? false,
                        inverse: false,
                        dim: cellStyle.dim ?? false,
                    }
                    buffer.writeCell(contentX + j, contentY + i, { char, ...normalStyle })
                }
            }
        }
    },

    getCursorPos(node: LayoutNode): { x: number; y: number } | null {
        if (!node.layout) return null
        const { contentX, contentY, contentWidth, contentHeight } = getContentGeometry(node)

        const value = getValue(node)
        const cursorPos = node._cursorPos ?? value.length
        const visualLines = buildVisualLines(value, contentWidth)
        const { vLine, col } = getVisualPos(visualLines, cursorPos)

        const visibleLine = vLine - node.scrollY
        if (visibleLine < 0 || visibleLine >= contentHeight) return null

        return { x: contentX + col, y: contentY + visibleLine }
    },
}

/**
 * Helper function to determine cursor position from click coordinates in textarea
 */
function getCursorPosFromClickTextarea(node: LayoutNode, clickX: number, clickY: number): number {
    const value = getValue(node)
    if (!node.layout) return value.length

    const { contentX, contentY, contentWidth, contentHeight } = getContentGeometry(node)
    if (contentWidth <= 0 || contentHeight <= 0) return value.length

    // Build visual lines
    const visualLines = buildVisualLines(value, contentWidth)

    // Calculate scroll offset
    const cursorPos = node._cursorPos ?? value.length
    const { vLine: cursorVLine } = getVisualPos(visualLines, cursorPos)
    let scrollY = node.scrollY ?? 0

    // Determine which visual line was clicked
    const relativeY = clickY - contentY
    if (relativeY < 0) return 0
    if (relativeY >= contentHeight) return value.length

    const clickedVLine = scrollY + Math.floor(relativeY)
    if (clickedVLine >= visualLines.length) return value.length

    const vl = visualLines[clickedVLine]
    if (!vl) return value.length

    // Determine which character in that line was clicked
    const relativeX = clickX - contentX
    if (relativeX < 0) return vl.startPos
    if (relativeX >= vl.text.length) return vl.startPos + vl.text.length

    return vl.startPos + Math.floor(relativeX)
}

// Add mousedown handler
textareaBehavior.handleMouseDown = (node: LayoutNode, event: any, requestRender: () => void): void => {
    ensureState(node)
    const newPos = getCursorPosFromClickTextarea(node, event.x, event.y)
    node._cursorPos = newPos
    node._selectionStart = newPos
    node._selectionEnd = newPos
    requestRender()
}

registerElement('textarea', textareaBehavior)
