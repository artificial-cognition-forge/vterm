/**
 * CSS Compliance — Flexbox Items
 * spec.md § 8
 *
 * Tests: flex shorthand, flex-grow, flex-shrink, flex-basis, align-self
 * Pipeline tier: layout engine
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS } from './helpers'

// ─── flex shorthand ───────────────────────────────────────────────────────────

describe('flex shorthand', () => {
  test('flex: 1 causes item to fill remaining space', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; width: 20; height: 3; }
       .fixed { width: 8; height: 3; background: red; }
       .grow  { flex: 1; height: 3; background: blue; }`,
      h('div', { class: 'p' },
        h('div', { class: 'fixed' }),
        h('div', { class: 'grow' })
      )
    )
    // .fixed = 8, .grow should fill remaining 12 cols
    expect(buf.getCell(8, 0)?.background).toBe('blue')
    expect(buf.getCell(19, 0)?.background).toBe('blue')
  })

  test('flex: 2 and flex: 1 split remaining space 2:1', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; width: 30; height: 3; }
       .a { flex: 2; height: 3; background: red; }
       .b { flex: 1; height: 3; background: blue; }`,
      h('div', { class: 'p' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    // 30 cols total: .a = 20, .b = 10
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(19, 0)?.background).toBe('red')
    expect(buf.getCell(20, 0)?.background).toBe('blue')
    expect(buf.getCell(29, 0)?.background).toBe('blue')
  })

  test('flex: none prevents item from growing or shrinking', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; width: 20; height: 3; }
       .a { flex: none; width: 5; height: 3; background: red; }
       .b { flex: 1; height: 3; background: blue; }`,
      h('div', { class: 'p' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    // .a = 5, .b fills remaining 15
    expect(buf.getCell(4, 0)?.background).toBe('red')
    expect(buf.getCell(5, 0)?.background).toBe('blue')
    expect(buf.getCell(19, 0)?.background).toBe('blue')
  })
})

// ─── flex-grow ───────────────────────────────────────────────────────────────

describe('flex-grow', () => {
  test('flex-grow: 1 fills remaining space', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; width: 20; height: 3; }
       .a { width: 10; height: 3; background: red; }
       .b { flex-grow: 1; height: 3; background: blue; }`,
      h('div', { class: 'p' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    expect(buf.getCell(10, 0)?.background).toBe('blue')
    expect(buf.getCell(19, 0)?.background).toBe('blue')
  })

  test('flex-grow: 0 (default) does not expand', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; width: 20; height: 3; }
       .a { width: 5; flex-grow: 0; height: 3; background: red; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }))
    )
    // Only 5 cols should be red
    expect(buf.getCell(4, 0)?.background).toBe('red')
    expect(buf.getCell(5, 0)?.background).toBeNull()
  })
})

// ─── flex-basis ──────────────────────────────────────────────────────────────

describe('flex-basis', () => {
  test('flex-basis: 10 sets initial main size to 10 cells', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; width: 30; height: 3; }
       .a { flex-basis: 10; flex-grow: 0; height: 3; background: red; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }))
    )
    expect(buf.getCell(9, 0)?.background).toBe('red')
    expect(buf.getCell(10, 0)?.background).toBeNull()
  })
})

// ─── align-self ───────────────────────────────────────────────────────────────

describe('align-self', () => {
  test('align-self: flex-end overrides align-items: flex-start for one item', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; align-items: flex-start; width: 20; height: 10; }
       .a { width: 5; height: 3; background: red; }
       .b { width: 5; height: 3; align-self: flex-end; background: blue; }`,
      h('div', { class: 'p' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    // .a at top (y=0), .b aligned to bottom (y=7)
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(5, 7)?.background).toBe('blue')
  })

  test('align-self: center vertically centers one item', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; align-items: flex-start; width: 20; height: 10; }
       .a { width: 5; height: 2; align-self: center; background: red; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }))
    )
    // 2-tall in 10-tall → centered at y=4
    expect(buf.getCell(0, 4)?.background).toBe('red')
    expect(buf.getCell(0, 3)?.background).toBeNull()
  })
})
