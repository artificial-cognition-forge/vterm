/**
 * INT-HTML: Container Elements
 *
 * Tests that semantic container elements (div, section, article, header, etc.)
 * all behave identically and support basic content/nesting.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg, cellText } from '../helpers'
import { h } from 'vue'

describe('Container Elements', () => {
  test('div renders as block container', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 3; background: blue; }`,
      h('div', { class: 'box' })
    )

    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 9, 2)).toBe('blue')
  })

  test('section renders identically to div', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 3; background: blue; }`,
      h('section', { class: 'box' })
    )

    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 9, 2)).toBe('blue')
  })

  test('article renders identically to div', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 3; background: blue; }`,
      h('article', { class: 'box' })
    )

    expect(cellBg(buf, 0, 0)).toBe('blue')
  })

  test('header renders identically to div', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; background: cyan; }`,
      h('header', { class: 'box' }, 'Header')
    )

    expect(cellBg(buf, 0, 0)).toBe('cyan')
    expect(cellText(buf, 0, 0)).toBe('H')
  })

  test('footer renders identically to div', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; background: green; }`,
      h('footer', { class: 'box' }, 'Footer')
    )

    expect(cellBg(buf, 0, 0)).toBe('green')
  })

  test('main renders identically to div', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 5; background: yellow; }`,
      h('main', { class: 'box' })
    )

    expect(cellBg(buf, 0, 0)).toBe('yellow')
    expect(cellBg(buf, 19, 4)).toBe('yellow')
  })

  test('nav renders identically to div', async () => {
    const buf = await renderCSS(
      `.box { width: 15; height: 2; background: red; }`,
      h('nav', { class: 'box' })
    )

    expect(cellBg(buf, 0, 0)).toBe('red')
  })

  test('aside renders identically to div', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 10; background: magenta; }`,
      h('aside', { class: 'box' })
    )

    expect(cellBg(buf, 0, 0)).toBe('magenta')
  })

  test('container elements can be nested', async () => {
    const buf = await renderCSS(
      `.outer { width: 20; height: 8; background: blue; }
       .inner { width: 10; height: 4; background: green; }`,
      h(
        'section',
        { class: 'outer' },
        h('article', { class: 'inner' })
      )
    )

    // Outer blue at corners
    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 19, 7)).toBe('blue')

    // Inner green nested inside
    expect(cellBg(buf, 0, 0)).toBe('green') // Inner overlaps outer top-left
  })

  test('containers render text content', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 2; }`,
      h('div', { class: 'box' }, 'Hello World')
    )

    expect(cellText(buf, 0, 0)).toBe('H')
    expect(cellText(buf, 1, 0)).toBe('e')
    expect(cellText(buf, 2, 0)).toBe('l')
    expect(cellText(buf, 3, 0)).toBe('l')
    expect(cellText(buf, 4, 0)).toBe('o')
  })

  test('containers with no UA styles', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; }`,
      h('div', { class: 'box' })
    )

    // Should have no background by default
    expect(cellBg(buf, 0, 0)).not.toBe('blue')
    expect(cellBg(buf, 0, 0)).not.toBe('grey')

    // Should have no text color
    expect(cellText(buf, 0, 0)).toBe(' ')
  })

  test('semantic elements respond to CSS classes same as div', async () => {
    const divBuf = await renderCSS(
      `.highlight { background: red; width: 10; height: 2; }`,
      h('div', { class: 'highlight' })
    )

    const sectionBuf = await renderCSS(
      `.highlight { background: red; width: 10; height: 2; }`,
      h('section', { class: 'highlight' })
    )

    // Both should have same rendering
    expect(cellBg(divBuf, 0, 0)).toBe(cellBg(sectionBuf, 0, 0))
  })
})
