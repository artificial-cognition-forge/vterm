/**
 * INT-TEXT-ALIGN: Text Alignment Properties
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellText, findFirstCharInRow, findLastCharInRow } from '../helpers'
import { h } from 'vue'

describe('Horizontal Text Alignment', () => {
  test('text-align: left (default) aligns to left', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; text-align: left; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Should start at x=0
    expect(cellText(buf, 0, 0)).toBe('T')
    expect(cellText(buf, 1, 0)).toBe('e')
    expect(cellText(buf, 2, 0)).toBe('x')
    expect(cellText(buf, 3, 0)).toBe('t')
  })

  test('text-align: center centers text', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; text-align: center; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // "Text" is 4 chars, 20-wide box → starts at (20-4)/2 = 8
    expect(cellText(buf, 8, 0)).toBe('T')
    expect(cellText(buf, 9, 0)).toBe('e')
    expect(cellText(buf, 10, 0)).toBe('x')
    expect(cellText(buf, 11, 0)).toBe('t')
  })

  test('text-align: right aligns to right', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; text-align: right; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // "Text" ends at x=19, so starts at 19-4+1=16
    expect(cellText(buf, 16, 0)).toBe('T')
    expect(cellText(buf, 17, 0)).toBe('e')
    expect(cellText(buf, 18, 0)).toBe('x')
    expect(cellText(buf, 19, 0)).toBe('t')
  })

  test('text-align: left with padding', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; padding-left: 3; text-align: left; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Content area starts at x=3, text aligns left there
    expect(cellText(buf, 3, 0)).toBe('T')
  })

  test('text-align: center with padding', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; padding: 0 3; text-align: center; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Content area is 14 wide (20 - 6 padding), text centered there
    // "Text" 4 chars → centered in 14 = starts at 3 + (14-4)/2 = 8
    expect(cellText(buf, 8, 0)).toBe('T')
  })
})

describe('Vertical Text Alignment', () => {
  test('vertical-align: top (default) aligns to top', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; vertical-align: top; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Text at top row (y=0)
    expect(cellText(buf, 0, 0)).toBe('T')
    expect(cellText(buf, 0, 1)).not.toBe('T')
  })

  test('vertical-align: middle centers vertically', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; vertical-align: middle; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Container 5 tall, text 1 tall → center at y=2
    expect(cellText(buf, 0, 2)).toBe('T')
    expect(cellText(buf, 0, 0)).not.toBe('T')
    expect(cellText(buf, 0, 4)).not.toBe('T')
  })

  test('vertical-align: bottom aligns to bottom', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; vertical-align: bottom; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Text at bottom row (y=4)
    expect(cellText(buf, 0, 4)).toBe('T')
    expect(cellText(buf, 0, 3)).not.toBe('T')
  })

  test('vertical-align respects padding', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 7; padding: 1; vertical-align: middle; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Content area is 5 tall (7 - 2 padding), text centered there
    // Text 1 tall → center at 1 + (5-1)/2 = 3
    expect(cellText(buf, 0, 3)).toBe('T')
  })

  test('vertical-align: top with padding', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; padding-top: 2; vertical-align: top; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Text starts at y=2 (padding-top)
    expect(cellText(buf, 0, 2)).toBe('T')
  })
})

describe('Combined Alignment', () => {
  test('text-align: center + vertical-align: middle', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 5; text-align: center; vertical-align: middle; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // "Text" centered horizontally at x=8, vertically at y=2
    expect(cellText(buf, 8, 2)).toBe('T')
  })

  test('text-align: right + vertical-align: bottom', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 5; text-align: right; vertical-align: bottom; }`,
      h('div', { class: 'box' }, 'Text')
    )

    // Right-aligned at x=16, bottom-aligned at y=4
    expect(cellText(buf, 16, 4)).toBe('T')
  })
})
