import type { ElementBehavior, ElementRenderContext } from './types'
import type { LayoutNode } from '../../core/layout/types'
import type { KeyEvent } from '../terminal/input'
import { registerElement } from './registry'
import { findWordBoundary, getNodeValue, emitNodeUpdate, insertText, deleteSelection, getContentGeometry, getAdjustedContentGeometry } from './text-utils'

const getValue = getNodeValue
const emitUpdate = emitNodeUpdate

function ensureState(node: LayoutNode): void {
    if (node._inputValue === undefined) {
        node._inputValue = getValue(node)
        node._cursorPos = node._inputValue.length
        node._selectionStart = node._cursorPos
        node._selectionEnd = node._cursorPos
    }
}

const inputBehavior: ElementBehavior = {
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
        if (isShift && (key.name === 'left' || key.name === 'right' || key.name === 'home' || key.name === 'end')) {
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
                newPos = 0
            } else if (key.name === 'end') {
                newPos = val.length
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
        if (key.name === 'left' || key.name === 'right' || key.name === 'home' || key.name === 'end') {
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
            // Ctrl+Left: move to start of previous word
            node._cursorPos = findWordBoundary(val, pos, 'left')
            node._selectionStart = node._cursorPos
            node._selectionEnd = node._cursorPos
        } else if (key.ctrl && key.name === 'right') {
            // Ctrl+Right: move to start of next word
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
        } else if (key.name === 'home') {
            node._cursorPos = 0
            node._selectionStart = 0
            node._selectionEnd = 0
        } else if (key.name === 'end') {
            node._cursorPos = val.length
            node._selectionStart = val.length
            node._selectionEnd = val.length
        } else if (key.name === 'enter') {
            const changeHandler = node.events.get('change')
            if (changeHandler) changeHandler(node._inputValue!)
        } else if (!key.ctrl && !key.meta && key.sequence && key.sequence.length === 1) {
            const r = insertText(val, pos, key.sequence, selStart, selEnd)
            node._inputValue = r.value
            node._cursorPos = r.cursor
            node._selectionStart = r.cursor
            node._selectionEnd = r.cursor
        }

        // Only emit the reactive update when the value actually changed.
        if (node._inputValue !== val) {
            emitUpdate(node)
        }
        requestRender()
    },

    render(node: LayoutNode, { buffer, cellStyle, adjustedY, selectionBg }: ElementRenderContext): void {
        const layout = node.layout!
        const { contentX, contentWidth } = getAdjustedContentGeometry(node, adjustedY)
        const contentY = adjustedY + layout.border.width + layout.padding.top

        if (contentWidth <= 0) return

        const value = getValue(node)

        // Render placeholder when empty
        const placeholder = node.props.placeholder as string | undefined
        if (value.length === 0 && placeholder) {
            const placeholderStyle = { ...cellStyle, dim: true }
            const visible = placeholder.slice(0, contentWidth)
            buffer.write(contentX, contentY, visible.padEnd(contentWidth, ' '), placeholderStyle)
            return
        }

        const cursorPos = node._cursorPos ?? 0
        const selStart = node._selectionStart ?? cursorPos
        const selEnd = node._selectionEnd ?? cursorPos

        // Scroll viewport so cursor is always visible
        const scrollOffset = node._cursorPos !== undefined
            ? Math.max(0, cursorPos - contentWidth + 1)
            : 0
        const visible = value.slice(scrollOffset, scrollOffset + contentWidth)

        // Render text with selection highlighting
        const selectionMinMax = [Math.min(selStart, selEnd), Math.max(selStart, selEnd)]
        const paddedVisible = visible.padEnd(contentWidth, ' ')

        for (let i = 0; i < contentWidth; i++) {
            const absPos = scrollOffset + i
            const char = paddedVisible[i] ?? ' '

            if (absPos >= selectionMinMax[0] && absPos < selectionMinMax[1]) {
                buffer.writeCell(contentX + i, contentY, {
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
                buffer.writeCell(contentX + i, contentY, {
                    char,
                    color: cellStyle.color ?? null,
                    background: cellStyle.background ?? null,
                    bold: cellStyle.bold ?? false,
                    underline: cellStyle.underline ?? false,
                    italic: cellStyle.italic ?? false,
                    inverse: false,
                    dim: cellStyle.dim ?? false,
                })
            }
        }
    },

    getCursorPos(node: LayoutNode): { x: number; y: number } | null {
        if (!node.layout) return null
        const { contentX, contentY, contentWidth } = getContentGeometry(node)
        const value = getValue(node)
        const cursorPos = node._cursorPos ?? value.length
        const scrollOffset = Math.max(0, cursorPos - contentWidth + 1)
        return { x: contentX + (cursorPos - scrollOffset), y: contentY }
    },
}

/**
 * Helper function to determine cursor position from click coordinates
 */
function getCursorPosFromClick(node: LayoutNode, clickX: number): number {
    const value = getValue(node)
    if (!node.layout) return value.length

    const { contentX, contentWidth } = getContentGeometry(node)
    if (contentWidth <= 0) return value.length

    const cursorPos = node._cursorPos ?? value.length
    const scrollOffset = Math.max(0, cursorPos - contentWidth + 1)

    // Calculate which character was clicked
    const relativeX = clickX - contentX
    if (relativeX < 0) return scrollOffset
    if (relativeX >= contentWidth) return Math.min(scrollOffset + contentWidth, value.length)

    return Math.min(scrollOffset + relativeX, value.length)
}

// Add mousedown handler
inputBehavior.handleMouseDown = (node: LayoutNode, event: any, requestRender: () => void): void => {
    ensureState(node)
    const newPos = getCursorPosFromClick(node, event.x)
    node._cursorPos = newPos
    node._selectionStart = newPos
    node._selectionEnd = newPos
    requestRender()
}

registerElement('input', inputBehavior)
