/**
 * CSS Compliance — Display
 * spec.md § 6
 *
 * Tests: display: flex, block, none, inline
 * Pipeline tier: layout engine (layout mode selection)
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS } from './helpers'

describe('display: none', () => {
  test('element with display: none is not rendered', async () => {
    const buf = await renderCSS(
      `.hidden { display: none; width: 20; height: 5; background: red; }
       .visible { width: 10; height: 2; background: blue; }`,
      h('div', {},
        h('div', { class: 'hidden' }),
        h('div', { class: 'visible' })
      )
    )
    // Red should never appear; blue should be at (0,0)
    expect(buf.getCell(0, 0)?.background).toBe('blue')
    // Confirm red is absent
    for (let y = 0; y < 24; y++) {
      for (let x = 0; x < 80; x++) {
        expect(buf.getCell(x, y)?.background).not.toBe('red')
      }
    }
  })

  test('display: none children are also hidden', async () => {
    const buf = await renderCSS(
      `.parent { display: none; }
       .child { width: 5; height: 2; background: red; }`,
      h('div', { class: 'parent' },
        h('div', { class: 'child' })
      )
    )
    for (let y = 0; y < 5; y++) {
      expect(buf.getCell(0, y)?.background).not.toBe('red')
    }
  })

  test('display: none element takes no space (sibling renders at same y)', async () => {
    const buf = await renderCSS(
      `.container { display: flex; flex-direction: column; width: 20; height: 10; }
       .gone { display: none; height: 5; }
       .sibling { width: 10; height: 3; background: blue; }`,
      h('div', { class: 'container' },
        h('div', { class: 'gone' }),
        h('div', { class: 'sibling' })
      )
    )
    // Sibling should start at y=0 because .gone takes no space
    expect(buf.getCell(0, 0)?.background).toBe('blue')
  })
})

describe('display: block', () => {
  test('block elements stack vertically', async () => {
    const buf = await renderCSS(
      `.a { display: block; width: 10; height: 2; background: red; }
       .b { display: block; width: 10; height: 2; background: blue; }`,
      h('div', {},
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(0, 1)?.background).toBe('red')
    expect(buf.getCell(0, 2)?.background).toBe('blue')
    expect(buf.getCell(0, 3)?.background).toBe('blue')
  })
})

describe('display: flex', () => {
  test('flex children are laid out horizontally by default (row)', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 20; height: 3; }
       .a { width: 5; height: 3; background: red; }
       .b { width: 5; height: 3; background: blue; }`,
      h('div', { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    // .a at x=0-4, .b at x=5-9
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(4, 0)?.background).toBe('red')
    expect(buf.getCell(5, 0)?.background).toBe('blue')
    expect(buf.getCell(9, 0)?.background).toBe('blue')
  })

  test('flex container with flex-direction: column stacks vertically', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; flex-direction: column; width: 10; height: 10; }
       .a { width: 10; height: 3; background: red; }
       .b { width: 10; height: 3; background: blue; }`,
      h('div', { class: 'parent' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(0, 3)?.background).toBe('blue')
  })
})
