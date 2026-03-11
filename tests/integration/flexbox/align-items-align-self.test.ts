/**
 * INT-FLEXBOX-ITEMS: Align Items and Align Self
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Align Items', () => {
  test('align-items: flex-start aligns all to top', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 5; align-items: flex-start; }
       .a { width: 10; height: 2; background: red; }
       .b { width: 10; height: 3; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // Both start at y=0
    expect(cellBg(buf, 0, 0)).toBe('red')
    expect(cellBg(buf, 10, 0)).toBe('blue')
  })

  test('align-items: center centers vertically', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 5; align-items: center; }
       .a { width: 10; height: 1; background: red; }
       .b { width: 10; height: 1; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // Container 5 tall, items 1 tall → center at y=2
    expect(cellBg(buf, 0, 2)).toBe('red')
    expect(cellBg(buf, 10, 2)).toBe('blue')
  })

  test('align-items: flex-end aligns to bottom', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 5; align-items: flex-end; }
       .a { width: 10; height: 1; background: red; }
       .b { width: 10; height: 1; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // Items end at y=4
    expect(cellBg(buf, 0, 4)).toBe('red')
    expect(cellBg(buf, 10, 4)).toBe('blue')
  })

  test('align-items: stretch (default) fills height', async () => {
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

    // Both should stretch to 5 rows
    for (let y = 0; y < 5; y++) {
      expect(cellBg(buf, 0, y)).toBe('red')
      expect(cellBg(buf, 10, y)).toBe('blue')
    }
  })
})

describe('Align Self', () => {
  test('align-self: flex-end overrides container align-items', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 5; align-items: flex-start; }
       .a { width: 10; height: 2; background: red; }
       .b { width: 10; height: 2; background: blue; align-self: flex-end; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // A aligns to start (y=0)
    expect(cellBg(buf, 0, 0)).toBe('red')

    // B aligns to end (y=3-4) via align-self
    expect(cellBg(buf, 10, 3)).toBe('blue')
  })

  test('align-self: center overrides container', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 5; align-items: flex-start; }
       .a { width: 10; height: 1; background: red; }
       .b { width: 10; height: 1; background: blue; align-self: center; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // A at y=0 (flex-start)
    expect(cellBg(buf, 0, 0)).toBe('red')

    // B at y=2 (center)
    expect(cellBg(buf, 10, 2)).toBe('blue')
  })
})
