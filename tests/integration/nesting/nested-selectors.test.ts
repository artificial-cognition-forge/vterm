/**
 * INT-NESTING: CSS Nesting and Ampersand Reference
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg, cellColor, cellText } from '../helpers'
import { h } from 'vue'

describe('CSS Nesting', () => {
  test('nested selectors expand correctly', async () => {
    const buf = await renderCSS(
      `.parent {
        width: 20;
        height: 5;
        background: blue;
        .child {
          width: 10;
          height: 2;
          background: green;
        }
      }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )

    // Parent blue
    expect(cellBg(buf, 0, 0)).toBe('blue')

    // Child green (nested inside)
    expect(cellBg(buf, 0, 0)).toBe('green')
  })

  test('ampersand (&) parent reference', async () => {
    const buf = await renderCSS(
      `button {
        width: 10;
        height: 1;
        background: blue;
        &:hover {
          background: green;
        }
      }`,
      h('button', {}, 'Click')
    )

    // Base state: blue
    expect(cellBg(buf, 0, 0)).toBe('blue')
  })

  test('& with class selector', async () => {
    const buf = await renderCSS(
      `.btn {
        width: 10;
        height: 1;
        background: blue;
        &.active {
          background: red;
        }
      }`,
      h('div', { class: 'btn active' })
    )

    // With .active class, should be red
    expect(cellBg(buf, 0, 0)).toBe('red')
  })

  test('& with descendant combinator', async () => {
    const buf = await renderCSS(
      `.container {
        width: 20;
        height: 5;
        background: white;
        & .item {
          width: 10;
          height: 1;
          background: blue;
        }
      }`,
      h('div', { class: 'container' }, h('div', { class: 'item' }))
    )

    // Item should be blue
    expect(cellBg(buf, 0, 0)).toBe('blue')
  })

  test('deep nesting with multiple levels', async () => {
    const buf = await renderCSS(
      `.outer {
        width: 20;
        height: 10;
        background: red;
        .middle {
          width: 15;
          height: 8;
          background: green;
          .inner {
            width: 10;
            height: 4;
            background: blue;
          }
        }
      }`,
      h(
        'div',
        { class: 'outer' },
        h('div', { class: 'middle' }, h('div', { class: 'inner' }))
      )
    )

    // Inner blue (innermost)
    expect(cellBg(buf, 0, 0)).toBe('blue')
  })

  test('& in multiple selectors', async () => {
    const buf = await renderCSS(
      `.box {
        width: 15;
        height: 3;
        background: blue;
        &:hover,
        &:focus {
          background: green;
        }
      }`,
      h('div', { class: 'box' })
    )

    // Base state: blue
    expect(cellBg(buf, 0, 0)).toBe('blue')
  })
})
