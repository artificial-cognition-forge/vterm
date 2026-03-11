/**
 * INT-VUE: Vue Reactivity and Bindings
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellText, cellBg } from '../helpers'
import { h } from 'vue'

describe('Template Expressions', () => {
  test('template binding renders computed value', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; }`,
      h('div', { class: 'box' }, 'Count: 5')
    )

    expect(cellText(buf, 0, 0)).toBe('C')
    expect(cellText(buf, 7, 0)).toBe('5')
  })

  test('multiple text nodes render in order', async () => {
    const buf = await renderCSS(
      `.box { width: 30; height: 1; }`,
      h('div', { class: 'box' }, 'First Second Third')
    )

    expect(cellText(buf, 0, 0)).toBe('F')
    expect(cellText(buf, 6, 0)).toBe('S')
    expect(cellText(buf, 13, 0)).toBe('T')
  })
})

describe('Conditional Rendering', () => {
  test('v-if true renders element', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'box' })
      )
    )

    expect(cellBg(buf, 0, 0)).toBe('blue')
  })

  test('v-if false does not render element', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; background: red; }`,
      h('div', {}) // Empty, no .box child
    )

    // Red should not appear
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 10; x++) {
        expect(cellBg(buf, x, y)).not.toBe('red')
      }
    }
  })

  test('v-if with multiple branches', async () => {
    const buf = await renderCSS(
      `.a { width: 5; height: 1; background: red; }
       .b { width: 5; height: 1; background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'b' })
      )
    )

    // Only blue should render
    expect(cellBg(buf, 0, 0)).toBe('blue')
  })
})

describe('List Rendering', () => {
  test('v-for renders multiple items', async () => {
    const buf = await renderCSS(
      `.item { width: 5; height: 1; }
       .item1 { background: red; }
       .item2 { background: blue; }
       .item3 { background: green; }`,
      h(
        'div',
        {},
        h('div', { class: 'item item1' }),
        h('div', { class: 'item item2' }),
        h('div', { class: 'item item3' })
      )
    )

    // Three items stacked vertically
    expect(cellBg(buf, 0, 0)).toBe('red')
    expect(cellBg(buf, 0, 1)).toBe('blue')
    expect(cellBg(buf, 0, 2)).toBe('green')
  })

  test('v-for with text content', async () => {
    const buf = await renderCSS(
      `.item { width: 10; height: 1; }`,
      h(
        'div',
        {},
        h('div', { class: 'item' }, 'Item1'),
        h('div', { class: 'item' }, 'Item2'),
        h('div', { class: 'item' }, 'Item3')
      )
    )

    expect(cellText(buf, 0, 0)).toBe('I')
    expect(cellText(buf, 0, 1)).toBe('I')
    expect(cellText(buf, 0, 2)).toBe('I')
  })

  test('v-for empty array renders nothing', async () => {
    const buf = await renderCSS(
      `.item { width: 5; height: 1; background: red; }`,
      h('div', {}) // No items
    )

    // Nothing should render
    for (let y = 0; y < 5; y++) {
      expect(cellBg(buf, 0, y)).not.toBe('red')
    }
  })
})

describe('Dynamic Classes', () => {
  test('dynamic class binding applies style', async () => {
    const buf = await renderCSS(
      `.active { background: green; }`,
      h('div', { class: 'active' })
    )

    expect(cellBg(buf, 0, 0)).toBe('green')
  })

  test('multiple dynamic classes', async () => {
    const buf = await renderCSS(
      `.bold { bold: true; }
       .red { color: red; }`,
      h('div', { class: 'bold red' }, 'Text')
    )

    expect(cellText(buf, 0, 0)).toBe('T')
  })
})

describe('Props and Attributes', () => {
  test('prop binding passes value', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; }`,
      h('div', { class: 'box', title: 'Tooltip' }, 'Content')
    )

    // Should render content
    expect(cellText(buf, 0, 0)).toBe('C')
  })

  test('data attributes work', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; background: blue; }`,
      h('div', { class: 'box', 'data-test': 'value' })
    )

    expect(cellBg(buf, 0, 0)).toBe('blue')
  })
})
