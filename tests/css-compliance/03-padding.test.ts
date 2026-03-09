/**
 * CSS Compliance — Padding
 * spec.md § 3
 *
 * Tests: padding shorthand (1/2/4 values), padding-top/right/bottom/left
 * Pipeline tier: layout engine (content box position offset by padding)
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice } from './helpers'

// ─── Padding shorthand ────────────────────────────────────────────────────────

describe('padding shorthand — 1 value', () => {
  test('padding: 2 shifts content down by 2 and right by 2', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 10; padding: 2; background: blue; }`,
      h('div', { class: 'box' }, 'A')
    )
    // Content 'A' should appear at (2, 2)
    expect(buf.getCell(2, 2)?.char).toBe('A')
    // Cell at (0, 0) is padding area (background filled but no text)
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })
})

describe('padding shorthand — 2 values (vertical horizontal)', () => {
  test('padding: 1 4 → top/bottom=1, left/right=4', async () => {
    const buf = await renderCSS(
      `.box { width: 30; height: 10; padding: 1 4; background: blue; }`,
      h('div', { class: 'box' }, 'A')
    )
    // Content should appear at (4, 1)
    expect(buf.getCell(4, 1)?.char).toBe('A')
    expect(buf.getCell(3, 1)?.char).toBe(' ') // still padding
    expect(buf.getCell(4, 0)?.char).toBe(' ') // still padding
  })
})

describe('padding shorthand — 4 values (top right bottom left)', () => {
  test('padding: 1 2 3 4 → top=1 right=2 bottom=3 left=4', async () => {
    const buf = await renderCSS(
      `.box { width: 30; height: 10; padding: 1 2 3 4; background: blue; }`,
      h('div', { class: 'box' }, 'A')
    )
    // Content should appear at x=4, y=1
    expect(buf.getCell(4, 1)?.char).toBe('A')
  })
})

// ─── Individual padding sides ──────────────────────────────────────────────────

describe('padding-top', () => {
  test('padding-top: 3 pushes content down by 3', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 10; padding-top: 3; background: blue; }`,
      h('div', { class: 'box' }, 'A')
    )
    expect(buf.getCell(0, 3)?.char).toBe('A')
    expect(buf.getCell(0, 2)?.char).toBe(' ')
  })
})

describe('padding-left', () => {
  test('padding-left: 5 shifts content right by 5', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 5; padding-left: 5; background: blue; }`,
      h('div', { class: 'box' }, 'A')
    )
    expect(buf.getCell(5, 0)?.char).toBe('A')
    expect(buf.getCell(4, 0)?.char).toBe(' ')
  })
})

describe('padding-right', () => {
  test('padding-right: 4 reduces content width from the right', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 3; padding-right: 4; background: blue; }`,
      h('div', { class: 'box' }, 'ABCDEF')
    )
    // Content width = 10 - 4 = 6, so only 6 chars fit
    expect(buf.getCell(5, 0)?.char).toBe('F')
    // Column 6 onward is padding
    expect(buf.getCell(6, 0)?.char).toBe(' ')
  })
})

describe('padding-bottom', () => {
  test('padding-bottom: 2 reduces content height from the bottom', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; padding-bottom: 2; background: blue; }`,
      h('div', { class: 'box' })
    )
    // Content area height = 5 - 2 = 3 rows; rows 3-4 are padding
    // The box still fills all 5 rows with bg
    expect(buf.getCell(0, 4)?.background).toBe('blue')
  })
})

describe('padding combined with content', () => {
  test('padding: 1 does not clip content', async () => {
    const buf = await renderCSS(
      `.box { width: 12; height: 5; padding: 1; }`,
      h('div', { class: 'box' }, 'Hello')
    )
    // Content area starts at (1,1), text 'Hello' should be there
    expect(rowSlice(buf, 1, 1, 5)).toBe('Hello')
  })
})
