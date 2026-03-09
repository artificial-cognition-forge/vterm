/**
 * Render Correctness — Content Clipping
 * spec.md § 4
 *
 * Verifies that content is clipped at container boundaries.
 * The buffer renderer establishes a clip box for each container node,
 * and children are not rendered outside that box.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, expectRegionEmpty } from './helpers'

// ─── Text overflow clipping ───────────────────────────────────────────────────

describe('text wider than container clips at right edge', () => {
  test('10-char text in 5-wide box: only 5 chars render', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 1; }`,
      h('div', { class: 'box' }, 'ABCDEFGHIJ')
    )
    expect(rowSlice(buf, 0, 0, 5)).toBe('ABCDE')
    // character F would be at x=5 — outside the container
    expect(buf.getCell(5, 0)?.char).toBe(' ')
    expect(buf.getCell(5, 0)?.background).toBeNull()
  })

  test('text clipped regardless of color', async () => {
    const buf = await renderCSS(
      `.box { width: 4; height: 1; color: cyan; }`,
      h('div', { class: 'box' }, 'HELLO')
    )
    expect(buf.getCell(3, 0)?.char).toBe('L')
    // 'O' at x=4 should not be rendered
    expect(buf.getCell(4, 0)?.char).toBe(' ')
    expect(buf.getCell(4, 0)?.color).toBeNull()
  })
})

// ─── Child wider than parent clips ───────────────────────────────────────────

describe('child element wider than parent clips at parent boundary', () => {
  test('child with background 3 cells wider than parent: bg ends at parent edge', async () => {
    const buf = await renderCSS(
      `
      .parent { width: 6; height: 3; }
      .child { width: 10; height: 3; background: red; }
      `,
      h('div', { class: 'parent' },
        h('div', { class: 'child' })
      )
    )
    // Background only within parent width (6)
    for (let x = 0; x < 6; x++) {
      expect(buf.getCell(x, 0)?.background).toBe('red')
    }
    // Past parent right edge: empty
    expect(buf.getCell(6, 0)?.background).toBeNull()
    expect(buf.getCell(7, 0)?.background).toBeNull()
  })
})

// ─── Child taller than parent clips ──────────────────────────────────────────

describe('child element taller than parent clips at parent boundary', () => {
  test('child with background 3 rows taller than parent: bg ends at parent bottom', async () => {
    const buf = await renderCSS(
      `
      .parent { width: 8; height: 3; }
      .child { width: 8; height: 6; background: blue; }
      `,
      h('div', { class: 'parent' },
        h('div', { class: 'child' })
      )
    )
    for (let y = 0; y < 3; y++) {
      expect(buf.getCell(0, y)?.background).toBe('blue')
    }
    // Past parent bottom: empty
    expect(buf.getCell(0, 3)?.background).toBeNull()
    expect(buf.getCell(0, 4)?.background).toBeNull()
  })
})

// ─── overflow: hidden ─────────────────────────────────────────────────────────

describe('overflow: hidden clips content without scrollbar', () => {
  test('container with hidden overflow: tall child chars clip at bottom edge', async () => {
    const buf = await renderCSS(
      `
      .box { width: 10; height: 3; overflow: hidden; display: flex; flex-direction: column; }
      .row { width: 10; height: 1; }
      `,
      h('div', { class: 'box' },
        h('div', { class: 'row' }, 'Row0'),
        h('div', { class: 'row' }, 'Row1'),
        h('div', { class: 'row' }, 'Row2'),
        h('div', { class: 'row' }, 'Row3'),  // outside viewport
        h('div', { class: 'row' }, 'Row4'),  // outside viewport
      )
    )
    // Rows 0-2 visible
    expect(buf.getCell(0, 0)?.char).toBe('R')  // Row0
    expect(buf.getCell(0, 1)?.char).toBe('R')  // Row1
    expect(buf.getCell(0, 2)?.char).toBe('R')  // Row2
    // Row3 and Row4 should be clipped — y=3 and y=4 should be empty
    expect(buf.getCell(0, 3)?.char).toBe(' ')
    expect(buf.getCell(0, 4)?.char).toBe(' ')
  })
})

// ─── Nested clip boxes ────────────────────────────────────────────────────────

describe('nested clip boxes compound', () => {
  test('deep child clips to innermost ancestor boundary', async () => {
    const buf = await renderCSS(
      `
      .outer { width: 10; height: 5; }
      .mid { width: 6; height: 3; }
      .inner { width: 20; height: 10; background: green; }
      `,
      h('div', { class: 'outer' },
        h('div', { class: 'mid' },
          h('div', { class: 'inner' })
        )
      )
    )
    // Green background should be clipped to mid (6x3)
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 6; x++) {
        expect(buf.getCell(x, y)?.background).toBe('green')
      }
    }
    // Past mid width (x >= 6): no green
    expect(buf.getCell(6, 0)?.background).toBeNull()
    // Past mid height (y >= 3): no green
    expect(buf.getCell(0, 3)?.background).toBeNull()
  })
})

// ─── Sibling unaffected by sibling clip ──────────────────────────────────────

describe('sibling unaffected by another sibling clipping', () => {
  test('second sibling renders normally after first sibling overflows', async () => {
    const buf = await renderCSS(
      `
      .row { width: 20; height: 4; display: flex; }
      .a { width: 8; height: 4; }
      .b { width: 4; height: 4; background: yellow; }
      `,
      h('div', { class: 'row' },
        h('div', { class: 'a' }, 'AAAA'),
        h('div', { class: 'b' })
      )
    )
    // b starts at x=8, width=4
    for (let x = 8; x < 12; x++) {
      expect(buf.getCell(x, 0)?.background).toBe('yellow')
    }
  })
})
