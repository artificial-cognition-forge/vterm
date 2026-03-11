/**
 * INT-MARGIN: Uniform Margin
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Margin Uniform', () => {
  test('margin: 1 creates space around element', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 1; margin: 1; background: blue; }`,
      h('div', { class: 'box' })
    )

    // With margin 1, box should be offset by 1 cell
    expect(cellBg(buf, 1, 1)).toBe('blue')
    expect(cellBg(buf, 0, 0)).not.toBe('blue')
  })

  test('margin between siblings', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 1; margin: 1; background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'box' }),
        h('div', { class: 'box' })
      )
    )

    // First box: at y=1 (margin-top)
    expect(cellBg(buf, 0, 1)).toBe('blue')

    // Second box: margin collapsing means y=3 (not y=4)
    // First box row 1-1, margin 1, second box at 3
    expect(cellBg(buf, 0, 3)).toBe('blue')
  })

  test('margin: 2 creates larger gap', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 1; margin: 2; background: red; }`,
      h('div', { class: 'box' })
    )

    // Element offset by 2
    expect(cellBg(buf, 2, 2)).toBe('red')
    expect(cellBg(buf, 0, 0)).not.toBe('red')
  })

  test('margin-top on first element is preserved', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 1; margin-top: 3; background: blue; }`,
      h('div', {}, h('div', { class: 'box' }))
    )

    // Should start at y=3 due to margin-top
    expect(cellBg(buf, 0, 3)).toBe('blue')
    expect(cellBg(buf, 0, 0)).not.toBe('blue')
  })

  test('margin-bottom on element', async () => {
    const buf = await renderCSS(
      `.a { width: 5; height: 1; margin-bottom: 2; background: red; }
       .b { width: 5; height: 1; background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // A at y=0
    expect(cellBg(buf, 0, 0)).toBe('red')

    // B at y=3 (1 row + margin-bottom 2)
    expect(cellBg(buf, 0, 3)).toBe('blue')
  })
})
