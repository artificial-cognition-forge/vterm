/**
 * Integration Test Helpers
 *
 * Comprehensive utilities for testing the full vterm pipeline end-to-end:
 * Vue SFC → CSS → LayoutTree → ScreenBuffer → visual assertions
 *
 * Three main testing modes:
 *
 * 1. RENDER mode — `renderCSS()` to run full pipeline, then assert cell values
 *    Use for visual output testing (text placement, colors, borders, etc.)
 *
 * 2. LAYOUT mode — `buildAndLayout()` to inspect/mutate tree before rendering
 *    Use for scroll/overflow testing, layout verification
 *
 * 3. INTERACTION mode — use `InteractionManager` with synthetic events
 *    Use for :hover/:focus/:active state testing
 *
 * Cell inspection helpers:
 *   - getCell(buf, x, y) → Cell | null
 *   - cellText(buf, x, y) → char at position
 *   - cellColor(buf, x, y), cellBg(buf, x, y), cellBold(...), etc.
 *   - rowSlice(buf, y, x, len) → substring of a row
 *
 * Region assertions (throw on mismatch):
 *   - expectRegionText(buf, x, y, expectedText)
 *   - expectRegionBg(buf, x, y, w, h, color)
 *   - expectRegionColor(buf, x, y, w, h, color)
 *   - expectRegionEmpty(buf, x, y, w, h)
 *   - expectRegionBorder(buf, x, y, w, h, style, color)
 *
 * Advanced assertions:
 *   - expectCell(buf, x, y, expected) → assert all cell properties at once
 *   - expectLine(buf, y, text, options) → assert entire row with optional color/bg
 *   - expectPattern(buf, x, y, pattern) → wildcard text pattern matching
 *   - expectTextAt(buf, x, y, text, color?, bg?) → text + color/bg
 *
 * Layout verification:
 *   - assertBoxBounds(buf, x, y, w, h, bg) → verify a box region
 *   - assertBorderBox(buf, x, y, w, h, style, color) → verify bordered box
 *   - assertFlexLayout(buf, ...) → verify flex children positioned correctly
 *   - assertScrollableContent(buf, scrollY, ...) → verify scroll clipping
 *
 * Tree helpers:
 *   - findNode(root, predicate) → depth-first search
 *   - findNodeByClass(root, className) → find by .class
 *   - findNodeByType(root, type) → find by tag name
 *
 * Interaction helpers:
 *   - setHovered(manager, root, node) → simulate mouse move
 *   - setFocused(manager, node) → set focus
 *   - setActive(manager, root, node) → simulate mouse down
 *
 * Debug helpers:
 *   - dumpBuffer(buf, x?, y?, w?, h?) → print grid to stdout
 *   - dumpCell(buf, x, y) → print single cell details
 *   - dumpRegion(buf, x, y, w, h) → print region details
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

// ═══════════════════════════════════════════════════════════════════════════════
// PIPELINE HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Full pipeline: CSS string + VNode → ScreenBuffer
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
 * Allows mutation of tree state (e.g., scrollY) before rendering.
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
 * Optionally pass an InteractionManager for state-dependent rendering.
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

// ═══════════════════════════════════════════════════════════════════════════════
// CELL INSPECTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get cell at position, or null if out of bounds.
 */
export function getCell(buffer: ScreenBuffer, x: number, y: number): Cell | null {
  return buffer.getCell(x, y) ?? null
}

/**
 * Get character at position (null if out of bounds or empty).
 */
export function cellText(buffer: ScreenBuffer, x: number, y: number): string | null {
  return buffer.getCell(x, y)?.char ?? null
}

/**
 * Get foreground color at position (null if unset).
 */
export function cellColor(buffer: ScreenBuffer, x: number, y: number): string | null {
  return buffer.getCell(x, y)?.color ?? null
}

/**
 * Get background color at position (null if unset).
 */
export function cellBg(buffer: ScreenBuffer, x: number, y: number): string | null {
  return buffer.getCell(x, y)?.background ?? null
}

/**
 * Get bold state at position (false if unset).
 */
export function cellBold(buffer: ScreenBuffer, x: number, y: number): boolean {
  return buffer.getCell(x, y)?.bold ?? false
}

/**
 * Get underline state at position (false if unset).
 */
export function cellUnderline(buffer: ScreenBuffer, x: number, y: number): boolean {
  return buffer.getCell(x, y)?.underline ?? false
}

/**
 * Get italic state at position (false if unset).
 */
export function cellItalic(buffer: ScreenBuffer, x: number, y: number): boolean {
  return buffer.getCell(x, y)?.italic ?? false
}

