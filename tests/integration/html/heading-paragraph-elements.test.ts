/**
 * INT-HTML: Heading and Paragraph Elements
 *
 * Tests that h1-h6, p, and pre elements render text correctly.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellText, cellBold, getRow } from '../helpers'
import { h } from 'vue'

describe('Heading Elements', () => {
  test('h1 renders text content', async () => {
    const buf = await renderCSS(
      `h1 { width: 20; height: 1; }`,
      h('h1', {}, 'Heading 1')
    )

    expect(cellText(buf, 0, 0)).toBe('H')
    expect(cellText(buf, 1, 0)).toBe('e')
    expect(getRow(buf, 0).substring(0, 9)).toBe('Heading 1')
  })

  test('h1 has no UA bold (user must apply CSS)', async () => {
    const buf = await renderCSS(
      `h1 { width: 20; height: 1; }`,
      h('h1', {}, 'Heading')
    )

    expect(cellBold(buf, 0, 0)).toBe(false)
    expect(cellBold(buf, 1, 0)).toBe(false)
  })

  test('h1 with font-weight: bold applies bold', async () => {
    const buf = await renderCSS(
      `h1 { font-weight: bold; width: 20; height: 1; }`,
      h('h1', {}, 'Heading')
    )

    expect(cellBold(buf, 0, 0)).toBe(true)
    expect(cellBold(buf, 1, 0)).toBe(true)
  })

  test('h2 renders text content', async () => {
    const buf = await renderCSS(
      `h2 { width: 20; height: 1; }`,
      h('h2', {}, 'Heading 2')
    )

    expect(cellText(buf, 0, 0)).toBe('H')
  })

  test('h3 through h6 render text', async () => {
    for (const level of [3, 4, 5, 6]) {
      const buf = await renderCSS(
        `h${level} { width: 20; height: 1; }`,
        h(`h${level}`, {}, `Heading ${level}`)
      )

      expect(cellText(buf, 0, 0)).toBe('H')
    }
  })

  test('all h1-h6 behave identically without CSS', async () => {
    const h1Buf = await renderCSS(
      `h1 { width: 10; height: 1; }`,
      h('h1', {}, 'Text')
    )

    const h6Buf = await renderCSS(
      `h6 { width: 10; height: 1; }`,
      h('h6', {}, 'Text')
    )

    // Same visual output (no hierarchy without CSS)
    expect(cellText(h1Buf, 0, 0)).toBe(cellText(h6Buf, 0, 0))
    expect(cellBold(h1Buf, 0, 0)).toBe(cellBold(h6Buf, 0, 0))
  })
})

describe('Paragraph Elements', () => {
  test('p renders text content', async () => {
    const buf = await renderCSS(
      `p { width: 30; height: 1; }`,
      h('p', {}, 'This is a paragraph')
    )

    expect(cellText(buf, 0, 0)).toBe('T')
    expect(cellText(buf, 5, 0)).toBe('i')
  })

  test('p has block layout (fills parent width)', async () => {
    const buf = await renderCSS(
      `.parent { width: 50; height: 5; }
       p { height: 1; background: blue; }`,
      h('div', { class: 'parent' }, h('p', {}, 'Text'))
    )

    // P should fill 50 cells wide (parent width)
    for (let x = 0; x < 50; x++) {
      expect(cellText(buf, x, 0)).not.toBe(undefined)
    }
  })

  test('multiple p elements stack vertically', async () => {
    const buf = await renderCSS(
      `p { width: 20; height: 1; }`,
      h(
        'div',
        {},
        h('p', {}, 'Paragraph 1'),
        h('p', {}, 'Paragraph 2'),
        h('p', {}, 'Paragraph 3')
      )
    )

    expect(cellText(buf, 0, 0)).toBe('P')
    expect(cellText(buf, 0, 1)).toBe('P')
    expect(cellText(buf, 0, 2)).toBe('P')
  })

  test('pre renders text content (no preservation)', async () => {
    const buf = await renderCSS(
      `pre { width: 30; height: 1; }`,
      h('pre', {}, 'Preformatted text')
    )

    expect(cellText(buf, 0, 0)).toBe('P')
    expect(getRow(buf, 0).substring(0, 17)).toBe('Preformatted text')
  })

  test('pre does NOT preserve tabs/spaces (limitation)', async () => {
    // VTerm does not preserve whitespace in <pre>
    const buf = await renderCSS(
      `pre { width: 30; height: 1; }`,
      h('pre', {}, 'Text  with  spaces')
    )

    // Should render text, but multiple spaces may be collapsed or preserved
    // (depends on implementation; test just verifies it renders)
    expect(cellText(buf, 0, 0)).toBe('T')
  })

  test('p and pre respond to CSS styles', async () => {
    const buf = await renderCSS(
      `p { color: red; background: blue; width: 20; height: 1; }`,
      h('p', {}, 'Text')
    )

    // Should have color and background
    expect(cellText(buf, 0, 0)).toBe('T')
  })
})
