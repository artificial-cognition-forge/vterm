/**
 * INT-EDGE: Empty Containers and Zero Dimensions
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg, hasContent } from '../helpers'
import { h } from 'vue'

describe('Empty Containers', () => {
  test('empty container with background fills area', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; background: blue; }`,
      h('div', { class: 'box' })
    )

    // Should fill entire area with blue
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 10; x++) {
        expect(cellBg(buf, x, y)).toBe('blue')
      }
    }
  })

  test('empty container with border renders', async () => {
    const buf = await renderCSS(
      `.box { width: 8; height: 4; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )

    // Border should render
    expect(cellBg(buf, 0, 0)).not.toBeNull()
    // Interior should be empty (spaces)
    expect(cellBg(buf, 1, 1)).not.toBe('blue')
  })

  test('empty container with padding still applies', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; padding: 2; background: green; }`,
      h('div', { class: 'box' })
    )

    // Entire box filled with green (padding doesn't create gaps with no content)
    for (let x = 0; x < 10; x++) {
      expect(cellBg(buf, x, 0)).toBe('green')
    }
  })
})

describe('Zero Dimensions', () => {
  test('width: 0 creates invisible element', async () => {
    const buf = await renderCSS(
      `.box { width: 0; height: 5; background: red; }`,
      h('div', { class: 'box' })
    )

    // No content should be rendered
    expect(hasContent(buf, 0, 0, 1, 5)).toBe(false)
  })

  test('height: 0 creates invisible element', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 0; background: blue; }`,
      h('div', { class: 'box' })
    )

    // No content should be rendered
    expect(hasContent(buf, 0, 0, 10, 1)).toBe(false)
  })

  test('width: 0 takes no layout space (sibling adjacent)', async () => {
    const buf = await renderCSS(
      `.a { width: 0; height: 2; background: red; }
       .b { width: 5; height: 2; background: blue; }`,
      h(
        'div',
        { style: 'display: flex; width: 20; height: 2;' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      )
    )

    // B should start at x=0 (A takes no space)
    expect(cellBg(buf, 0, 0)).toBe('blue')
  })

  test('very small dimensions', async () => {
    const buf = await renderCSS(
      `.box { width: 1; height: 1; background: green; }`,
      h('div', { class: 'box' })
    )

    // Single cell
    expect(cellBg(buf, 0, 0)).toBe('green')
    expect(cellBg(buf, 1, 0)).not.toBe('green')
  })
})

describe('Long Text and Unicode', () => {
  test('very long text clips at width', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'VeryLongTextThatExceedsWidth')
    )

    // Text clipped to 10 chars
    expect(cellBg(buf, 0, 0)).not.toBeNull()
    expect(cellBg(buf, 9, 0)).not.toBeNull()
    expect(cellBg(buf, 10, 0)).toBeNull()
  })

  test('unicode characters render', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; }`,
      h('div', { class: 'box' }, 'Hello α β γ δ')
    )

    // Should render (may have spacing issues depending on terminal support)
    expect(cellBg(buf, 0, 0)).not.toBeNull()
  })

  test('box-drawing characters in text', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; }`,
      h('div', { class: 'box' }, '┌─┬─┐')
    )

    // Box chars should render
    expect(cellBg(buf, 0, 0)).not.toBeNull()
  })
})
