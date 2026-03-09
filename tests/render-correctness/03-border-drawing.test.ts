/**
 * Render Correctness — Border Drawing
 * spec.md § 3
 *
 * Verifies that border box-drawing characters appear at exact (x,y) positions,
 * with correct characters and colors for all border styles.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice } from './helpers'

// ─── Border character sets ────────────────────────────────────────────────────

const CHARS = {
  line:   { tl: '┌', tr: '┐', bl: '└', br: '┘', h: '─', v: '│' },
  heavy:  { tl: '┏', tr: '┓', bl: '┗', br: '┛', h: '━', v: '┃' },
  double: { tl: '╔', tr: '╗', bl: '╚', br: '╝', h: '═', v: '║' },
  ascii:  { tl: '+',  tr: '+',  bl: '+',  br: '+',  h: '-',  v: '|' },
}

// ─── Corner positions ─────────────────────────────────────────────────────────

describe('line border corner characters at exact positions', () => {
  const W = 10, H = 5

  test('top-left corner at (0,0)', async () => {
    const buf = await renderCSS(
      `.box { width: ${W}; height: ${H}; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.tl)
  })

  test('top-right corner at (W-1, 0)', async () => {
    const buf = await renderCSS(
      `.box { width: ${W}; height: ${H}; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(W - 1, 0)?.char).toBe(CHARS.line.tr)
  })

  test('bottom-left corner at (0, H-1)', async () => {
    const buf = await renderCSS(
      `.box { width: ${W}; height: ${H}; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, H - 1)?.char).toBe(CHARS.line.bl)
  })

  test('bottom-right corner at (W-1, H-1)', async () => {
    const buf = await renderCSS(
      `.box { width: ${W}; height: ${H}; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(W - 1, H - 1)?.char).toBe(CHARS.line.br)
  })
})

// ─── Edge characters ──────────────────────────────────────────────────────────

describe('line border edge characters', () => {
  const W = 10, H = 5

  test('top edge: horizontal chars at y=0, x=1..W-2', async () => {
    const buf = await renderCSS(
      `.box { width: ${W}; height: ${H}; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    for (let x = 1; x < W - 1; x++) {
      expect(buf.getCell(x, 0)?.char).toBe(CHARS.line.h)
    }
  })

  test('bottom edge: horizontal chars at y=H-1, x=1..W-2', async () => {
    const buf = await renderCSS(
      `.box { width: ${W}; height: ${H}; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    for (let x = 1; x < W - 1; x++) {
      expect(buf.getCell(x, H - 1)?.char).toBe(CHARS.line.h)
    }
  })

  test('left edge: vertical chars at x=0, y=1..H-2', async () => {
    const buf = await renderCSS(
      `.box { width: ${W}; height: ${H}; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    for (let y = 1; y < H - 1; y++) {
      expect(buf.getCell(0, y)?.char).toBe(CHARS.line.v)
    }
  })

  test('right edge: vertical chars at x=W-1, y=1..H-2', async () => {
    const buf = await renderCSS(
      `.box { width: ${W}; height: ${H}; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    for (let y = 1; y < H - 1; y++) {
      expect(buf.getCell(W - 1, y)?.char).toBe(CHARS.line.v)
    }
  })
})

// ─── Border color ─────────────────────────────────────────────────────────────

describe('border color applies to all border characters', () => {
  test('all four corners have the border color', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1px solid cyan; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.color).toBe('cyan')
    expect(buf.getCell(9, 0)?.color).toBe('cyan')
    expect(buf.getCell(0, 4)?.color).toBe('cyan')
    expect(buf.getCell(9, 4)?.color).toBe('cyan')
  })

  test('top edge chars have border color', async () => {
    const buf = await renderCSS(
      `.box { width: 8; height: 4; border: 1px solid red; }`,
      h('div', { class: 'box' })
    )
    for (let x = 0; x < 8; x++) {
      expect(buf.getCell(x, 0)?.color).toBe('red')
    }
  })
})

// ─── Content starts inside border ────────────────────────────────────────────

describe('content offset by 1 due to border', () => {
  test('text A appears at (1,1) when box has border', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1px solid white; }`,
      h('div', { class: 'box' }, 'A')
    )
    expect(buf.getCell(1, 1)?.char).toBe('A')
    // not at (0,0) which is the border corner
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.line.tl)
  })
})

// ─── Heavy border ─────────────────────────────────────────────────────────────

describe('heavy border via shorthand', () => {
  test('all four corners use heavy box-drawing chars', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1 heavy white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.heavy.tl)
    expect(buf.getCell(9, 0)?.char).toBe(CHARS.heavy.tr)
    expect(buf.getCell(0, 4)?.char).toBe(CHARS.heavy.bl)
    expect(buf.getCell(9, 4)?.char).toBe(CHARS.heavy.br)
  })

  test('heavy horizontal and vertical edges', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1 heavy white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(1, 0)?.char).toBe(CHARS.heavy.h)
    expect(buf.getCell(0, 1)?.char).toBe(CHARS.heavy.v)
  })
})

// ─── Double border ────────────────────────────────────────────────────────────

describe('double border style', () => {
  test('corners use double box-drawing chars', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border-width: 1; border-style: double; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.double.tl)
    expect(buf.getCell(9, 0)?.char).toBe(CHARS.double.tr)
    expect(buf.getCell(0, 4)?.char).toBe(CHARS.double.bl)
    expect(buf.getCell(9, 4)?.char).toBe(CHARS.double.br)
  })
})

// ─── ASCII border ─────────────────────────────────────────────────────────────

describe('ascii border style', () => {
  test('corners use + character', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1 ascii white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(CHARS.ascii.tl)
    expect(buf.getCell(9, 0)?.char).toBe(CHARS.ascii.tr)
  })

  test('top edge uses - character', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1 ascii white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(1, 0)?.char).toBe(CHARS.ascii.h)
  })

  test('left edge uses | character', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1 ascii white; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 1)?.char).toBe(CHARS.ascii.v)
  })
})

// ─── Nested borders ───────────────────────────────────────────────────────────

describe('nested bordered elements', () => {
  test('inner border starts at (1,1) relative to outer content area', async () => {
    const buf = await renderCSS(
      `
      .outer { width: 20; height: 10; border: 1px solid white; }
      .inner { width: 8; height: 4; border: 1px solid cyan; }
      `,
      h('div', { class: 'outer' },
        h('div', { class: 'inner' })
      )
    )
    // outer border: (0,0)=TL; outer content starts at (1,1)
    // inner border TL is at outer content start: (1,1)
    expect(buf.getCell(1, 1)?.char).toBe(CHARS.line.tl)
    expect(buf.getCell(1, 1)?.color).toBe('cyan')
  })
})

// ─── No border ────────────────────────────────────────────────────────────────

describe('no border', () => {
  test('without border, (0,0) is space (not a corner char)', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })
})
