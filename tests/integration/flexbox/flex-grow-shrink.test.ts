/**
 * INT-FLEXBOX-ITEMS: Flex Grow and Shrink
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Flex Grow', () => {
  test('flex: 1 distributes extra space', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 2; }
       .a { flex: 1; height: 2; background: red; }
       .b { flex: 1; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // Both flex:1, so divide 30 equally → 15 each
    for (let x = 0; x < 15; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }
    for (let x = 15; x < 30; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
  })

  test('flex: 2 gets twice the space', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 2; }
       .a { flex: 1; height: 2; background: red; }
       .b { flex: 2; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // 1:2 ratio → 10 red, 20 blue
    for (let x = 0; x < 10; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }
    for (let x = 10; x < 30; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
  })

  test('flex-grow: 3 distributes space', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 40; height: 2; }
       .a { width: 10; height: 2; background: red; }
       .b { flex-grow: 1; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // A: 10 fixed, B: remaining 30
    for (let x = 0; x < 10; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }
    for (let x = 10; x < 40; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
  })
})

describe('Flex Basis', () => {
  test('flex-basis: 50% sizes child to percentage', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 40; height: 2; }
       .a { flex-basis: 50%; height: 2; background: red; }
       .b { flex-basis: 50%; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // 50% of 40 = 20 each
    for (let x = 0; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }
    for (let x = 20; x < 40; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
  })

  test('flex-basis: 10 sets fixed size', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 2; }
       .a { flex-basis: 10; height: 2; background: red; }
       .b { flex: 1; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // A: 10 fixed (red)
    for (let x = 0; x < 10; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }
    // B: remaining 20 (blue)
    for (let x = 10; x < 30; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
  })
})