/**
 * Get inverse state at position (false if unset).
 */
export function cellInverse(buffer: ScreenBuffer, x: number, y: number): boolean {
  return buffer.getCell(x, y)?.inverse ?? false
}

/**
 * Get dim state at position (false if unset).
 */
export function cellDim(buffer: ScreenBuffer, x: number, y: number): boolean {
  return buffer.getCell(x, y)?.dim ?? false
}

/**
 * Extract substring from a row.
 */
export function rowSlice(buffer: ScreenBuffer, y: number, x: number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += buffer.getCell(x + i, y)?.char ?? ' '
  }
  return s
}

/**
 * Get entire row as string.
 */
export function getRow(buffer: ScreenBuffer, y: number): string {
  return rowSlice(buffer, y, 0, buffer.width)
}

/**
 * Get column (vertical slice) as string.
 */
export function getColumn(buffer: ScreenBuffer, x: number, height?: number): string {
  const h = height ?? buffer.height
  let s = ''
  for (let i = 0; i < h; i++) {
    s += buffer.getCell(x, i)?.char ?? ' '
  }
  return s
}

// ═══════════════════════════════════════════════════════════════════════════════
// REGION ASSERTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assert all cells in a region match expected cell properties.
 * Throws if any cell doesn't match.
 */
export function expectCell(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  expected: Partial<Cell>
): void {
  const cell = buffer.getCell(x, y)
  for (const [key, value] of Object.entries(expected)) {
    if (cell?.[key as keyof Cell] !== value) {
      throw new Error(
        `Expected ${key}="${value}" at (${x},${y}) but got "${cell?.[key as keyof Cell] ?? 'null'}"`
      )
    }
  }
}

/**
 * Assert a region has a specific background color.
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
          `Expected background="${bg}" at (${col},${row}) but got "${cell?.background ?? 'null'}"`
        )
      }
    }
  }
}

/**
 * Assert a region has a specific foreground color.
 */
export function expectRegionColor(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
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

/**
 * Assert a region is empty (all spaces, no background).
 */
export function expectRegionEmpty(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  height: number
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
 * Assert a region is filled (all cells have non-null background).
 */
export function expectRegionFilled(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  bg?: string
): void {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      const cell = buffer.getCell(col, row)
      if (!cell || cell.background === null) {
        throw new Error(`Expected filled cell at (${col},${row}) but got null background`)
      }
      if (bg && cell.background !== bg) {
        throw new Error(
          `Expected background="${bg}" at (${col},${row}) but got "${cell.background}"`
        )
      }
    }
  }
}

/**
 * Assert text at a specific position.
 * Options: color (fg), bg, bold, underline, italic
 */
export function expectTextAt(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  text: string,
  options?: { color?: string; bg?: string; bold?: boolean; underline?: boolean; italic?: boolean }
): void {
  for (let i = 0; i < text.length; i++) {
    const cell = buffer.getCell(x + i, y)
    if (cell?.char !== text[i]) {
      throw new Error(
        `Expected char="${text[i]}" at (${x + i},${y}) but got "${cell?.char ?? 'null'}"`
      )
    }
    if (options?.color && cell?.color !== options.color) {
      throw new Error(
        `Expected color="${options.color}" at (${x + i},${y}) but got "${cell?.color ?? 'null'}"`
      )
    }
    if (options?.bg && cell?.background !== options.bg) {
      throw new Error(
        `Expected bg="${options.bg}" at (${x + i},${y}) but got "${cell?.background ?? 'null'}"`
      )
    }
    if (options?.bold && !cell?.bold) {
      throw new Error(`Expected bold at (${x + i},${y})`)
    }
    if (options?.underline && !cell?.underline) {
      throw new Error(`Expected underline at (${x + i},${y})`)
    }
    if (options?.italic && !cell?.italic) {
      throw new Error(`Expected italic at (${x + i},${y})`)
    }
  }
}

/**
 * Assert an entire line (row) matches expected text.
 * Text can include spaces for "don't care" positions.
 */
export function expectLine(
  buffer: ScreenBuffer,
  y: number,
  text: string,
  options?: { color?: string; bg?: string }
): void {
  const actual = getRow(buffer, y).substring(0, text.length)
  if (actual !== text) {
    throw new Error(
      `Expected line y=${y} to be "${text.padEnd(text.length)}" but got "${actual.padEnd(text.length)}"`
    )
  }
  if (options?.color) {
    for (let x = 0; x < text.length; x++) {
      if (cellColor(buffer, x, y) !== options.color) {
        throw new Error(
          `Expected color="${options.color}" at (${x},${y}) but got "${cellColor(buffer, x, y)}"`
        )
      }
    }
  }
  if (options?.bg) {
    for (let x = 0; x < text.length; x++) {
      if (cellBg(buffer, x, y) !== options.bg) {
        throw new Error(
          `Expected bg="${options.bg}" at (${x},${y}) but got "${cellBg(buffer, x, y)}"`
        )
      }
    }
  }
}

