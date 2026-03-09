/**
 * Shared helpers for HTML compliance tests.
 *
 * Two testing modes:
 *
 * 1. RENDER mode — use `renderCSS()` to run the full pipeline and assert
 *    `buffer.getCell(x, y)` values. Best for visual output assertions.
 *
 * 2. BEHAVIOR mode — use `makeNode()` + `getElement()` to directly drive
 *    element key-handling and render logic. Best for interactive element logic.
 */

import { h } from 'vue'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'
import { ScreenBuffer } from '../../src/runtime/terminal/buffer'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import type { Cell } from '../../src/runtime/terminal/buffer'
import type { LayoutNode } from '../../src/core/layout/types'
import type { KeyEvent } from '../../src/runtime/terminal/input'

export type { Cell, LayoutNode, KeyEvent }
export { h }

// ─── Render pipeline helpers ──────────────────────────────────────────────────

/**
 * Runs the full CSS → render pipeline and returns the ScreenBuffer.
 */
export async function renderCSS(
    css: string,
    vnode: ReturnType<typeof h>,
    width = 80,
    height = 24
): Promise<ScreenBuffer> {
    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(width, height)
    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)
    const buffer = new ScreenBuffer(width, height)
    const renderer = new BufferRenderer()
    renderer.render(tree, buffer)
    return buffer
}

export function rowSlice(buffer: ScreenBuffer, y: number, x: number, len: number): string {
    let s = ''
    for (let i = 0; i < len; i++) {
        s += buffer.getCell(x + i, y)?.char ?? ' '
    }
    return s
}

export function cellColor(buffer: ScreenBuffer, x: number, y: number): string | null {
    return buffer.getCell(x, y)?.color ?? null
}

export function cellBg(buffer: ScreenBuffer, x: number, y: number): string | null {
    return buffer.getCell(x, y)?.background ?? null
}

export function cellBold(buffer: ScreenBuffer, x: number, y: number): boolean {
    return buffer.getCell(x, y)?.bold ?? false
}

export function cellItalic(buffer: ScreenBuffer, x: number, y: number): boolean {
    return buffer.getCell(x, y)?.italic ?? false
}

export function cellUnderline(buffer: ScreenBuffer, x: number, y: number): boolean {
    return buffer.getCell(x, y)?.underline ?? false
}

// ─── Behavior helpers ─────────────────────────────────────────────────────────

/**
 * Creates a minimal LayoutNode for element behavior testing.
 */
export function makeNode(
    type: string,
    value = '',
    overrides: Partial<LayoutNode> = {}
): LayoutNode {
    const node: LayoutNode = {
        id: `test-${type}`,
        type,
        layoutProps: {},
        props: value ? { modelValue: value } : {},
        content: null,
        style: {},
        events: new Map(),
        children: [],
        parent: null,
        layout: {
            x: 0,
            y: 0,
            width: 20,
            height: 5,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            border: { width: 1, type: 'line' },
        },
        scrollX: 0,
        scrollY: 0,
        ...overrides,
    }
    return node
}

export function key(name: string, extra: Partial<KeyEvent> = {}): KeyEvent {
    return { name, sequence: '', ctrl: false, shift: false, meta: false, ...extra }
}

export function printable(char: string): KeyEvent {
    return { name: char, sequence: char, ctrl: false, shift: false, meta: false }
}

export const noop = () => {}
