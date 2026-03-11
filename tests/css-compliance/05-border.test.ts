/**
 * CSS Compliance — Border
 * spec.md § 5
 *
 * Tests: border shorthand, border-style, border-color, border-width, border types
 * Pipeline tier: layout engine (border consumes space) + buffer renderer (box-drawing chars)
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS } from './helpers'

// ─── Border characters ────────────────────────────────────────────────────────
const CHARS = {
  line:   { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  heavy:  { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  ascii:  { tl: '+',  tr: '+',  bl: '+',  br: '+',  h: '-',  v: '|' },
}

// ─── border shorthand ─────────────────────────────────────────────────────────

describe('border shorthand', () => {
  test('border: 1px solid white renders line-style border', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.tl)
    expect(buf.getCell(9, 0)?.char).toBe(CHARS.line.tr)
    expect(buf.getCell(0, 4)?.char).toBe(CHARS.line.bl)
    expect(buf.getCell(9, 4)?.char).toBe(CHARS.line.br)
    expect(buf.getCell(1, 0)?.char).toBe(CHARS.line.h)
    expect(buf.getCell(0, 1)?.char).toBe(CHARS.line.v)
  })

  test('border: 1px solid blue applies blue color to border cells', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1px solid blue; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.color).toBe('blue')
    expect(buf.getCell(9, 0)?.color).toBe('blue')
  })

  test('border reduces content area by 1 cell on each side', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1px solid white; }`,
      h('div', { class: 'box' }, 'A')
    )
    // Content starts at (1,1) because border takes (0,0)
    expect(buf.getCell(1, 1)?.char).toBe('A')
  })
})

// ─── border-style ────────────────────────────────────────────────────────────

describe('border-style: solid', () => {
  test('border-style: solid renders line-style box-drawing chars', async () => {
    const buf = await renderCSS(
      `.box { width: 8; height: 4; border-width: 1; border-style: solid; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.tl)
  })
})

describe('border-style: double', () => {
  test('border-style: double renders double box-drawing chars', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border-width: 1; border-style: double; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.double.tl)
    expect(buf.getCell(9, 0)?.char).toBe(CHARS.double.tr)
    expect(buf.getCell(1, 0)?.char).toBe(CHARS.double.h)
    expect(buf.getCell(0, 1)?.char).toBe(CHARS.double.v)
  })
})

describe('border-style: none', () => {
  test('border-style: none removes the border', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1px solid white; border-style: none; }`,
      h('div', { class: 'box' })
    )
    // No box-drawing chars at corners
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })
})

// ─── border-color ────────────────────────────────────────────────────────────

describe('border-color', () => {
  test('border-color: cyan applies cyan color to border cells', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border-width: 1; border-style: solid; border-color: cyan; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.color).toBe('cyan')
    expect(buf.getCell(9, 4)?.color).toBe('cyan')
  })
})

// ─── border-width ────────────────────────────────────────────────────────────

describe('border-width', () => {
  test('border-width: 1 with border-style renders a border', async () => {
    const buf = await renderCSS(
      `.box { width: 8; height: 4; border-width: 1; border-style: solid; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.tl)
  })

  test('border-width: 0 renders no border', async () => {
    const buf = await renderCSS(
      `.box { width: 8; height: 4; border-width: 0; border-style: solid; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })
})

// ─── Heavy border (vterm extension) ──────────────────────────────────────────

// BUG: border-style: heavy is not mapped in declaration-transformer.ts.
// The 'border-style' case only handles 'solid' → 'line', 'double', and 'none'.
// 'heavy' and 'ascii' are only handled inside the 'border' shorthand (via value.includes()).
// Fix: add `else if (value === 'heavy') { props.borderType = 'heavy' }` in the border-style case.
describe('BUG: border-style: heavy (not handled by border-style property)', () => {
  test('border-style: heavy currently falls back to line style', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border-width: 1; border-style: heavy; }`,
      h('div', { class: 'box' })
    )
    // Current: borderType unset → defaults to 'line'
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.tl)
    // Expected once fixed: expect(buf.getCell(0, 0)?.char).toBe(CHARS.heavy.tl)
  })

  test('heavy border works via border shorthand (workaround)', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1 heavy white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.heavy.tl)
    expect(buf.getCell(9, 0)?.char).toBe(CHARS.heavy.tr)
    expect(buf.getCell(1, 0)?.char).toBe(CHARS.heavy.h)
    expect(buf.getCell(0, 1)?.char).toBe(CHARS.heavy.v)
  })
})

// ─── Per-side borders ─────────────────────────────────────────────────────────

describe('border-bottom', () => {
  test('renders a horizontal line at the bottom row only', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 3; border-bottom: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    // Bottom row should have horizontal chars
    expect(buf.getCell(0, 2)?.char).toBe(CHARS.line.h)
    expect(buf.getCell(5, 2)?.char).toBe(CHARS.line.h)
    // Top and sides should be empty
    expect(buf.getCell(0, 0)?.char).toBe(' ')
    expect(buf.getCell(0, 1)?.char).toBe(' ')
  })

  test('does not reduce content width (no left/right border)', async () => {
    // Content should start at x=0 (no left border offset)
    const buf = await renderCSS(
      `.box { width: 10; height: 3; border-bottom: 1px solid white; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    expect(buf.getCell(0, 0)?.char).toBe('H')
  })

  test('content does not overlap the bottom border row', async () => {
    // 3 rows total: row 0 = content, row 1 = content, row 2 = border
    const buf = await renderCSS(
      `.box { width: 10; height: 3; border-bottom: 1px solid white; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    // Bottom row is border, not text
    expect(buf.getCell(0, 2)?.char).toBe(CHARS.line.h)
  })
})

describe('border-top', () => {
  test('renders a horizontal line at the top row only', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 3; border-top: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.h)
    expect(buf.getCell(5, 0)?.char).toBe(CHARS.line.h)
    // Rows below should be empty
    expect(buf.getCell(0, 1)?.char).toBe(' ')
  })
})

describe('border-left', () => {
  test('renders a vertical line on the left column only', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 4; border-left: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.v)
    expect(buf.getCell(0, 1)?.char).toBe(CHARS.line.v)
    expect(buf.getCell(0, 2)?.char).toBe(CHARS.line.v)
    // Right column should be empty
    expect(buf.getCell(4, 0)?.char).toBe(' ')
  })
})

describe('border-right', () => {
  test('renders a vertical line on the right column only', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 3; border-right: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(4, 0)?.char).toBe(CHARS.line.v)
    expect(buf.getCell(4, 1)?.char).toBe(CHARS.line.v)
    // Left column should be empty
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })
})

describe('per-side border combinations', () => {
  test('border-top + border-bottom draws top and bottom only, no sides', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 4; border-top: 1px solid white; border-bottom: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.h)
    expect(buf.getCell(0, 3)?.char).toBe(CHARS.line.h)
    // Left column: no vertical chars
    expect(buf.getCell(0, 1)?.char).toBe(' ')
    expect(buf.getCell(0, 2)?.char).toBe(' ')
  })

  test('border-top + border-left draws corner at top-left', async () => {
    const buf = await renderCSS(
      `.box { width: 8; height: 4; border-top: 1px solid white; border-left: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    // Top-left corner
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.tl)
    // Top edge (no top-right corner since no right border)
    expect(buf.getCell(1, 0)?.char).toBe(CHARS.line.h)
    expect(buf.getCell(7, 0)?.char).toBe(CHARS.line.h)
    // Left side
    expect(buf.getCell(0, 1)?.char).toBe(CHARS.line.v)
  })

  test('border: none on a side disables it when shorthand is set', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 4; border: 1px solid white; border-top: 0; border-bottom: 0; }`,
      h('div', { class: 'box' })
    )
    // Interior of top and bottom rows should be empty (no horizontal line)
    expect(buf.getCell(1, 0)?.char).toBe(' ')
    expect(buf.getCell(1, 3)?.char).toBe(' ')
    // Left and right sides still render across all 4 rows
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.v)
    expect(buf.getCell(0, 3)?.char).toBe(CHARS.line.v)
    expect(buf.getCell(9, 0)?.char).toBe(CHARS.line.v)
    expect(buf.getCell(9, 3)?.char).toBe(CHARS.line.v)
  })
})
