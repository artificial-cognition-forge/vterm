/**
 * INT-POSITION: Relative Positioning
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Relative Positioning', () => {
  test('position: relative is default behavior', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 2; background: blue; }`,
      h('div', { class: 'box' })
    )

    expect(cellBg(buf, 0, 0)).toBe('blue')
  })

  test('relative positioning with left offset', async () => {
    const buf = await renderCSS(
      `.box { position: relative; left: 5; width: 5; height: 2; background: blue; }`,
      h('div', { class: 'box' })
    )

    // Offset by left: 5
    expect(cellBg(buf, 5, 0)).toBe('blue')
    expect(cellBg(buf, 0, 0)).not.toBe('blue')
  })

  test('relative positioning with top offset', async () => {
    const buf = await renderCSS(
      `.box { position: relative; top: 3; width: 5; height: 2; background: blue; }`,
      h('div', { class: 'box' })
    )

    // Offset by top: 3
    expect(cellBg(buf, 0, 3)).toBe('blue')
    expect(cellBg(buf, 0, 0)).not.toBe('blue')
  })

  test('relative with left and top', async () => {
    const buf = await renderCSS(
      `.box { position: relative; left: 3; top: 2; width: 5; height: 2; background: red; }`,
      h('div', { class: 'box' })
    )

    // Offset to (3, 2)
    expect(cellBg(buf, 3, 2)).toBe('red')
  })

  test('relative positioning does not affect siblings', async () => {
    const buf = await renderCSS(
      `.a { width: 5; height: 1; background: red; }
       .b { position: relative; left: 10; width: 5; height: 1; background: blue; }
       .c { width: 5; height: 1; background: green; }`,
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

    // B at y=1, offset left by 10
    expect(cellBg(buf, 10, 1)).toBe('blue')

    // C at y=2 (unaffected by B's relative offset)
    expect(cellBg(buf, 0, 2)).toBe('green')
  })

  test('negative relative offset', async () => {
    const buf = await renderCSS(
      `.box { position: relative; left: -2; width: 5; height: 2; background: blue; }`,
      h('div', { class: 'box' })
    )

    // Negative offset shifts left
    // (may be clipped at x=0, depends on implementation)
    expect(cellBg(buf, 0, 0)).not.toBe('blue') // Clipped at 0
  })
})
