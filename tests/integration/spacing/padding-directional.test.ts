/**
 * INT-PADDING: Directional Padding
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellText } from '../helpers'
import { h } from 'vue'

describe('Padding Directional', () => {
  test('padding: 1 2 sets top/bottom=1, left/right=2', async () => {
    const buf = await renderCSS(
      `.box { width: 15; height: 5; padding: 1 2; background: blue; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // padding: 1 2 → top/bottom=1, left/right=2
    // Content starts at (2, 1)
    expect(cellText(buf, 2, 1)).toBe('T')
  })

  test('padding: 1 2 3 4 sets all sides individually', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 10; padding: 1 2 3 4; background: blue; }`,
      h('div', { class: 'box' }, 'X')
    )

    // padding: top=1, right=2, bottom=3, left=4
    // Content starts at (4, 1)
    expect(cellText(buf, 4, 1)).toBe('X')
  })

  test('padding-top affects vertical position', async () => {
    const buf = await renderCSS(
      `.box1 { width: 10; height: 3; padding-top: 0; background: red; }
       .box2 { width: 10; height: 3; padding-top: 2; background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'box1' }, 'A'),
        h('div', { class: 'box2' }, 'B')
      )
    )

    // Box1: text at y=0
    expect(cellText(buf, 0, 0)).toBe('A')

    // Box2: text at y=5 (3 rows + padding-top=2)
    expect(cellText(buf, 0, 5)).toBe('B')
  })

  test('padding-left affects horizontal position', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 3; padding-left: 5; background: blue; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Content starts at x=5
    expect(cellText(buf, 5, 0)).toBe('T')
    expect(cellText(buf, 4, 0)).not.toBe('T')
  })

  test('padding-right with text clipping', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; padding-right: 3; background: blue; }`,
      h('div', { class: 'box' }, 'VeryLongText')
    )

    // Content area is 10 - 3 = 7 wide
    // Text clipped to 7 chars
    expect(cellText(buf, 0, 0)).toBe('V')
    expect(cellText(buf, 6, 0)).toBe('y')
  })
})
