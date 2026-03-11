/**
 * INT-PADDING: Uniform Padding
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg, cellText } from '../helpers'
import { h } from 'vue'

describe('Padding Uniform', () => {
  test('padding: 1 applies all four sides', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; padding: 1; border: 1px solid white; background: blue; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Border at (0,0), content starts at (2,2) due to border+padding
    expect(cellText(buf, 2, 2)).toBe('T')
  })

  test('padding: 2 creates larger gap', async () => {
    const buf = await renderCSS(
      `.box { width: 15; height: 8; padding: 2; border: 1px solid white; background: blue; }`,
      h('div', { class: 'box' }, 'Content')
    )

    // Content starts at (3,3) due to border+padding
    expect(cellText(buf, 3, 3)).toBe('C')
  })

  test('padding affects text position', async () => {
    const buf = await renderCSS(
      `.box1 { width: 10; height: 3; padding: 0; background: red; }
       .box2 { width: 10; height: 3; padding: 2; background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'box1' }, 'A'),
        h('div', { class: 'box2' }, 'B')
      )
    )

    // Box1: text at (0,0)
    expect(cellText(buf, 0, 0)).toBe('A')

    // Box2: text at (2,5) due to padding
    expect(cellText(buf, 2, 5)).toBe('B')
  })

  test('padding with border', async () => {
    const buf = await renderCSS(
      `.box { width: 12; height: 5; padding: 1; border: 1px solid cyan; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Border at (0,0), padding at (1,1), content at (2,2)
    expect(cellText(buf, 0, 0)).toBe('┌') // Border corner
    expect(cellText(buf, 2, 2)).toBe('T') // Content starts here
  })
})
