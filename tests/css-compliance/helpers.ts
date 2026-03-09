/**
 * Shared test helpers for CSS compliance tests.
 *
 * The main entry point is `renderCSS()` which runs the full pipeline:
 *   CSS string → transformCSSToLayout → layout engine → buffer renderer → ScreenBuffer
 *
 * Use `buf.getCell(x, y)` to assert exact cell values.
 * Use `buf.getLine(y)` to assert text placement.
 * Use `rowSlice(buf, y, x, len)` to extract a substring of a row.
 */

import { h } from 'vue'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'
import { ScreenBuffer } from '../../src/runtime/terminal/buffer'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import type { Cell } from '../../src/runtime/terminal/buffer'

export type { Cell }
export { h }

/**
 * Runs the full CSS → render pipeline and returns the ScreenBuffer.
 *
 * @param css   CSS string (supports postcss-nested syntax)
 * @param vnode Vue VNode tree to render
 * @param width Terminal width in cells (default 80)
 * @param height Terminal height in cells (default 24)
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

/**
 * Extracts a substring from a row in the buffer.
 */
export function rowSlice(buffer: ScreenBuffer, y: number, x: number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += buffer.getCell(x + i, y)?.char ?? ' '
  }
  return s
}

/**
 * Returns the fg color of a cell.
 */
export function cellColor(buffer: ScreenBuffer, x: number, y: number): string | null {
  return buffer.getCell(x, y)?.color ?? null
}

/**
 * Returns the background color of a cell.
 */
export function cellBg(buffer: ScreenBuffer, x: number, y: number): string | null {
  return buffer.getCell(x, y)?.background ?? null
}

/**
 * Asserts that all cells in a rectangular region have the given background color.
 */
export function expectRegionBg(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  bg: string
): void {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      const cell = buffer.getCell(col, row)
      if (!cell || cell.background !== bg) {
        throw new Error(
          `Expected bg="${bg}" at (${col},${row}) but got "${cell?.background ?? 'null'}"`
        )
      }
    }
  }
}
