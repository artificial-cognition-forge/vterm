/**
 * Render Correctness — Text Placement
 * spec.md § 1
 *
 * Verifies that text content appears at the exact (x, y) coordinates
 * determined by padding, text-align, and vertical-align.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice } from './helpers'

// ─── No padding ───────────────────────────────────────────────────────────────

describe('text at (0,0) with no padding', () => {
  test('single character appears at (0,0)', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'A')
    )
    expect(buf.getCell(0, 0)?.char).toBe('A')
  })

  test('multi-character string starts at (0,0)', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'Hello')
    )
    expect(rowSlice(buf, 0, 0, 5)).toBe('Hello')
  })
})

// ─── Padding offsets ──────────────────────────────────────────────────────────

describe('padding-left shifts text right', () => {
  test('padding-left: 3 → first char at x=3', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; padding-left: 3; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    expect(buf.getCell(3, 0)?.char).toBe('H')
    expect(buf.getCell(4, 0)?.char).toBe('i')
    // cells before padding are empty
    expect(buf.getCell(0, 0)?.char).toBe(' ')
    expect(buf.getCell(2, 0)?.char).toBe(' ')
  })
})

describe('padding-top shifts text down', () => {
  test('padding-top: 2 → first char at y=2', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; padding-top: 2; }`,
      h('div', { class: 'box' }, 'X')
    )
    expect(buf.getCell(0, 2)?.char).toBe('X')
    // rows before padding are empty
    expect(buf.getCell(0, 0)?.char).toBe(' ')
    expect(buf.getCell(0, 1)?.char).toBe(' ')
  })
})

describe('combined padding offsets', () => {
  test('padding: 1 2 → text at (2, 1)', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 5; padding: 1 2; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    expect(buf.getCell(2, 1)?.char).toBe('H')
  })
})

// ─── text-align ───────────────────────────────────────────────────────────────

describe('text-align: left (default)', () => {
  test('text starts at content-left (x=0 with no padding)', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; text-align: left; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    expect(buf.getCell(0, 0)?.char).toBe('H')
    expect(buf.getCell(1, 0)?.char).toBe('i')
  })
})

describe('text-align: right', () => {
  test('2-char text in 10-wide box: H at x=8, i at x=9', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; text-align: right; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    expect(buf.getCell(8, 0)?.char).toBe('H')
    expect(buf.getCell(9, 0)?.char).toBe('i')
    // should be space before text
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })

  test('5-char text in 10-wide box: starts at x=5', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; text-align: right; }`,
      h('div', { class: 'box' }, 'Hello')
    )
    expect(buf.getCell(5, 0)?.char).toBe('H')
    expect(buf.getCell(9, 0)?.char).toBe('o')
  })
})

describe('text-align: center', () => {
  test('2-char text in 10-wide box: centered around x=5', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; text-align: center; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    // (10 - 2) / 2 = 4 → text at x=4,5
    expect(buf.getCell(4, 0)?.char).toBe('H')
    expect(buf.getCell(5, 0)?.char).toBe('i')
  })

  test('4-char text in 10-wide box: starts at x=3', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; text-align: center; }`,
      h('div', { class: 'box' }, 'ABCD')
    )
    // (10 - 4) / 2 = 3
    expect(buf.getCell(3, 0)?.char).toBe('A')
    expect(buf.getCell(6, 0)?.char).toBe('D')
  })
})

// ─── vertical-align ───────────────────────────────────────────────────────────

describe('vertical-align: top (default)', () => {
  test('text appears at y=0 in a 5-row box', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; vertical-align: top; }`,
      h('div', { class: 'box' }, 'A')
    )
    expect(buf.getCell(0, 0)?.char).toBe('A')
  })
})

describe('vertical-align: middle', () => {
  test('text appears at y=2 in a 5-row box', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; vertical-align: middle; }`,
      h('div', { class: 'box' }, 'A')
    )
    // floor((5 - 1) / 2) = 2
    expect(buf.getCell(0, 2)?.char).toBe('A')
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })
})

describe('vertical-align: bottom', () => {
  test('text appears at y=4 in a 5-row box', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; vertical-align: bottom; }`,
      h('div', { class: 'box' }, 'A')
    )
    expect(buf.getCell(0, 4)?.char).toBe('A')
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })
})

// ─── Clipping at container edge ───────────────────────────────────────────────

describe('text clipping', () => {
  test('text longer than container does not render past right edge', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 1; }`,
      h('div', { class: 'box' }, 'ABCDEFGHIJ')
    )
    // Only first 5 chars fit
    expect(rowSlice(buf, 0, 0, 5)).toBe('ABCDE')
    // Cell at x=5 is outside container — should be empty (default space)
    expect(buf.getCell(5, 0)?.char).toBe(' ')
    expect(buf.getCell(5, 0)?.background).toBeNull()
  })
})

// ─── Nested containers ────────────────────────────────────────────────────────

describe('text in nested containers', () => {
  test('inner text offset by sum of ancestor positions', async () => {
    const buf = await renderCSS(
      `
      .outer { width: 40; height: 10; padding-left: 4; padding-top: 2; }
      .inner { width: 20; height: 5; padding-left: 1; padding-top: 1; }
      `,
      h('div', { class: 'outer' },
        h('div', { class: 'inner' }, 'Z')
      )
    )
    // outer padding: left=4, top=2; inner padding: left=1, top=1
    // Z should be at x=4+1=5, y=2+1=3
    expect(buf.getCell(5, 3)?.char).toBe('Z')
  })
})
