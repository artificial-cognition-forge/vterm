/**
 * CSS Compliance — Flexbox Container
 * spec.md § 7
 *
 * Tests: flex-direction, justify-content, align-items, flex-wrap, gap/row-gap/column-gap
 * Pipeline tier: layout engine
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS } from './helpers'

// ─── flex-direction ──────────────────────────────────────────────────────────

describe('flex-direction', () => {
  test('row: children arranged left→right', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; width: 20; height: 3; }
       .a { width: 5; height: 3; background: red; }
       .b { width: 5; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(5, 0)?.background).toBe('blue')
  })

  test('column: children arranged top→bottom', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: column; width: 10; height: 10; }
       .a { width: 10; height: 3; background: red; }
       .b { width: 10; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(0, 3)?.background).toBe('blue')
  })

  test('row-reverse: children arranged right→left', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row-reverse; width: 20; height: 3; }
       .a { width: 5; height: 3; background: red; }
       .b { width: 5; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    // In row-reverse, DOM order is reversed: last item (.b) is visually first (left)
    // .b at x=0-4, .a at x=5-9 (within the 20-wide container with 10 cells of items)
    // OR depending on implementation: items pack to the right end
    // Assert both items rendered adjacently without overlap
    const aStart = (() => {
      for (let x = 0; x < 20; x++) if (buf.getCell(x, 0)?.background === 'red') return x
      return -1
    })()
    const bStart = (() => {
      for (let x = 0; x < 20; x++) if (buf.getCell(x, 0)?.background === 'blue') return x
      return -1
    })()
    // Both items must be rendered
    expect(aStart).toBeGreaterThanOrEqual(0)
    expect(bStart).toBeGreaterThanOrEqual(0)
    // In row-reverse, .a (first DOM child) should be to the RIGHT of .b
    expect(aStart).toBeGreaterThan(bStart)
  })

  test('column-reverse: children arranged bottom→top', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: column-reverse; width: 10; height: 10; }
       .a { width: 10; height: 3; background: red; }
       .b { width: 10; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    // In column-reverse, .a (first DOM child) should be rendered BELOW .b
    const aStart = (() => {
      for (let y = 0; y < 10; y++) if (buf.getCell(0, y)?.background === 'red') return y
      return -1
    })()
    const bStart = (() => {
      for (let y = 0; y < 10; y++) if (buf.getCell(0, y)?.background === 'blue') return y
      return -1
    })()
    expect(aStart).toBeGreaterThanOrEqual(0)
    expect(bStart).toBeGreaterThanOrEqual(0)
    // .a is first in DOM so renders at bottom in column-reverse
    expect(aStart).toBeGreaterThan(bStart)
  })
})

// ─── justify-content ─────────────────────────────────────────────────────────

describe('justify-content', () => {
  test('flex-start: children at beginning of main axis', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; justify-content: flex-start; width: 20; height: 3; }
       .a { width: 5; height: 3; background: red; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }))
    )
    expect(buf.getCell(0, 0)?.background).toBe('red')
  })

  test('flex-end: children at end of main axis', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; justify-content: flex-end; width: 20; height: 3; }
       .a { width: 5; height: 3; background: red; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }))
    )
    // Child should be at x=15 (20-5)
    expect(buf.getCell(15, 0)?.background).toBe('red')
    expect(buf.getCell(14, 0)?.background).toBeNull()
  })

  test('center: children centered on main axis', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; justify-content: center; width: 20; height: 3; }
       .a { width: 4; height: 3; background: red; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }))
    )
    // 4-wide child in 20-wide parent → offset = 8
    expect(buf.getCell(8, 0)?.background).toBe('red')
    expect(buf.getCell(7, 0)?.background).toBeNull()
  })

  test('space-between: first and last children at edges', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; justify-content: space-between; width: 20; height: 3; }
       .a { width: 4; height: 3; background: red; }
       .b { width: 4; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(19, 0)?.background).toBe('blue')
  })
})

// ─── align-items ─────────────────────────────────────────────────────────────

describe('align-items', () => {
  test('flex-start: items at start of cross axis', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; align-items: flex-start; width: 20; height: 10; }
       .a { width: 5; height: 3; background: red; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }))
    )
    expect(buf.getCell(0, 0)?.background).toBe('red')
  })

  test('flex-end: items at end of cross axis', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; align-items: flex-end; width: 20; height: 10; }
       .a { width: 5; height: 3; background: red; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }))
    )
    // Cross axis end: child bottom at y=9, so child starts at y=7
    expect(buf.getCell(0, 7)?.background).toBe('red')
    expect(buf.getCell(0, 6)?.background).toBeNull()
  })

  test('center: items centered on cross axis', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; align-items: center; width: 20; height: 10; }
       .a { width: 5; height: 2; background: red; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }))
    )
    // 2-tall in 10-tall: starts at y=4
    expect(buf.getCell(0, 4)?.background).toBe('red')
    expect(buf.getCell(0, 3)?.background).toBeNull()
  })
})

// ─── flex-wrap ───────────────────────────────────────────────────────────────

describe('flex-wrap', () => {
  test('nowrap: items overflow past container width (no wrapping)', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; flex-wrap: nowrap; width: 10; height: 3; }
       .a { width: 6; height: 3; background: red; }
       .b { width: 6; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    // .b starts at x=6, even though parent is only 10 wide (no wrap)
    expect(buf.getCell(6, 0)?.background).toBe('blue')
  })

  test('wrap: items wrap to next line when they exceed container width', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; flex-wrap: wrap; width: 10; height: 10; }
       .a { width: 6; height: 3; background: red; }
       .b { width: 6; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    // .b should wrap to row 1 (y=3)
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(0, 3)?.background).toBe('blue')
  })
})

// ─── gap ─────────────────────────────────────────────────────────────────────

describe('gap', () => {
  test('gap: 2 adds 2-cell space between flex items', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; gap: 2; width: 20; height: 3; }
       .a { width: 4; height: 3; background: red; }
       .b { width: 4; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    // .a: cols 0-3, gap: cols 4-5, .b: cols 6-9
    expect(buf.getCell(3, 0)?.background).toBe('red')
    expect(buf.getCell(4, 0)?.background).toBeNull()
    expect(buf.getCell(6, 0)?.background).toBe('blue')
  })

  test('column-gap: 3 adds space between columns in row flex', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; column-gap: 3; width: 20; height: 3; }
       .a { width: 4; height: 3; background: red; }
       .b { width: 4; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    // .a: 0-3, gap: 4-6, .b: 7-10
    expect(buf.getCell(3, 0)?.background).toBe('red')
    expect(buf.getCell(6, 0)?.background).toBeNull()
    expect(buf.getCell(7, 0)?.background).toBe('blue')
  })

  test('row-gap: 2 adds space between rows in column flex', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: column; row-gap: 2; width: 10; height: 15; }
       .a { width: 10; height: 2; background: red; }
       .b { width: 10; height: 2; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    // .a: rows 0-1, gap: rows 2-3, .b: rows 4-5
    expect(buf.getCell(0, 1)?.background).toBe('red')
    expect(buf.getCell(0, 2)?.background).toBeNull()
    expect(buf.getCell(0, 4)?.background).toBe('blue')
  })
})
