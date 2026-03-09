/**
 * Shared test helpers for render-correctness tests.
 *
 * Two entry points:
 *
 * 1. `renderCSS(css, vnode, w, h)` — full pipeline in one call, returns ScreenBuffer.
 *    Use for tests that don't need to inspect or mutate the layout tree.
 *
 * 2. `buildAndLayout(css, vnode, w, h)` → `{ root, width, height }` — stops before rendering.
 *    Mutate the tree (e.g. set `node.scrollY`) then call `renderTree(root, w, h)`.
 *
 * Cell inspection helpers:
 *   rowSlice(buf, y, x, len)  — extract substring of a row
 *   cellColor(buf, x, y)      — foreground color at a cell
 *   cellBg(buf, x, y)         — background color at a cell
 *   expectRegionBg(...)        — assert a rectangular region has a given bg
 *   expectRegionEmpty(...)     — assert a region has no bg and space chars
 *
 * Tree helpers:
 *   findNode(root, pred)      — depth-first node search
 *   findNodeByClass(root, cls) — find by CSS class name
 */

import { h } from 'vue'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'
import { ScreenBuffer } from '../../src/runtime/terminal/buffer'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import { InteractionManager } from '../../src/runtime/renderer/interaction'
import type { LayoutNode } from '../../src/core/layout/types'
import type { Cell } from '../../src/runtime/terminal/buffer'

export type { Cell, LayoutNode }
export { h, InteractionManager }

// ─── Pipeline helpers ─────────────────────────────────────────────────────────

/**
 * Full pipeline: CSS string + VNode → ScreenBuffer.
 */
export async function renderCSS(
  css: string,
  vnode: ReturnType<typeof h>,
  width = 80,
  height = 24
): Promise<ScreenBuffer> {
  const { root } = await buildAndLayout(css, vnode, width, height)
  return renderTree(root, width, height)
}

/**
 * Build and compute layout, stopping before rendering.
 * Returns the root LayoutNode and dimensions so callers can mutate state (e.g. scrollY)
 * then call renderTree().
 */
export async function buildAndLayout(
  css: string,
  vnode: ReturnType<typeof h>,
  width = 80,
  height = 24
): Promise<{ root: LayoutNode; width: number; height: number }> {
  const parsed = await transformCSSToLayout(css)
  const styles = new Map(Object.entries(parsed))
  const engine = createLayoutEngine(width, height)
  const root = engine.buildLayoutTree(vnode, styles)
  engine.computeLayout(root)
  return { root, width, height }
}

/**
 * Render a pre-built layout tree to a ScreenBuffer.
 * Optionally pass an InteractionManager for hover/focus/active state.
 */
export function renderTree(
  root: LayoutNode,
  width = 80,
  height = 24,
  interactionManager?: InteractionManager
): ScreenBuffer {
  const buffer = new ScreenBuffer(width, height)
  const renderer = new BufferRenderer(interactionManager)
  renderer.render(root, buffer)
  return buffer
}

/**
 * Set the hovered node in an InteractionManager by firing a synthetic mousemove
 * at the node's layout position. The InteractionManager uses hit testing, so
 * the node must have computed layout and be at the top of the hit-test stack
 * (i.e. no children covering the test position).
 */
export function setHovered(
  manager: InteractionManager,
  root: LayoutNode,
  node: LayoutNode
): void {
  if (!node.layout) return
  manager.handleMouseEvent(
    {
      type: 'mousemove',
      button: 'none',
      x: node.layout.x,
      y: node.layout.y,
      ctrl: false,
      shift: false,
      meta: false,
    },
    root
  )
}

/**
 * Set focus to a specific node.
 */
export function setFocused(manager: InteractionManager, node: LayoutNode): void {
  manager.setFocus(node)
}

/**
 * Set a node as active (pressed) via a synthetic mousedown at its position.
 */
export function setActive(
  manager: InteractionManager,
  root: LayoutNode,
  node: LayoutNode
): void {
  if (!node.layout) return
  manager.handleMouseEvent(
    {
      type: 'mousedown',
      button: 'left',
      x: node.layout.x,
      y: node.layout.y,
      ctrl: false,
      shift: false,
      meta: false,
    },
    root
  )
}

// ─── Cell inspection helpers ──────────────────────────────────────────────────

/**
 * Extracts a substring from a buffer row.
 */
export function rowSlice(buffer: ScreenBuffer, y: number, x: number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += buffer.getCell(x + i, y)?.char ?? ' '
  }
  return s
}

/**
 * Returns the fg color of a cell (null if unset).
 */
export function cellColor(buffer: ScreenBuffer, x: number, y: number): string | null {
  return buffer.getCell(x, y)?.color ?? null
}

/**
 * Returns the background color of a cell (null if unset).
 */
export function cellBg(buffer: ScreenBuffer, x: number, y: number): string | null {
  return buffer.getCell(x, y)?.background ?? null
}

/**
 * Asserts that every cell in a rectangle has the given background color.
 */
export function expectRegionBg(
  buffer: ScreenBuffer,
  x: number, y: number,
  width: number, height: number,
  bg: string
): void {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      const cell = buffer.getCell(col, row)
      if (!cell || cell.background !== bg) {
        throw new Error(
          `Expected background="${bg}" at (${col},${row}) but got "${cell?.background ?? 'null'}"`
        )
      }
    }
  }
}

/**
 * Asserts that every cell in a rectangle has no background and is a space character.
 */
export function expectRegionEmpty(
  buffer: ScreenBuffer,
  x: number, y: number,
  width: number, height: number
): void {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      const cell = buffer.getCell(col, row)
      if (cell && (cell.background !== null || cell.char !== ' ')) {
        throw new Error(
          `Expected empty cell at (${col},${row}) but got char="${cell.char}" bg="${cell.background}"`
        )
      }
    }
  }
}

/**
 * Asserts that every cell in a rectangle has the given foreground color.
 */
export function expectRegionColor(
  buffer: ScreenBuffer,
  x: number, y: number,
  width: number, height: number,
  color: string
): void {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      const cell = buffer.getCell(col, row)
      if (!cell || cell.color !== color) {
        throw new Error(
          `Expected color="${color}" at (${col},${row}) but got "${cell?.color ?? 'null'}"`
        )
      }
    }
  }
}

// ─── Tree traversal helpers ───────────────────────────────────────────────────

/**
 * Depth-first node search.
 */
export function findNode(
  root: LayoutNode,
  predicate: (n: LayoutNode) => boolean
): LayoutNode | null {
  if (predicate(root)) return root
  for (const child of root.children) {
    const found = findNode(child, predicate)
    if (found) return found
  }
  return null
}

/**
 * Find a node whose `props.class` includes the given CSS class name.
 */
export function findNodeByClass(root: LayoutNode, className: string): LayoutNode | null {
  return findNode(root, n => {
    const cls: string = n.props?.class ?? ''
    return cls === className || cls.split(' ').includes(className)
  })
}
