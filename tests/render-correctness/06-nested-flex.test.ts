/**
 * Render Correctness — Nested Flex Layout
 * spec.md § 6
 *
 * Verifies that flex children end up at correct (x, y) positions in the buffer,
 * including nested row-in-column and column-in-row arrangements.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice } from './helpers'

// ─── Two flex:1 siblings in row ───────────────────────────────────────────────

describe('two flex:1 siblings in row container', () => {
  test('each occupies half the container width (40-wide)', async () => {
    const buf = await renderCSS(
      `
      .row { width: 40; height: 4; display: flex; }
      .a { flex: 1; height: 4; background: blue; }
      .b { flex: 1; height: 4; background: red; }
      `,
      h('div', { class: 'row' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    // Left half: blue
    expect(buf.getCell(0, 0)?.background).toBe('blue')
    expect(buf.getCell(19, 0)?.background).toBe('blue')
    // Right half: red
    expect(buf.getCell(20, 0)?.background).toBe('red')
    expect(buf.getCell(39, 0)?.background).toBe('red')
    // Boundary: x=19 blue, x=20 red
    expect(buf.getCell(19, 0)?.background).toBe('blue')
    expect(buf.getCell(20, 0)?.background).toBe('red')
  })

  test('text in each half appears at correct x', async () => {
    const buf = await renderCSS(
      `
      .row { width: 40; height: 2; display: flex; }
      .a { flex: 1; height: 2; }
      .b { flex: 1; height: 2; }
      `,
      h('div', { class: 'row' },
        h('div', { class: 'a' }, 'LEFT'),
        h('div', { class: 'b' }, 'RIGHT')
      )
    )
    expect(rowSlice(buf, 0, 0, 4)).toBe('LEFT')
    expect(rowSlice(buf, 0, 20, 5)).toBe('RIGHT')
  })
})

// ─── Three flex:1 siblings ────────────────────────────────────────────────────

describe('three flex:1 siblings in row container', () => {
  test('each occupies one third of container width (60-wide)', async () => {
    const buf = await renderCSS(
      `
      .row { width: 60; height: 2; display: flex; }
      .a { flex: 1; height: 2; background: blue; }
      .b { flex: 1; height: 2; background: green; }
      .c { flex: 1; height: 2; background: red; }
      `,
      h('div', { class: 'row' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' })
      )
    )
    // Each third = 20 cells
    expect(buf.getCell(0, 0)?.background).toBe('blue')
    expect(buf.getCell(19, 0)?.background).toBe('blue')
    expect(buf.getCell(20, 0)?.background).toBe('green')
    expect(buf.getCell(39, 0)?.background).toBe('green')
    expect(buf.getCell(40, 0)?.background).toBe('red')
    expect(buf.getCell(59, 0)?.background).toBe('red')
  })
})

// ─── Column flex ─────────────────────────────────────────────────────────────

describe('column flex: children stacked at correct y', () => {
  test('three rows each height:2 stack at y=0,2,4', async () => {
    const buf = await renderCSS(
      `
      .col { width: 10; height: 8; display: flex; flex-direction: column; }
      .r { width: 10; height: 2; }
      `,
      h('div', { class: 'col' },
        h('div', { class: 'r' }, 'A'),
        h('div', { class: 'r' }, 'B'),
        h('div', { class: 'r' }, 'C')
      )
    )
    expect(buf.getCell(0, 0)?.char).toBe('A')
    expect(buf.getCell(0, 2)?.char).toBe('B')
    expect(buf.getCell(0, 4)?.char).toBe('C')
  })
})

// ─── Nested row inside column ─────────────────────────────────────────────────

describe('nested row inside column: correct (x, y) for inner items', () => {
  test('inner row at y=4, two items at x=0 and x=10', async () => {
    const buf = await renderCSS(
      `
      .col { width: 20; height: 8; display: flex; flex-direction: column; }
      .spacer { width: 20; height: 4; }
      .inner-row { width: 20; height: 4; display: flex; }
      .left { flex: 1; height: 4; background: blue; }
      .right { flex: 1; height: 4; background: red; }
      `,
      h('div', { class: 'col' },
        h('div', { class: 'spacer' }),
        h('div', { class: 'inner-row' },
          h('div', { class: 'left' }),
          h('div', { class: 'right' })
        )
      )
    )
    // inner-row starts at y=4; left half x=0..9, right half x=10..19
    expect(buf.getCell(0, 4)?.background).toBe('blue')
    expect(buf.getCell(9, 4)?.background).toBe('blue')
    expect(buf.getCell(10, 4)?.background).toBe('red')
    expect(buf.getCell(19, 4)?.background).toBe('red')
  })
})

// ─── gap between row siblings ─────────────────────────────────────────────────

describe('gap between row siblings', () => {
  test('gap: 2 → second item starts 2 cells after first ends', async () => {
    const buf = await renderCSS(
      `
      .row { width: 30; height: 2; display: flex; gap: 2; }
      .a { width: 8; height: 2; background: blue; }
      .b { width: 8; height: 2; background: red; }
      `,
      h('div', { class: 'row' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    // a: x=0..7 (blue)
    expect(buf.getCell(0, 0)?.background).toBe('blue')
    expect(buf.getCell(7, 0)?.background).toBe('blue')
    // gap: x=8,9 should be empty
    expect(buf.getCell(8, 0)?.background).toBeNull()
    expect(buf.getCell(9, 0)?.background).toBeNull()
    // b: x=10..17 (red)
    expect(buf.getCell(10, 0)?.background).toBe('red')
    expect(buf.getCell(17, 0)?.background).toBe('red')
  })
})

// ─── Fixed sidebar + flex:1 content ───────────────────────────────────────────

describe('fixed sidebar + flex:1 content area', () => {
  test('content starts immediately after sidebar at x=sidebar.width', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 80; height: 20; display: flex; }
      .sidebar { width: 20; height: 20; background: blue; }
      .content { flex: 1; height: 20; background: green; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' })
      )
    )
    // sidebar: x=0..19
    expect(buf.getCell(0, 0)?.background).toBe('blue')
    expect(buf.getCell(19, 0)?.background).toBe('blue')
    // content: x=20..79
    expect(buf.getCell(20, 0)?.background).toBe('green')
    expect(buf.getCell(79, 0)?.background).toBe('green')
    // boundary is sharp
    expect(buf.getCell(19, 0)?.background).toBe('blue')
    expect(buf.getCell(20, 0)?.background).toBe('green')
  })
})

// ─── Column gap ───────────────────────────────────────────────────────────────

describe('column gap in column flex', () => {
  test('gap: 1 between column children shifts positions by 1 extra', async () => {
    const buf = await renderCSS(
      `
      .col { width: 10; height: 10; display: flex; flex-direction: column; gap: 1; }
      .item { width: 10; height: 2; background: cyan; }
      `,
      h('div', { class: 'col' },
        h('div', { class: 'item' }),
        h('div', { class: 'item' }),
        h('div', { class: 'item' })
      )
    )
    // item 1: y=0..1
    expect(buf.getCell(0, 0)?.background).toBe('cyan')
    expect(buf.getCell(0, 1)?.background).toBe('cyan')
    // gap: y=2 empty
    expect(buf.getCell(0, 2)?.background).toBeNull()
    // item 2: y=3..4
    expect(buf.getCell(0, 3)?.background).toBe('cyan')
    expect(buf.getCell(0, 4)?.background).toBe('cyan')
    // gap: y=5 empty
    expect(buf.getCell(0, 5)?.background).toBeNull()
    // item 3: y=6..7
    expect(buf.getCell(0, 6)?.background).toBe('cyan')
    expect(buf.getCell(0, 7)?.background).toBe('cyan')
  })
})
