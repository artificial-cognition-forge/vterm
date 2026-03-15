/**
 * CSS Compliance — Clipping
 *
 * Content that extends beyond a parent's bounds should be clipped. The buffer renderer
 * establishes a ClipBox for each container node; children cannot render outside it.
 *
 * KNOWN BUG: Background fill X-clipping is missing in buffer-renderer.ts.
 * `renderBox()` applies clipBox to Y (height) but NOT to X (width).
 * The fill call is:
 *   buffer.fill(layout.x, fillY, layout.width, fillH, bgCell)
 *                ^^^^^^^^           ^^^^^^^^^^^^
 *   These are the raw layout values — clipBox.x/clipBox.width NOT applied.
 *
 * Text/char rendering IS correctly X-clipped (in renderText and renderBoxContent).
 *
 * Fix location: buffer-renderer.ts renderBox(), the `buffer.fill()` call.
 * Fix: apply the same X-clipping that renderText already applies:
 *   let fillX = layout.x, fillW = layout.width
 *   if (clipBox) {
 *     const clipRight = clipBox.x + clipBox.width
 *     if (fillX < clipBox.x) { fillW -= clipBox.x - fillX; fillX = clipBox.x }
 *     if (fillX + fillW > clipRight) { fillW = clipRight - fillX }
 *   }
 *
 * Tests marked BUG: document current (broken) behavior.
 * Tests without BUG: document working behavior (text clipping).
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, cellBg } from './helpers'

// ─── BUG: Background fill X-clipping ─────────────────────────────────────────

describe('BUG: child background wider than parent is not X-clipped', () => {
  test('background overflows parent right edge (text is correctly clipped)', async () => {
    const buf = await renderCSS(
      `.parent { width: 10; height: 5; }
       .child  { width: 20; height: 3; background: red; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    // BUG: background fills x=0..19 instead of being clipped to x=0..9
    // Once fixed: expect(cellBg(buf, 10, 0)).not.toBe('red')
    // Current behavior: background bleeds past parent boundary
    // We test that the text IS clipped correctly as a counterpoint
    const buf2 = await renderCSS(
      `.parent { width: 10; height: 5; }
       .child  { width: 20; height: 3; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }, 'ABCDEFGHIJKLMNOPQRST'))
    )
    // Text IS correctly clipped to parent width (10 chars)
    // chars at x=0..9 are present; x>=10 is empty
    expect(buf2.getCell(9, 0)?.char).toBe('J')
    expect(buf2.getCell(10, 0)?.char).toBe(' ')
  })
})


// ─── Y-clipping: works correctly ─────────────────────────────────────────────

describe('Y-clipping: child taller than parent is clipped', () => {
  test('child background does not extend past parent bottom edge', async () => {
    const buf = await renderCSS(
      `.parent { width: 10; height: 3; }
       .child  { width: 10; height: 10; background: blue; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    // Background within parent height: y=0..2
    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 0, 2)).toBe('blue')
    // Clipped: y=3 onwards
    expect(cellBg(buf, 0, 3)).not.toBe('blue')
  })

  test('child text does not extend past parent bottom edge', async () => {
    const buf = await renderCSS(
      `.parent { width: 20; height: 3; }
       .child  { width: 20; height: 10; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }, 'A\nB\nC\nD\nE\nF'))
    )
    expect(buf.getCell(0, 2)?.char).toBe('C')   // visible (y=2 < parent height 3)
    expect(buf.getCell(0, 3)?.char).toBe(' ')   // clipped
  })
})

// ─── Clip boxes compose: nested parents ──────────────────────────────────────

describe('clip boxes compose across nested parents', () => {
  test('grandchild Y-clipped to grandparent height even through intermediate parent', async () => {
    const buf = await renderCSS(
      `.gp    { width: 10; height: 3; }
       .par   { width: 10; height: 20; }
       .child { width: 10; height: 20; background: green; }`,
      h('div', { class: 'gp' },
        h('div', { class: 'par' },
          h('div', { class: 'child' })
        )
      )
    )
    // green visible within grandparent (3 rows)
    expect(cellBg(buf, 0, 2)).toBe('green')
    // clipped at row 3
    expect(cellBg(buf, 0, 3)).not.toBe('green')
  })
})

// ─── Border: interior clip for children ───────────────────────────────────────

describe('border: interior is correct clip boundary for child content', () => {
  test('child text starts inside border and clips at interior edge', async () => {
    // Parent: 12 wide, border 1 → interior: cols 1-10 (width 10)
    const buf = await renderCSS(
      `.parent { width: 12; height: 6; border: 1px solid white; }
       .child  { width: 20; height: 4; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }, 'ABCDEFGHIJKLMNOP'))
    )
    // Text starts at x=1 (after left border), clipped at x=10 (before right border)
    expect(buf.getCell(1, 1)?.char).toBe('A')
    expect(buf.getCell(10, 1)?.char).toBe('J')
    expect(buf.getCell(11, 1)?.char).toBe('│')   // right border, not text
  })
})