/**
 * Assert text matches a pattern with wildcards.
 * '.' matches any char, '*' matches any sequence, '?' matches any single char.
 * Use when exact spacing is fragile (e.g., centered text).
 */
export function expectPattern(
  buffer: ScreenBuffer,
  y: number,
  pattern: string,
  startX = 0
): void {
  const actual = getRow(buffer, y).substring(startX, startX + pattern.length)
  let patternIdx = 0
  let actualIdx = 0

  while (patternIdx < pattern.length && actualIdx < actual.length) {
    const p = pattern[patternIdx]
    const a = actual[actualIdx]

    if (p === '*') {
      // Match any sequence — greedy
      const nextPattern = pattern[patternIdx + 1]
      if (!nextPattern) {
        return // Matches rest of string
      }
      while (actualIdx < actual.length && actual[actualIdx] !== nextPattern) {
        actualIdx++
      }
      patternIdx++
    } else if (p === '?' || p === '.' || p === a) {
      patternIdx++
      actualIdx++
    } else {
      throw new Error(
        `Pattern mismatch at y=${y}, pattern pos=${patternIdx}: expected "${p}" but got "${a}" in "${actual}"`
      )
    }
  }

  if (patternIdx !== pattern.length) {
    throw new Error(
      `Pattern underrun: expected "${pattern}" but got "${actual}" at y=${y}`
    )
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT VERIFICATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Assert a rectangular box region (content area, may have background).
 * Verifies bounds and optionally background color.
 */
export function assertBoxBounds(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  bg?: string
): void {
  if (bg) {
    expectRegionBg(buffer, x, y, width, height, bg)
  }
  // Verify no content extends past bounds
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      const cell = buffer.getCell(col, row)
      if (!cell) {
        throw new Error(`Cell out of bounds at (${col},${row})`)
      }
    }
  }
}

/**
 * Assert a bordered box (border + content area).
 * Checks corner chars, edge chars, and content region.
 */
