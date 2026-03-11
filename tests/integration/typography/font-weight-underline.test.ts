/**
 * INT-TYPOGRAPHY: Font Weight and Text Decoration
 *
 * Tests that font-weight: bold, underline, italic apply to text correctly.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBold, cellUnderline, cellItalic } from '../helpers'
import { h } from 'vue'

describe('Font Weight', () => {
  test('font-weight: bold sets bold on text cells', async () => {
    const buf = await renderCSS(
      `.bold { font-weight: bold; width: 10; height: 1; }`,
      h('div', { class: 'bold' }, 'Bold')
    )

    expect(cellBold(buf, 0, 0)).toBe(true)
    expect(cellBold(buf, 1, 0)).toBe(true)
    expect(cellBold(buf, 2, 0)).toBe(true)
  })

  test('font-weight: 700 sets bold', async () => {
    const buf = await renderCSS(
      `.bold { font-weight: 700; width: 10; height: 1; }`,
      h('div', { class: 'bold' }, 'Bold')
    )

    expect(cellBold(buf, 0, 0)).toBe(true)
  })

  test('font-weight: 600 sets bold (>= 600)', async () => {
    const buf = await renderCSS(
      `.bold { font-weight: 600; width: 10; height: 1; }`,
      h('div', { class: 'bold' }, 'Bold')
    )

    expect(cellBold(buf, 0, 0)).toBe(true)
  })

  test('font-weight: 400 (normal) does not set bold', async () => {
    const buf = await renderCSS(
      `.normal { font-weight: 400; width: 10; height: 1; }`,
      h('div', { class: 'normal' }, 'Normal')
    )

    expect(cellBold(buf, 0, 0)).toBe(false)
  })

  test('bold: true shorthand sets bold', async () => {
    const buf = await renderCSS(
      `.bold { bold: true; width: 10; height: 1; }`,
      h('div', { class: 'bold' }, 'Bold')
    )

    expect(cellBold(buf, 0, 0)).toBe(true)
  })

  test('bold applies to entire element', async () => {
    const buf = await renderCSS(
      `.box { bold: true; width: 15; height: 1; }`,
      h('div', { class: 'box' }, 'All bold text')
    )

    for (let x = 0; x < 13; x++) {
      expect(cellBold(buf, x, 0)).toBe(true)
    }
  })
})

describe('Text Decoration - Underline', () => {
  test('text-decoration: underline sets underline on text', async () => {
    const buf = await renderCSS(
      `.underline { text-decoration: underline; width: 15; height: 1; }`,
      h('div', { class: 'underline' }, 'Underlined')
    )

    expect(cellUnderline(buf, 0, 0)).toBe(true)
    expect(cellUnderline(buf, 5, 0)).toBe(true)
  })

  test('underline: true shorthand sets underline', async () => {
    const buf = await renderCSS(
      `.underline { underline: true; width: 15; height: 1; }`,
      h('div', { class: 'underline' }, 'Underlined')
    )

    expect(cellUnderline(buf, 0, 0)).toBe(true)
  })

  test('underline applies to entire element', async () => {
    const buf = await renderCSS(
      `.box { underline: true; width: 20; height: 1; }`,
      h('div', { class: 'box' }, 'All underlined text')
    )

    for (let x = 0; x < 19; x++) {
      expect(cellUnderline(buf, x, 0)).toBe(true)
    }
  })

  test('underline stacks with bold', async () => {
    const buf = await renderCSS(
      `.styled { bold: true; underline: true; width: 10; height: 1; }`,
      h('div', { class: 'styled' }, 'Styled')
    )

    expect(cellBold(buf, 0, 0)).toBe(true)
    expect(cellUnderline(buf, 0, 0)).toBe(true)
    expect(cellBold(buf, 3, 0)).toBe(true)
    expect(cellUnderline(buf, 3, 0)).toBe(true)
  })
})

describe('Font Style - Italic', () => {
  test('font-style: italic sets italic on text', async () => {
    const buf = await renderCSS(
      `.italic { font-style: italic; width: 10; height: 1; }`,
      h('div', { class: 'italic' }, 'Italic')
    )

    expect(cellItalic(buf, 0, 0)).toBe(true)
    expect(cellItalic(buf, 2, 0)).toBe(true)
  })

  test('italic: true shorthand sets italic', async () => {
    const buf = await renderCSS(
      `.italic { italic: true; width: 10; height: 1; }`,
      h('div', { class: 'italic' }, 'Italic')
    )

    expect(cellItalic(buf, 0, 0)).toBe(true)
  })

  test('italic stacks with bold and underline', async () => {
    const buf = await renderCSS(
      `.styled { bold: true; underline: true; italic: true; width: 15; height: 1; }`,
      h('div', { class: 'styled' }, 'All styled')
    )

    expect(cellBold(buf, 0, 0)).toBe(true)
    expect(cellUnderline(buf, 0, 0)).toBe(true)
    expect(cellItalic(buf, 0, 0)).toBe(true)
  })

  test('all text styles apply across entire element', async () => {
    const buf = await renderCSS(
      `.mega { bold: true; underline: true; italic: true; color: cyan; width: 20; height: 1; }`,
      h('div', { class: 'mega' }, 'Mega styled text')
    )

    for (let x = 0; x < 16; x++) {
      expect(cellBold(buf, x, 0)).toBe(true)
      expect(cellUnderline(buf, x, 0)).toBe(true)
      expect(cellItalic(buf, x, 0)).toBe(true)
    }
  })
})
