/**
 * INT-DIMENSIONS: Fixed Dimensions
 *
 * Tests that width/height with fixed values (integers, px, em, rem) work correctly.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Fixed Dimensions', () => {
  test('width: 20 renders exactly 20 cells wide', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 1; background: blue; }`,
      h('div', { class: 'box' })
    )

    // Check all 20 cells are filled
    for (let x = 0; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
    // Cell 20 should not be blue
    expect(cellBg(buf, 20, 0)).not.toBe('blue')
  })

  test('height: 5 renders exactly 5 cells tall', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; background: green; }`,
      h('div', { class: 'box' })
    )

    // Check all 5 rows are filled
    for (let y = 0; y < 5; y++) {
      expect(cellBg(buf, 0, y)).toBe('green')
    }
    // Row 5 should not be green
    expect(cellBg(buf, 0, 5)).not.toBe('green')
  })

  test('pixel units (20px) are treated as raw cell count', async () => {
    const buf = await renderCSS(
      `.box { width: 20px; height: 3px; background: cyan; }`,
      h('div', { class: 'box' })
    )

    // 20px → 20 cells wide
    for (let x = 0; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('cyan')
    }
    // 3px → 3 cells tall
    for (let y = 0; y < 3; y++) {
      expect(cellBg(buf, 0, y)).toBe('cyan')
    }
    expect(cellBg(buf, 0, 3)).not.toBe('cyan')
  })

  test('em units are treated as raw cell count (no font-size basis)', async () => {
    const buf = await renderCSS(
      `.box { width: 15em; height: 4em; background: red; }`,
      h('div', { class: 'box' })
    )

    // 15em → 15 cells wide (unit stripped)
    for (let x = 0; x < 15; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }
    // 4em → 4 cells tall
    for (let y = 0; y < 4; y++) {
      expect(cellBg(buf, 0, y)).toBe('red')
    }
  })

  test('rem units are treated as raw cell count', async () => {
    const buf = await renderCSS(
      `.box { width: 12rem; height: 2rem; background: yellow; }`,
      h('div', { class: 'box' })
    )

    // 12rem → 12 cells wide
    for (let x = 0; x < 12; x++) {
      expect(cellBg(buf, x, 0)).toBe('yellow')
    }
  })

  test('multiple elements with different sizes stack correctly', async () => {
    const buf = await renderCSS(
      `.box1 { width: 10; height: 2; background: blue; }
       .box2 { width: 15; height: 3; background: green; }`,
      h(
        'div',
        {},
        h('div', { class: 'box1' }),
        h('div', { class: 'box2' })
      )
    )

    // First box: blue, 10 wide, 2 tall
    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 5, 1)).toBe('blue')
    expect(cellBg(buf, 9, 0)).toBe('blue')

    // Second box: green, starts at y=2, 15 wide, 3 tall
    expect(cellBg(buf, 0, 2)).toBe('green')
    expect(cellBg(buf, 14, 2)).toBe('green')
    expect(cellBg(buf, 0, 4)).toBe('green')
    expect(cellBg(buf, 0, 5)).not.toBe('green')
  })

  test('width: 0 creates invisible element', async () => {
    const buf = await renderCSS(
      `.box { width: 0; height: 5; background: blue; }`,
      h('div', { class: 'box' })
    )

    // No cells should be blue (width 0)
    for (let y = 0; y < 5; y++) {
      expect(cellBg(buf, 0, y)).not.toBe('blue')
    }
  })

  test('height: 0 creates invisible element', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 0; background: green; }`,
      h('div', { class: 'box' })
    )

    // No cells should be green (height 0)
    for (let x = 0; x < 10; x++) {
      expect(cellBg(buf, x, 0)).not.toBe('green')
    }
  })
})
