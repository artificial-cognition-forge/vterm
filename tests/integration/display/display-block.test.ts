/**
 * INT-DISPLAY: Display Block
 *
 * Tests that display: block stacks elements vertically.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Display Block', () => {
  test('block elements stack vertically', async () => {
    const buf = await renderCSS(
      `.a { display: block; width: 10; height: 2; background: red; }
       .b { display: block; width: 10; height: 2; background: blue; }
       .c { display: block; width: 10; height: 2; background: green; }`,
      h(
        'div',
        {},
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' })
      )
    )

    // Box A: rows 0-1, red
    expect(cellBg(buf, 0, 0)).toBe('red')
    expect(cellBg(buf, 0, 1)).toBe('red')

    // Box B: rows 2-3, blue
    expect(cellBg(buf, 0, 2)).toBe('blue')
    expect(cellBg(buf, 0, 3)).toBe('blue')

    // Box C: rows 4-5, green
    expect(cellBg(buf, 0, 4)).toBe('green')
    expect(cellBg(buf, 0, 5)).toBe('green')
  })

  test('block elements fill parent width (unless fixed)', async () => {
    const buf = await renderCSS(
      `.parent { width: 40; height: 10; }
       .child { display: block; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // Child should be 40 wide (parent width)
    for (let x = 0; x < 40; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
    expect(cellBg(buf, 40, 0)).not.toBe('blue')
  })

  test('block with fixed width does not fill parent', async () => {
    const buf = await renderCSS(
      `.parent { width: 40; height: 5; }
       .child { display: block; width: 15; height: 2; background: cyan; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // Child fixed at 15 wide
    for (let x = 0; x < 15; x++) {
      expect(cellBg(buf, x, 0)).toBe('cyan')
    }
    // Beyond 15 should not be cyan
    expect(cellBg(buf, 15, 0)).not.toBe('cyan')
  })

  test('margin collapses between block siblings', async () => {
    const buf = await renderCSS(
      `.box { display: block; width: 10; height: 1; }
       .a { background: red; margin-bottom: 2; }
       .b { background: blue; margin-top: 2; }`,
      h(
        'div',
        {},
        h('div', { class: 'box a' }),
        h('div', { class: 'box b' })
      )
    )

    // Box A at y=0
    expect(cellBg(buf, 0, 0)).toBe('red')

    // Margin collapses, so box B starts at y=3 (not y=5)
    // (both margins are 2, but they collapse to 2, not 4)
    expect(cellBg(buf, 0, 3)).toBe('blue')
  })

  test('first block element margin-top is preserved', async () => {
    const buf = await renderCSS(
      `.box { display: block; width: 10; height: 1; background: red; margin-top: 3; }`,
      h('div', {}, h('div', { class: 'box' }))
    )

    // Margin-top should be applied, box starts at y=3
    expect(cellBg(buf, 0, 0)).not.toBe('red')
    expect(cellBg(buf, 0, 3)).toBe('red')
  })

  test('block elements respect padding', async () => {
    const buf = await renderCSS(
      `.box { display: block; width: 20; height: 5; background: blue; padding: 2; }`,
      h('div', { class: 'box' }, 'Content')
    )

    // Background fills entire 20×5
    for (let x = 0; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }

    // Content starts at (2, 2) due to padding
    expect(cellBg(buf, 2, 2)).toBe('blue')
  })

  test('default display behavior is block-like', async () => {
    const buf = await renderCSS(
      `.a { width: 10; height: 2; background: red; }
       .b { width: 10; height: 2; background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // Without explicit display:flex, should stack vertically
    expect(cellBg(buf, 0, 0)).toBe('red')
    expect(cellBg(buf, 0, 2)).toBe('blue')
  })
})
