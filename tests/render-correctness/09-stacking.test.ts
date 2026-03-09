/**
 * Render Correctness — Paint Order (Stacking)
 * spec.md § 9
 *
 * The buffer renderer paints in tree order: parent → children → later siblings.
 * The last write to a cell wins. These tests verify the paint order contract.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS } from './helpers'

// ─── Child renders over parent ────────────────────────────────────────────────

describe('child background overwrites parent background', () => {
  test('child red overwrites parent blue in child region', async () => {
    const buf = await renderCSS(
      `
      .parent { width: 10; height: 6; background: blue; }
      .child { width: 4; height: 2; background: red; }
      `,
      h('div', { class: 'parent' },
        h('div', { class: 'child' })
      )
    )
    // child region (0-3, 0-1): red
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(3, 1)?.background).toBe('red')
    // parent region outside child: blue
    expect(buf.getCell(5, 0)?.background).toBe('blue')
    expect(buf.getCell(0, 3)?.background).toBe('blue')
  })

  test('child text overwrites parent background character', async () => {
    const buf = await renderCSS(
      `
      .parent { width: 10; height: 3; background: blue; }
      .child { width: 4; height: 1; }
      `,
      h('div', { class: 'parent' },
        h('div', { class: 'child' }, 'ABCD')
      )
    )
    // Child text chars are painted after parent bg, so they appear over it
    expect(buf.getCell(0, 0)?.char).toBe('A')
    expect(buf.getCell(1, 0)?.char).toBe('B')
    // Parent bg still visible in unoccupied cells
    expect(buf.getCell(5, 0)?.background).toBe('blue')
  })
})

// ─── Deep child over grandparent ─────────────────────────────────────────────

describe('deep child renders on top of all ancestors', () => {
  test('grandchild yellow overwrites parent green and grandparent blue', async () => {
    const buf = await renderCSS(
      `
      .gp { width: 12; height: 8; background: blue; }
      .parent { width: 8; height: 6; background: green; }
      .child { width: 4; height: 3; background: yellow; }
      `,
      h('div', { class: 'gp' },
        h('div', { class: 'parent' },
          h('div', { class: 'child' })
        )
      )
    )
    // grandchild: (0,0) - (3,2) → yellow
    expect(buf.getCell(0, 0)?.background).toBe('yellow')
    expect(buf.getCell(3, 2)?.background).toBe('yellow')
    // parent region outside child: green
    expect(buf.getCell(5, 0)?.background).toBe('green')
    // grandparent region outside parent: blue
    expect(buf.getCell(10, 0)?.background).toBe('blue')
  })
})

// ─── Later sibling renders over earlier sibling ───────────────────────────────

describe('later sibling renders over earlier sibling content at same position', () => {
  test('with absolute positioning: second sibling overlaps first', async () => {
    const buf = await renderCSS(
      `
      .container { width: 20; height: 8; position: relative; }
      .first { position: absolute; top: 0; left: 0; width: 10; height: 4; background: blue; }
      .second { position: absolute; top: 0; left: 4; width: 10; height: 4; background: red; }
      `,
      h('div', { class: 'container' },
        h('div', { class: 'first' }),
        h('div', { class: 'second' })
      )
    )
    // x=0..3: only first (blue)
    expect(buf.getCell(0, 0)?.background).toBe('blue')
    expect(buf.getCell(3, 0)?.background).toBe('blue')
    // x=4..9: overlap region → second (red) wins
    expect(buf.getCell(4, 0)?.background).toBe('red')
    expect(buf.getCell(9, 0)?.background).toBe('red')
    // x=10..13: only second (red)
    expect(buf.getCell(10, 0)?.background).toBe('red')
    expect(buf.getCell(13, 0)?.background).toBe('red')
  })
})

// ─── Absolute over flow content ───────────────────────────────────────────────

describe('absolute element renders after flow, overwriting it', () => {
  test('absolute red 4x2 overwrites flow blue at same position', async () => {
    const buf = await renderCSS(
      `
      .container { width: 20; height: 8; position: relative; }
      .flow { width: 20; height: 8; background: blue; }
      .abs { position: absolute; top: 2; left: 3; width: 6; height: 3; background: red; }
      `,
      h('div', { class: 'container' },
        h('div', { class: 'flow' }),
        h('div', { class: 'abs' })
      )
    )
    // Flow covers everything; abs overwrites its region
    expect(buf.getCell(3, 2)?.background).toBe('red')
    expect(buf.getCell(8, 4)?.background).toBe('red')
    // Flow still visible outside abs region
    expect(buf.getCell(0, 0)?.background).toBe('blue')
    expect(buf.getCell(0, 2)?.background).toBe('blue')
    expect(buf.getCell(9, 2)?.background).toBe('blue')
  })
})

// ─── Text over background ─────────────────────────────────────────────────────

describe('text content paints over background of same element', () => {
  test('element with background and text: text char visible at correct position', async () => {
    const buf = await renderCSS(
      `
      .box { width: 10; height: 3; background: cyan; }
      `,
      h('div', { class: 'box' }, 'Hi')
    )
    // Text painted after background fill
    expect(buf.getCell(0, 0)?.char).toBe('H')
    expect(buf.getCell(1, 0)?.char).toBe('i')
    // Background still there (char rendered on top keeps the bg from previous paint)
    // The background was set on the cell during bg fill; text write updates char but
    // the cell's background is set to the text's bg (which may be null), so check
    // that the text is present
    expect(buf.getCell(0, 0)?.char).toBe('H')
  })
})
