/**
 * INT-VISIBILITY: Display None vs Visibility Hidden
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Display vs Visibility', () => {
  test('visibility: hidden hides but takes space', async () => {
    const buf = await renderCSS(
      `.a { width: 5; height: 1; background: red; }
       .b { width: 5; height: 1; visibility: hidden; background: green; }
       .c { width: 5; height: 1; background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' })
      )
    )

    // A at y=0
    expect(cellBg(buf, 0, 0)).toBe('red')

    // B hidden but takes space, so C at y=2
    expect(cellBg(buf, 0, 1)).toBeNull() // Empty space where B is
    expect(cellBg(buf, 0, 2)).toBe('blue')
  })

  test('display: none hides and takes no space', async () => {
    const buf = await renderCSS(
      `.a { width: 5; height: 1; background: red; }
       .b { width: 5; height: 1; display: none; background: green; }
       .c { width: 5; height: 1; background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' })
      )
    )

    // A at y=0
    expect(cellBg(buf, 0, 0)).toBe('red')

    // B hidden and takes no space, so C at y=1
    expect(cellBg(buf, 0, 1)).toBe('blue')

    // Green never appears
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 80; x++) {
        expect(cellBg(buf, x, y)).not.toBe('green')
      }
    }
  })

  test('visibility: hidden multiple siblings', async () => {
    const buf = await renderCSS(
      `.item { width: 3; height: 1; }
       .item1 { background: red; }
       .item2 { background: green; visibility: hidden; }
       .item3 { background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'item item1' }),
        h('div', { class: 'item item2' }),
        h('div', { class: 'item item3' })
      )
    )

    // A at y=0
    expect(cellBg(buf, 0, 0)).toBe('red')

    // B hidden, takes space (y=1)
    expect(cellBg(buf, 0, 1)).toBeNull()

    // C at y=2
    expect(cellBg(buf, 0, 2)).toBe('blue')
  })
})
