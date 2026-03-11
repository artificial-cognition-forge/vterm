/**
 * INT-BORDER: Border Line Style
 *
 * Tests that border-style: solid (line) renders correct characters.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellText, cellColor } from '../helpers'
import { h } from 'vue'

describe('Border Line Style', () => {
  test('border: 1px solid renders line style corners', async () => {
    const buf = await renderCSS(
      `.box { border: 1px solid cyan; width: 10; height: 5; }`,
      h('div', { class: 'box' })
    )

    // Top-left corner
    expect(cellText(buf, 0, 0)).toBe('┌')
    // Top-right corner
    expect(cellText(buf, 9, 0)).toBe('┐')
    // Bottom-left corner
    expect(cellText(buf, 0, 4)).toBe('└')
    // Bottom-right corner
    expect(cellText(buf, 9, 4)).toBe('┘')
  })

  test('border line style horizontal edges', async () => {
    const buf = await renderCSS(
      `.box { border: 1px solid white; width: 10; height: 5; }`,
      h('div', { class: 'box' })
    )

    // Top edge (y=0, x=1-8)
    for (let x = 1; x < 9; x++) {
      expect(cellText(buf, x, 0)).toBe('─')
    }

    // Bottom edge (y=4, x=1-8)
    for (let x = 1; x < 9; x++) {
      expect(cellText(buf, x, 4)).toBe('─')
    }
  })

  test('border line style vertical edges', async () => {
    const buf = await renderCSS(
      `.box { border: 1px solid blue; width: 10; height: 5; }`,
      h('div', { class: 'box' })
    )

    // Left edge (x=0, y=1-3)
    for (let y = 1; y < 4; y++) {
      expect(cellText(buf, 0, y)).toBe('│')
    }

    // Right edge (x=9, y=1-3)
    for (let y = 1; y < 4; y++) {
      expect(cellText(buf, 9, y)).toBe('│')
    }
  })

  test('border color applies to all border characters', async () => {
    const buf = await renderCSS(
      `.box { border: 1px solid red; width: 8; height: 4; }`,
      h('div', { class: 'box' })
    )

    // Check corners are red
    expect(cellColor(buf, 0, 0)).toBe('red')
    expect(cellColor(buf, 7, 0)).toBe('red')
    expect(cellColor(buf, 0, 3)).toBe('red')
    expect(cellColor(buf, 7, 3)).toBe('red')

    // Check edges are red
    expect(cellColor(buf, 3, 0)).toBe('red')
    expect(cellColor(buf, 0, 1)).toBe('red')
  })

  test('content starts inside border', async () => {
    const buf = await renderCSS(
      `.box { border: 1px solid white; width: 10; height: 5; }`,
      h('div', { class: 'box' }, 'Content')
    )

    // Border at (0,0), content starts at (1,1)
    expect(cellText(buf, 1, 1)).toBe('C')
    expect(cellText(buf, 2, 1)).toBe('o')
  })

  test('nested bordered elements', async () => {
    const buf = await renderCSS(
      `.outer { border: 1px solid red; width: 15; height: 7; }
       .inner { border: 1px solid blue; width: 10; height: 4; }`,
      h(
        'div',
        { class: 'outer' },
        h('div', { class: 'inner' })
      )
    )

    // Outer border at (0,0)
    expect(cellText(buf, 0, 0)).toBe('┌')
    expect(cellColor(buf, 0, 0)).toBe('red')

    // Inner border at (1,1)
    expect(cellText(buf, 1, 1)).toBe('┌')
    expect(cellColor(buf, 1, 1)).toBe('blue')
  })

  test('border-only element (no content)', async () => {
    const buf = await renderCSS(
      `.box { border: 1px solid cyan; width: 6; height: 4; }`,
      h('div', { class: 'box' })
    )

    // Interior should be empty (spaces)
    expect(cellText(buf, 1, 1)).toBe(' ')
    expect(cellText(buf, 2, 1)).toBe(' ')
    expect(cellText(buf, 1, 2)).toBe(' ')
  })

  test('border with background fills interior', async () => {
    const buf = await renderCSS(
      `.box { border: 1px solid white; background: blue; width: 8; height: 4; }`,
      h('div', { class: 'box' })
    )

    // Border: white at corners/edges
    expect(cellColor(buf, 0, 0)).toBe('white')
    expect(cellText(buf, 0, 0)).toBe('┌')

    // Interior: blue background
    expect(cellText(buf, 1, 1)).toBe(' ')
    // Note: background is on the cell, check via cellBg helper
  })
})