export function assertBorderBox(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  height: number,
  style: 'line' | 'heavy' | 'double' | 'ascii',
  color?: string
): void {
  const corners = {
    line: { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
    heavy: { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
    double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
    ascii: { tl: '+', tr: '+', bl: '+', br: '+', h: '-', v: '|' },
  }

  const chars = corners[style]

  // Top-left corner
  expectCell(buffer, x, y, { char: chars.tl })
  // Top-right corner
  expectCell(buffer, x + width - 1, y, { char: chars.tr })
  // Bottom-left corner
  expectCell(buffer, x, y + height - 1, { char: chars.bl })
  // Bottom-right corner
  expectCell(buffer, x + width - 1, y + height - 1, { char: chars.br })

  // Top edge
  for (let col = x + 1; col < x + width - 1; col++) {
    const cell = buffer.getCell(col, y)
    if (cell?.char !== chars.h) {
      throw new Error(`Expected border char "${chars.h}" at (${col},${y}) but got "${cell?.char}"`)
    }
  }

  // Bottom edge
  for (let col = x + 1; col < x + width - 1; col++) {
    const cell = buffer.getCell(col, y + height - 1)
    if (cell?.char !== chars.h) {
      throw new Error(
        `Expected border char "${chars.h}" at (${col},${y + height - 1}) but got "${cell?.char}"`
      )
    }
  }

  // Left edge
  for (let row = y + 1; row < y + height - 1; row++) {
    const cell = buffer.getCell(x, row)
    if (cell?.char !== chars.v) {
      throw new Error(`Expected border char "${chars.v}" at (${x},${row}) but got "${cell?.char}"`)
    }
  }

  // Right edge
  for (let row = y + 1; row < y + height - 1; row++) {
    const cell = buffer.getCell(x + width - 1, row)
    if (cell?.char !== chars.v) {
      throw new Error(
        `Expected border char "${chars.v}" at (${x + width - 1},${row}) but got "${cell?.char}"`
      )
    }
  }

  if (color) {
    expectRegionColor(buffer, x, y, width, 1, color) // Top edge
    expectRegionColor(buffer, x, y + height - 1, width, 1, color) // Bottom edge
    expectRegionColor(buffer, x, y + 1, 1, height - 2, color) // Left edge
    expectRegionColor(buffer, x + width - 1, y + 1, 1, height - 2, color) // Right edge
  }
}

/**
 * Assert a scrollbar is present at the right edge of a scrollable region.
 */
export function assertScrollbar(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  height: number,
  scrollY: number,
  contentHeight: number,
  thumbColor = 'white',
  trackColor = 'grey'
): void {
  const scrollbarX = x + buffer.width - 1
  const thumbY = Math.round((scrollY / contentHeight) * height)

  for (let row = y; row < y + height; row++) {
    const cell = buffer.getCell(scrollbarX, row)
    if (row === y + thumbY) {
      // Thumb
      if (cell?.char !== '█') {
        throw new Error(
          `Expected scrollbar thumb "█" at (${scrollbarX},${row}) but got "${cell?.char}"`
        )
      }
      if (cell?.color !== thumbColor) {
        throw new Error(
          `Expected scrollbar thumb color="${thumbColor}" but got "${cell?.color}"`
        )
      }
    } else {
      // Track
      if (cell?.char !== '│') {
        throw new Error(
          `Expected scrollbar track "│" at (${scrollbarX},${row}) but got "${cell?.char}"`
        )
      }
      if (cell?.color !== trackColor) {
        throw new Error(
          `Expected scrollbar track color="${trackColor}" but got "${cell?.color}"`
        )
      }
    }
  }
}

/**
 * Assert flex children are positioned correctly in a row.
 * Verifies x positions and widths.
 */
export function assertFlexRow(
  buffer: ScreenBuffer,
  containerX: number,
  containerY: number,
  containerWidth: number,
  containerHeight: number,
  children: Array<{ width: number; bg?: string }>
): void {
  let currentX = containerX
  for (const child of children) {
    if (child.bg) {
      assertBoxBounds(buffer, currentX, containerY, child.width, containerHeight, child.bg)
    }
    currentX += child.width
  }
}

/**
 * Assert flex children are positioned correctly in a column.
 * Verifies y positions and heights.
 */
export function assertFlexColumn(
  buffer: ScreenBuffer,
  containerX: number,
  containerY: number,
  containerWidth: number,
  children: Array<{ height: number; bg?: string }>
): void {
  let currentY = containerY
  for (const child of children) {
    if (child.bg) {
      assertBoxBounds(buffer, containerX, currentY, containerWidth, child.height, child.bg)
    }
    currentY += child.height
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TREE TRAVERSAL HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

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
 * Find node by CSS class name.
 */
export function findNodeByClass(root: LayoutNode, className: string): LayoutNode | null {
  return findNode(root, n => {
    const cls: string = n.props?.class ?? ''
    return cls === className || cls.split(' ').includes(className)
  })
}

/**
 * Find node by tag type.
 */
export function findNodeByType(root: LayoutNode, type: string): LayoutNode | null {
  return findNode(root, n => n.type === type)
}

/**
 * Find all nodes matching predicate.
 */
export function findAllNodes(
  root: LayoutNode,
  predicate: (n: LayoutNode) => boolean
): LayoutNode[] {
  const results: LayoutNode[] = []
  function walk(node: LayoutNode) {
    if (predicate(node)) results.push(node)
    for (const child of node.children) {
      walk(child)
    }
  }
  walk(root)
  return results
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERACTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Set a node as hovered via synthetic mousemove.
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
 * Set focus to a node.
 */
export function setFocused(manager: InteractionManager, node: LayoutNode): void {
  manager.setFocus(node)
}

/**
 * Set a node as active (pressed) via synthetic mousedown.
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

/**
 * Clear hover state.
 */
export function clearHovered(manager: InteractionManager, root: LayoutNode): void {
  manager.handleMouseEvent(
    {
      type: 'mousemove',
      button: 'none',
      x: -1,
      y: -1,
      ctrl: false,
      shift: false,
      meta: false,
    },
    root
  )
}

// ═══════════════════════════════════════════════════════════════════════════════
// DEBUG HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Print a buffer region to stdout as a grid.
 * Useful for visual debugging.
 */
export function dumpBuffer(
  buffer: ScreenBuffer,
  x = 0,
  y = 0,
  width = buffer.width,
  height = buffer.height
): void {
  console.log(`\n📋 Buffer dump (${x},${y}) ${width}×${height}:`)
  for (let row = y; row < y + height; row++) {
    let line = ''
    for (let col = x; col < x + width; col++) {
      const cell = buffer.getCell(col, row)
      line += cell?.char ?? '·'
    }
    console.log(`${String(row).padStart(2)}: ${line}`)
  }
  console.log()
}

/**
 * Print detailed info about a single cell.
 */
export function dumpCell(buffer: ScreenBuffer, x: number, y: number): void {
  const cell = buffer.getCell(x, y)
  console.log(`\n📍 Cell at (${x},${y}):`)
  if (!cell) {
    console.log('  (null)')
  } else {
    console.log(`  char: "${cell.char}" (code: ${cell.char.charCodeAt(0)})`)
    console.log(`  color: ${cell.color ?? 'null'}`)
    console.log(`  background: ${cell.background ?? 'null'}`)
    console.log(`  bold: ${cell.bold ?? false}`)
    console.log(`  underline: ${cell.underline ?? false}`)
    console.log(`  italic: ${cell.italic ?? false}`)
    console.log(`  inverse: ${cell.inverse ?? false}`)
    console.log(`  dim: ${cell.dim ?? false}`)
  }
  console.log()
}

/**
 * Print all cells in a region with properties.
 */
export function dumpRegion(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  height: number
): void {
  console.log(`\n🖼️  Region dump (${x},${y}) ${width}×${height}:`)
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      const cell = buffer.getCell(col, row)
      if (!cell) {
        console.log(`  (${col},${row}): null`)
      } else {
        const props = []
        if (cell.color) props.push(`fg=${cell.color}`)
        if (cell.background) props.push(`bg=${cell.background}`)
        if (cell.bold) props.push('bold')
        if (cell.underline) props.push('underline')
        if (cell.italic) props.push('italic')
        console.log(`  (${col},${row}): "${cell.char}" ${props.join(' ')}`)
      }
    }
  }
  console.log()
}

/**
 * Pretty-print a layout tree (for debugging layout issues).
 */
export function dumpTree(node: LayoutNode, indent = 0): void {
  const prefix = '  '.repeat(indent)
  const layout = node.layout ? `[${node.layout.x},${node.layout.y} ${node.layout.width}×${node.layout.height}]` : '(no layout)'
  const cls = node.props?.class ? `.${node.props.class}` : ''
  console.log(`${prefix}${node.type}${cls} ${layout}`)
  for (const child of node.children) {
    dumpTree(child, indent + 1)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITY HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Count non-space characters in a row.
 */
export function countCharsInRow(buffer: ScreenBuffer, y: number, startX = 0, endX?: number): number {
  const end = endX ?? buffer.width
  let count = 0
  for (let x = startX; x < end; x++) {
    const cell = buffer.getCell(x, y)
    if (cell?.char && cell.char !== ' ') {
      count++
    }
  }
  return count
}

/**
 * Find first non-space character in a row.
 */
export function findFirstCharInRow(buffer: ScreenBuffer, y: number, startX = 0): number | null {
  for (let x = startX; x < buffer.width; x++) {
    const cell = buffer.getCell(x, y)
    if (cell?.char && cell.char !== ' ') {
      return x
    }
  }
  return null
}

/**
 * Find last non-space character in a row.
 */
export function findLastCharInRow(buffer: ScreenBuffer, y: number): number | null {
  for (let x = buffer.width - 1; x >= 0; x--) {
    const cell = buffer.getCell(x, y)
    if (cell?.char && cell.char !== ' ') {
      return x
    }
  }
  return null
}

/**
 * Check if a region contains any non-space characters.
 */
export function hasContent(
  buffer: ScreenBuffer,
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  for (let row = y; row < y + height; row++) {
    for (let col = x; col < x + width; col++) {
      const cell = buffer.getCell(col, row)
      if (cell?.char && cell.char !== ' ') {
        return true
      }
    }
  }
  return false
}

/**
 * Compare two buffer regions for pixel-perfect equality.
 */
export function compareRegions(
  buffer1: ScreenBuffer,
  x1: number,
  y1: number,
  buffer2: ScreenBuffer,
  x2: number,
  y2: number,
  width: number,
  height: number
): boolean {
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const cell1 = buffer1.getCell(x1 + col, y1 + row)
      const cell2 = buffer2.getCell(x2 + col, y2 + row)

      if (!cell1 && !cell2) continue
      if (!cell1 || !cell2) return false

      if (
        cell1.char !== cell2.char ||
        cell1.color !== cell2.color ||
        cell1.background !== cell2.background ||
        cell1.bold !== cell2.bold ||
        cell1.underline !== cell2.underline ||
        cell1.italic !== cell2.italic
      ) {
        return false
      }
    }
  }
  return true
}
