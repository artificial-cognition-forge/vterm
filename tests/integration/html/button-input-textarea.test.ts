/**
 * INT-HTML: Button, Input, Textarea Elements
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg, cellText } from '../helpers'
import { h } from 'vue'

describe('Button Element', () => {
  test('button renders with UA blue background', async () => {
    const buf = await renderCSS(
      `button { width: 15; height: 1; }`,
      h('button', {}, 'Click me')
    )

    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 7, 0)).toBe('blue')
  })

  test('button text renders inside', async () => {
    const buf = await renderCSS(
      `button { width: 15; height: 1; }`,
      h('button', {}, 'Submit')
    )

    expect(cellText(buf, 0, 0)).toBe('S')
    expect(cellText(buf, 1, 0)).toBe('u')
    expect(cellText(buf, 2, 0)).toBe('b')
  })

  test('button with custom background overrides UA', async () => {
    const buf = await renderCSS(
      `button { width: 15; height: 1; background: green; }`,
      h('button', {}, 'Custom')
    )

    expect(cellBg(buf, 0, 0)).toBe('green')
  })
})

describe('Input Element', () => {
  test('input renders with UA grey background', async () => {
    const buf = await renderCSS(
      `input { width: 20; height: 1; }`,
      h('input')
    )

    expect(cellBg(buf, 0, 0)).toBe('grey')
  })

  test('input with placeholder displays when empty', async () => {
    const buf = await renderCSS(
      `input { width: 20; height: 1; }`,
      h('input', { placeholder: 'Enter text' })
    )

    expect(cellBg(buf, 0, 0)).toBe('grey')
  })

  test('input with value renders value', async () => {
    const buf = await renderCSS(
      `input { width: 20; height: 1; }`,
      h('input', { value: 'Hello' })
    )

    expect(cellText(buf, 0, 0)).toBe('H')
    expect(cellText(buf, 1, 0)).toBe('e')
  })

  test('input value longer than width clips', async () => {
    const buf = await renderCSS(
      `input { width: 10; height: 1; }`,
      h('input', { value: 'VeryLongText' })
    )

    // Should clip to 10 chars
    expect(cellText(buf, 9, 0)).toBe('T')
  })

  test('input with custom background overrides UA', async () => {
    const buf = await renderCSS(
      `input { width: 20; height: 1; background: white; }`,
      h('input')
    )

    expect(cellBg(buf, 0, 0)).toBe('white')
  })
})

describe('Textarea Element', () => {
  test('textarea renders with UA grey background', async () => {
    const buf = await renderCSS(
      `textarea { width: 20; height: 5; }`,
      h('textarea')
    )

    expect(cellBg(buf, 0, 0)).toBe('grey')
  })

  test('textarea with single line', async () => {
    const buf = await renderCSS(
      `textarea { width: 20; height: 5; }`,
      h('textarea', { value: 'First line' })
    )

    expect(cellText(buf, 0, 0)).toBe('F')
  })

  test('textarea with multiple lines', async () => {
    const buf = await renderCSS(
      `textarea { width: 20; height: 5; }`,
      h('textarea', { value: 'Line1\nLine2\nLine3' })
    )

    expect(cellText(buf, 0, 0)).toBe('L')
    expect(cellText(buf, 0, 1)).toBe('L')
    expect(cellText(buf, 0, 2)).toBe('L')
  })

  test('textarea lines wider than width clip', async () => {
    const buf = await renderCSS(
      `textarea { width: 10; height: 3; }`,
      h('textarea', { value: 'VeryLongLine' })
    )

    // Should clip to 10 chars width
    expect(cellText(buf, 9, 0)).toBe('e')
  })
})

describe('List Elements', () => {
  test('ul renders items vertically', async () => {
    const buf = await renderCSS(
      `li { width: 10; height: 1; }`,
      h('ul', {},
        h('li', {}, 'Item1'),
        h('li', {}, 'Item2'),
        h('li', {}, 'Item3')
      )
    )

    expect(cellText(buf, 0, 0)).toBe('I')
    expect(cellText(buf, 0, 1)).toBe('I')
    expect(cellText(buf, 0, 2)).toBe('I')
  })

  test('ol renders items vertically (no auto-numbering)', async () => {
    const buf = await renderCSS(
      `li { width: 10; height: 1; }`,
      h('ol', {},
        h('li', {}, 'First'),
        h('li', {}, 'Second')
      )
    )

    expect(cellText(buf, 0, 0)).toBe('F')
    expect(cellText(buf, 0, 1)).toBe('S')
  })

  test('li has no UA styles', async () => {
    const buf = await renderCSS(
      `li { width: 10; height: 1; }`,
      h('li', {}, 'Item')
    )

    // No background, no special color
    expect(cellBg(buf, 0, 0)).not.toBe('blue')
    expect(cellBg(buf, 0, 0)).not.toBe('grey')
  })
})
