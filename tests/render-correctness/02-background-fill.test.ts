/**
 * Render Correctness — Background Fill
 * spec.md § 2
 *
 * Verifies that background-color fills exactly the element's bounds:
 * all cells inside, none outside, and that child backgrounds overwrite parent.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, expectRegionBg, expectRegionEmpty, cellBg } from './helpers'

// ─── Full region fill ─────────────────────────────────────────────────────────

describe('background fills entire element bounds', () => {
  test('4x3 box with background: blue → all 12 cells have bg=blue', async () => {
    const buf = await renderCSS(
      `.box { width: 4; height: 3; background: blue; }`,
      h('div', { class: 'box' })
    )
    expectRegionBg(buf, 0, 0, 4, 3, 'blue')
  })

  test('background fills element at non-zero position', async () => {
    const buf = await renderCSS(
      `
      .outer { width: 20; height: 10; display: flex; flex-direction: column; }
      .spacer { height: 3; width: 20; }
      .box { width: 10; height: 4; background: red; }
      `,
      h('div', { class: 'outer' },
        h('div', { class: 'spacer' }),
        h('div', { class: 'box' })
      )
    )
    // box starts at y=3 (after spacer)
    expectRegionBg(buf, 0, 3, 10, 4, 'red')
  })
})

// ─── Does not bleed outside bounds ───────────────────────────────────────────

describe('background does not extend beyond element width', () => {
  test('5-wide box with blue bg: cell at x=5 has no background', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 3; background: blue; }`,
      h('div', { class: 'box' })
    )
    // inside: blue
    expectRegionBg(buf, 0, 0, 5, 3, 'blue')
    // outside right edge: empty
    expectRegionEmpty(buf, 5, 0, 5, 3)
  })
})

describe('background does not extend beyond element height', () => {
  test('3-row box with blue bg: row 3 has no background', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 3; background: blue; }`,
      h('div', { class: 'box' })
    )
    expectRegionBg(buf, 0, 0, 10, 3, 'blue')
    expectRegionEmpty(buf, 0, 3, 10, 2)
  })
})

// ─── Child overwrites parent ──────────────────────────────────────────────────

describe('child background overwrites parent background', () => {
  test('parent blue, child red 4x2 at origin: child region is red', async () => {
    const buf = await renderCSS(
      `
      .parent { width: 10; height: 6; background: blue; display: flex; }
      .child { width: 4; height: 2; background: red; }
      `,
      h('div', { class: 'parent' },
        h('div', { class: 'child' })
      )
    )
    // child region: red
    expectRegionBg(buf, 0, 0, 4, 2, 'red')
    // rest of parent: blue
    expectRegionBg(buf, 4, 0, 6, 2, 'blue')
    expectRegionBg(buf, 0, 2, 10, 4, 'blue')
  })

  test('child with no background: parent bg shows through', async () => {
    const buf = await renderCSS(
      `
      .parent { width: 10; height: 4; background: green; display: flex; }
      .child { width: 4; height: 2; }
      `,
      h('div', { class: 'parent' },
        h('div', { class: 'child' })
      )
    )
    // entire parent region should be green (child has no bg override)
    expectRegionBg(buf, 0, 0, 10, 4, 'green')
  })
})

// ─── Background with border ───────────────────────────────────────────────────

describe('background with border', () => {
  test('border cells carry element background (borders inherit bg by design)', async () => {
    const buf = await renderCSS(
      `.box { width: 6; height: 4; background: cyan; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    // interior cells (inside border) have cyan background
    expectRegionBg(buf, 1, 1, 4, 2, 'cyan')
    // border chars: the renderer sets borderBg = style.border?.bg || style.bg
    // so border cells inherit the element background color (cyan) by design
    const tl = buf.getCell(0, 0)
    expect(tl?.char).toBe('┌')
    expect(tl?.background).toBe('cyan')
  })
})

// ─── Adjacent elements ────────────────────────────────────────────────────────

describe('adjacent elements with different backgrounds', () => {
  test('two side-by-side boxes each fill exactly their own region', async () => {
    const buf = await renderCSS(
      `
      .row { width: 20; height: 4; display: flex; }
      .left { width: 10; height: 4; background: blue; }
      .right { width: 10; height: 4; background: red; }
      `,
      h('div', { class: 'row' },
        h('div', { class: 'left' }),
        h('div', { class: 'right' })
      )
    )
    expectRegionBg(buf, 0, 0, 10, 4, 'blue')
    expectRegionBg(buf, 10, 0, 10, 4, 'red')
  })

  test('two stacked boxes each fill exactly their own region', async () => {
    const buf = await renderCSS(
      `
      .col { width: 10; height: 8; display: flex; flex-direction: column; }
      .top { width: 10; height: 4; background: magenta; }
      .bot { width: 10; height: 4; background: yellow; }
      `,
      h('div', { class: 'col' },
        h('div', { class: 'top' }),
        h('div', { class: 'bot' })
      )
    )
    expectRegionBg(buf, 0, 0, 10, 4, 'magenta')
    expectRegionBg(buf, 0, 4, 10, 4, 'yellow')
  })
})
