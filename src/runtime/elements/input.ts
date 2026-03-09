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

const inputBehavior: ElementBehavior = {
    handleKey(node: LayoutNode, key: KeyEvent, requestRender: () => void): void {
        ensureState(node)

        const val = node._inputValue!
        const pos = node._cursorPos!

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
        } else if (key.name === 'home') {
            node._cursorPos = 0
        } else if (key.name === 'end') {
            node._cursorPos = val.length
        } else if (key.name === 'enter') {
            const changeHandler = node.events.get('change')
            if (changeHandler) changeHandler(node._inputValue!)
        } else if (!key.ctrl && !key.meta && key.sequence && key.sequence.length === 1) {
            node._inputValue = val.slice(0, pos) + key.sequence + val.slice(pos)
            node._cursorPos = pos + 1
        }

        // Only emit the reactive update when the value actually changed.
        // Emitting unconditionally would overwrite any programmatic reset that a
        // useKeys handler (which fires before handleKey) already applied to the ref.
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

        const cursorPos = node._cursorPos ?? value.length

        // Scroll viewport so cursor is always visible
        const scrollOffset = Math.max(0, cursorPos - contentWidth + 1)
        const visible = value.slice(scrollOffset, scrollOffset + contentWidth)
        buffer.write(contentX, contentY, visible.padEnd(contentWidth, ' '), cellStyle)
    },

    getCursorPos(node: LayoutNode): { x: number; y: number } | null {
        if (!node.layout) return null
        const { layout } = node
        const border = layout.border.width
        const padding = layout.padding
        const contentX = layout.x + border + padding.left
        const contentY = layout.y + border + padding.top
        const contentWidth = layout.width - 2 * border - padding.left - padding.right
        const value = getValue(node)
        const cursorPos = node._cursorPos ?? value.length
        const scrollOffset = Math.max(0, cursorPos - contentWidth + 1)
        return { x: contentX + (cursorPos - scrollOffset), y: contentY }
    },
}

registerElement('input', inputBehavior)
