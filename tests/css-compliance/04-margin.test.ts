/**
 * CSS Compliance — Margin
 * spec.md § 4
 *
 * Tests: margin shorthand, margin-top/right/bottom/left, margin: auto
 * Pipeline tier: layout engine (element position offset by margin)
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS } from './helpers'

describe('margin shorthand — 1 value', () => {
  test('margin: 2 offsets element position', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 3; margin: 2; background: blue; }`,
      h('div', { class: 'box' })
    )
    // Element starts at (2, 2) due to margin
    expect(buf.getCell(2, 2)?.background).toBe('blue')
    expect(buf.getCell(0, 0)?.background).toBeNull()
  })
})

describe('margin shorthand — 2 values', () => {
  test('margin: 1 4 → top/bottom=1, left/right=4', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 3; margin: 1 4; background: red; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(4, 1)?.background).toBe('red')
    expect(buf.getCell(3, 1)?.background).toBeNull()
  })
})

describe('margin shorthand — 4 values', () => {
  test('margin: 1 2 3 4 → top=1 right=2 bottom=3 left=4', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 3; margin: 1 2 3 4; background: green; }`,
      h('div', { class: 'box' })
    )
    // Left margin = 4, top margin = 1
    expect(buf.getCell(4, 1)?.background).toBe('green')
    expect(buf.getCell(3, 1)?.background).toBeNull()
  })
})

describe('margin-top', () => {
  test('margin-top: 3 pushes element down 3 rows', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; margin-top: 3; background: cyan; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 3)?.background).toBe('cyan')
    expect(buf.getCell(0, 2)?.background).toBeNull()
  })
})

describe('margin-left', () => {
  test('margin-left: 5 shifts element right by 5', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; margin-left: 5; background: yellow; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(5, 0)?.background).toBe('yellow')
    expect(buf.getCell(4, 0)?.background).toBeNull()
  })
})

describe('margin-right', () => {
  test('margin-right: 3 reduces available space from the right side', async () => {
    // In a flex row, margin-right creates space after the element
    const buf = await renderCSS(
      `.parent { display: flex; flex-direction: row; width: 20; height: 3; }
       .a { width: 5; height: 3; margin-right: 3; background: red; }
       .b { width: 5; height: 3; background: blue; }`,
      h('div', { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    // .a occupies cols 0-4, margin-right = 3 → .b starts at col 8
    expect(buf.getCell(4, 0)?.background).toBe('red')
    expect(buf.getCell(8, 0)?.background).toBe('blue')
  })
})

describe('margin-bottom', () => {
  test('margin-bottom: 2 creates space below element', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; flex-direction: column; width: 10; height: 15; }
       .a { width: 10; height: 3; margin-bottom: 2; background: red; }
       .b { width: 10; height: 3; background: blue; }`,
      h('div', { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    // .a rows 0-2, margin-bottom = 2 → .b starts at row 5
    expect(buf.getCell(0, 2)?.background).toBe('red')
    expect(buf.getCell(0, 5)?.background).toBe('blue')
    // Row 3-4 should be empty (margin space)
    expect(buf.getCell(0, 3)?.background).toBeNull()
  })
})

describe('margin: auto', () => {
  test('margin: auto is parsed without crashing (no layout centering effect)', async () => {
    // margin: auto is stored as marginAuto flag; no actual centering
    const buf = await renderCSS(
      `.box { width: 10; height: 2; margin: auto; background: blue; }`,
      h('div', { class: 'box' })
    )
    // Should render without errors; exact position is implementation-defined
    expect(buf).toBeDefined()
  })
})
