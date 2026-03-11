/**
 * INT-OVERFLOW: Overflow Hidden
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg, cellText } from '../helpers'
import { h } from 'vue'

describe('Overflow Hidden', () => {
  test('overflow: hidden clips content at boundary', async () => {
    const buf = await renderCSS(
      `.container { width: 10; height: 3; overflow: hidden; background: blue; }`,
      h(
        'div',
        { class: 'container' },
        h('p', {}, 'Line1'),
        h('p', {}, 'Line2'),
        h('p', {}, 'Line3'),
        h('p', {}, 'Line4')
      )
    )

    // Should only show first 3 rows
    expect(cellText(buf, 0, 0)).toBe('L')
    expect(cellText(buf, 0, 2)).toBe('L')
    expect(cellBg(buf, 0, 2)).toBe('blue')
  })

  test('overflow: hidden no scrollbar rendered', async () => {
    const buf = await renderCSS(
      `.container { width: 10; height: 5; overflow: hidden; background: red; }`,
      h(
        'div',
        { class: 'container' },
        h('div', {}, 'A'),
        h('div', {}, 'B'),
        h('div', {}, 'C'),
        h('div', {}, 'D'),
        h('div', {}, 'E'),
        h('div', {}, 'F')
      )
    )

    // No scrollbar should appear
    // Last column should have content, not scrollbar chars
    expect(cellText(buf, 9, 0)).not.toBe('│')
    expect(cellText(buf, 9, 0)).not.toBe('█')
  })

  test('overflow: hidden clips wide content', async () => {
    const buf = await renderCSS(
      `.container { width: 10; height: 2; overflow: hidden; }`,
      h('div', { class: 'container' }, 'VeryLongTextThatExceedsWidth')
    )

    // Should clip to 10 chars
    expect(cellText(buf, 9, 0)).toBe('T')
    expect(cellText(buf, 10, 0)).not.toBe('e')
  })

  test('overflow: hidden on nested container', async () => {
    const buf = await renderCSS(
      `.outer { width: 20; height: 10; }
       .inner { width: 10; height: 3; overflow: hidden; background: blue; }`,
      h(
        'div',
        { class: 'outer' },
        h(
          'div',
          { class: 'inner' },
          h('div', {}, 'A'),
          h('div', {}, 'B'),
          h('div', {}, 'C'),
          h('div', {}, 'D')
        )
      )
    )

    // Inner container should clip at 3 rows
    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 0, 2)).toBe('blue')
    expect(cellBg(buf, 0, 3)).not.toBe('blue')
  })
})

describe('Overflow Auto', () => {
  test('overflow: auto on small content (no scroll needed)', async () => {
    const buf = await renderCSS(
      `.container { width: 20; height: 5; overflow: auto; background: green; }`,
      h('div', { class: 'container' }, h('p', {}, 'Content'))
    )

    // No scrollbar needed
    expect(cellText(buf, 19, 0)).not.toBe('│')
    expect(cellText(buf, 19, 0)).not.toBe('█')
  })

  test('overflow: auto on large content (shows scrollbar)', async () => {
    const buf = await renderCSS(
      `.container { width: 10; height: 3; overflow: auto; background: red; }`,
      h(
        'div',
        { class: 'container' },
        h('div', {}, 'Line1'),
        h('div', {}, 'Line2'),
        h('div', {}, 'Line3'),
        h('div', {}, 'Line4'),
        h('div', {}, 'Line5')
      )
    )

    // Scrollbar should appear on right edge (x=9)
    expect(cellText(buf, 9, 0)).toBe('│')
  })
})
