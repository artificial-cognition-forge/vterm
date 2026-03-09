import type { LayoutNode } from '../../core/layout/types'
import type { ScreenBuffer, Cell } from '../terminal/buffer'
import type { KeyEvent } from '../terminal/input'

/** Axis-aligned rectangle used to clip rendering to a parent's visible area */
export interface ClipBox {
    x: number
    y: number
    width: number
    height: number
}

/**
 * Context passed to an element's render method.
 */
export interface ElementRenderContext {
    buffer: ScreenBuffer
    cellStyle: Partial<Omit<Cell, 'char'>>
    /** Y position of the node adjusted for parent scroll offset */
    adjustedY: number
    /** Parent clip boundary — element renderers must not draw outside this box */
    clipBox?: ClipBox
}

/**
 * Defines the interactive behaviour of an HTML element type.
 *
 * Register behaviours via registerElement() in registry.ts.
 * The buffer-renderer and vterm runtime look up behaviours by element type
 * instead of carrying inline if/else chains for every interactive element.
 */
export interface ElementBehavior {
    /**
     * Handle a keypress when this element is focused.
     * Call requestRender() after mutating node state to schedule a re-layout.
     */
    handleKey?(node: LayoutNode, key: KeyEvent, requestRender: () => void): void

    /**
     * Render the element's content into the buffer.
     * Called by the buffer-renderer instead of the generic box/text path.
     */
    render?(node: LayoutNode, ctx: ElementRenderContext): void

    /**
     * Return the terminal cursor position for a focused element, or null to hide the cursor.
     */
    getCursorPos?(node: LayoutNode): { x: number; y: number } | null

    /**
     * When true, the buffer-renderer will not recurse into this node's children.
     * Use this when the render() method handles all content itself.
     */
    skipChildren?: boolean
}
