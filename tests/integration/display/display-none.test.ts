/**
 * INT-DISPLAY: Display None
 *
 * Tests that display: none hides elements and takes no space.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Display None', () => {
  test('display: none element is not rendered', async () => {
    const buf = await renderCSS(
      `.hidden { display: none; width: 20; height: 5; background: red; }
       .visible { width: 10; height: 2; background: blue; }`,
      h(
        'div',
        {},
        h('div', { class: 'hidden' }),
        h('div', { class: 'visible' })
      )
    )

    // Red should never appear
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 80; x++) {
        expect(cellBg(buf, x, y)).not.toBe('red')
      }
    }

    // Blue should appear
    expect(cellBg(buf, 0, 0)).toBe('blue')
  })

  test('display: none takes no layout space', async () => {
    const buf = await renderCSS(
      `.container { width: 30; height: 10; }
       .gone { display: none; height: 5; background: red; }
       .sibling { width: 10; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'container' },
        h('div', { class: 'gone' }),
        h('div', { class: 'sibling' })
      )
    )

    // Sibling should start at y=0 because .gone takes no space
    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 0, 1)).toBe('blue')
    // .gone's 5 rows should NOT appear
    expect(cellBg(buf, 0, 5)).not.toBe('red')
  })

  test('display: none children are also hidden', async () => {
    const buf = await renderCSS(
      `.parent { display: none; }
       .child { width: 5; height: 2; background: red; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 80; x++) {
        expect(cellBg(buf, x, y)).not.toBe('red')
      }
    }
  })

  test('display: none in middle of three siblings', async () => {
    const buf = await renderCSS(
      `.a { width: 10; height: 1; background: red; }
       .b { display: none; width: 10; height: 3; background: green; }
       .c { width: 10; height: 1; background: blue; }`,
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

    // B hidden (no space)

    // C at y=1 (immediately after A)
    expect(cellBg(buf, 0, 1)).toBe('blue')

    // Green never appears
    for (let y = 0; y < 10; y++) {
      for (let x = 0; x < 80; x++) {
        expect(cellBg(buf, x, y)).not.toBe('green')
      }
    }
  })

  test('toggle display: none via conditional rendering', async () => {
    const buf = await renderCSS(
      `.visible { width: 10; height: 1; background: blue; }`,
      h('div', {}, h('div', { class: 'visible' }, 'Shown'))
    )

    expect(cellBg(buf, 0, 0)).toBe('blue')
  })

  test('nested display: none hides entire subtree', async () => {
    const buf = await renderCSS(
      `.parent { display: none; width: 20; height: 20; background: red; }
       .level1 { width: 15; height: 15; background: green; }
       .level2 { width: 10; height: 10; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h(
          'div',
          { class: 'level1' },
          h('div', { class: 'level2' })
        )
      )
    )

    // Nothing should render
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        expect(cellBg(buf, x, y)).not.toBe('red')
        expect(cellBg(buf, x, y)).not.toBe('green')
        expect(cellBg(buf, x, y)).not.toBe('blue')
      }
    }
  })
})
