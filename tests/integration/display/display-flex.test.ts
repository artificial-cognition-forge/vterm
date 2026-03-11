/**
 * INT-DISPLAY: Display Flex
 *
 * Tests that display: flex enables flexbox layout with correct spacing.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Display Flex', () => {
  test('flex with row direction (default) lays out horizontally', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; flex-direction: row; width: 30; height: 3; }
       .a { width: 10; height: 3; background: red; }
       .b { width: 10; height: 3; background: blue; }
       .c { width: 10; height: 3; background: green; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' })
      )
    )

    // A: x=0-9 red
    for (let x = 0; x < 10; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }

    // B: x=10-19 blue
    for (let x = 10; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }

    // C: x=20-29 green
    for (let x = 20; x < 30; x++) {
      expect(cellBg(buf, x, 0)).toBe('green')
    }
  })

  test('flex with column direction stacks vertically', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; flex-direction: column; width: 10; height: 9; }
       .a { width: 10; height: 3; background: red; }
       .b { width: 10; height: 3; background: blue; }
       .c { width: 10; height: 3; background: green; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' })
      )
    )

    // A: y=0-2 red
    for (let y = 0; y < 3; y++) {
      expect(cellBg(buf, 0, y)).toBe('red')
    }

    // B: y=3-5 blue
    for (let y = 3; y < 6; y++) {
      expect(cellBg(buf, 0, y)).toBe('blue')
    }

    // C: y=6-8 green
    for (let y = 6; y < 9; y++) {
      expect(cellBg(buf, 0, y)).toBe('green')
    }
  })

  test('flex row-reverse reverses child order', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; flex-direction: row-reverse; width: 30; height: 2; }
       .a { width: 10; height: 2; background: red; }
       .b { width: 10; height: 2; background: blue; }
       .c { width: 10; height: 2; background: green; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' })
      )
    )

    // Reversed: C is first (x=0-9), then B, then A
    // C: x=0-9 green
    for (let x = 0; x < 10; x++) {
      expect(cellBg(buf, x, 0)).toBe('green')
    }

    // B: x=10-19 blue
    for (let x = 10; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }

    // A: x=20-29 red
    for (let x = 20; x < 30; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }
  })

  test('flex column-reverse reverses child order vertically', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; flex-direction: column-reverse; width: 10; height: 9; }
       .a { width: 10; height: 3; background: red; }
       .b { width: 10; height: 3; background: blue; }
       .c { width: 10; height: 3; background: green; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' })
      )
    )

    // Reversed: C is first, B second, A last
    // C: y=0-2 green
    for (let y = 0; y < 3; y++) {
      expect(cellBg(buf, 0, y)).toBe('green')
    }

    // B: y=3-5 blue
    for (let y = 3; y < 6; y++) {
      expect(cellBg(buf, 0, y)).toBe('blue')
    }

    // A: y=6-8 red
    for (let y = 6; y < 9; y++) {
      expect(cellBg(buf, 0, y)).toBe('red')
    }
  })

  test('flex children stretch to container height by default', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 5; }
       .a { width: 10; background: red; }
       .b { width: 10; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // Both children should stretch to 5 rows
    for (let y = 0; y < 5; y++) {
      expect(cellBg(buf, 0, y)).toBe('red')
      expect(cellBg(buf, 10, y)).toBe('blue')
    }
  })

  test('flex children respect explicit height', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 5; }
       .a { width: 10; height: 2; background: red; }
       .b { width: 10; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // Children fixed at height 2
    expect(cellBg(buf, 0, 0)).toBe('red')
    expect(cellBg(buf, 0, 1)).toBe('red')
    expect(cellBg(buf, 0, 2)).not.toBe('red')
  })
})
