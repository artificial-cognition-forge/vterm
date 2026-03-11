/**
 * INT-COLOR: Background Colors
 *
 * Tests that background-color fills the entire element box correctly.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg, expectRegionBg } from '../helpers'
import { h } from 'vue'

describe('Background Colors', () => {
  test('background fills entire element box', async () => {
    const buf = await renderCSS(
      `.box { background: blue; width: 10; height: 5; }`,
      h('div', { class: 'box' })
    )

    expectRegionBg(buf, 0, 0, 10, 5, 'blue')
  })

  test('background with padding still fills full box', async () => {
    const buf = await renderCSS(
      `.box { background: green; width: 10; height: 5; padding: 2; }`,
      h('div', { class: 'box' })
    )

    // Background should fill entire box, including padded area
    expectRegionBg(buf, 0, 0, 10, 5, 'green')
  })

  test('background with border fills inside border', async () => {
    const buf = await renderCSS(
      `.box { background: red; border: 1px solid white; width: 10; height: 5; }`,
      h('div', { class: 'box' })
    )

    // Border is at (0,0), background fills from (1,1)
    expectRegionBg(buf, 1, 1, 8, 3, 'red')
  })

  test('child background overwrites parent background', async () => {
    const buf = await renderCSS(
      `.parent { background: blue; width: 20; height: 5; }
       .child { background: green; width: 8; height: 3; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // Parent blue outside child region
    expect(cellBg(buf, 10, 0)).toBe('blue')
    // Child green in its region
    expect(cellBg(buf, 0, 0)).toBe('green')
    expect(cellBg(buf, 4, 1)).toBe('green')
  })

  test('background does not extend past element width', async () => {
    const buf = await renderCSS(
      `.box { background: cyan; width: 5; height: 3; }`,
      h('div', { class: 'box' })
    )

    expectRegionBg(buf, 0, 0, 5, 3, 'cyan')
    // Beyond width should not have cyan
    expect(cellBg(buf, 5, 0)).not.toBe('cyan')
  })

  test('background does not extend past element height', async () => {
    const buf = await renderCSS(
      `.box { background: yellow; width: 5; height: 3; }`,
      h('div', { class: 'box' })
    )

    expectRegionBg(buf, 0, 0, 5, 3, 'yellow')
    // Beyond height should not have yellow
    expect(cellBg(buf, 0, 3)).not.toBe('yellow')
  })

  test('nested backgrounds layer correctly', async () => {
    const buf = await renderCSS(
      `.outer { background: red; width: 15; height: 5; }
       .middle { background: blue; width: 10; height: 3; }
       .inner { background: green; width: 5; height: 1; }`,
      h(
        'div',
        { class: 'outer' },
        h(
          'div',
          { class: 'middle' },
          h('div', { class: 'inner' })
        )
      )
    )

    // Outer red in corners
    expect(cellBg(buf, 14, 0)).toBe('red')
    // Middle blue
    expect(cellBg(buf, 0, 0)).toBe('blue')
    // Inner green
    expect(cellBg(buf, 2, 0)).toBe('green')
  })
})
