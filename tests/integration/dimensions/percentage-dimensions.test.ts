/**
 * INT-DIMENSIONS: Percentage Dimensions
 *
 * Tests that width/height with percentage values work correctly relative to parent.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Percentage Dimensions', () => {
  test('width: 50% is half of parent width', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 40; height: 3; }
       .half { width: 50%; height: 3; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'half' }, '50%')
      )
    )

    // Parent is 40 wide, so 50% = 20 cells
    for (let x = 0; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
    // Beyond 20 should not be blue
    expect(cellBg(buf, 20, 0)).not.toBe('blue')
  })

  test('height: 100% fills parent height', async () => {
    const buf = await renderCSS(
      `.parent { width: 10; height: 10; background: white; }
       .full { width: 10; height: 100%; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'full' })
      )
    )

    // Should fill all 10 rows
    for (let y = 0; y < 10; y++) {
      expect(cellBg(buf, 0, y)).toBe('blue')
    }
    expect(cellBg(buf, 0, 10)).not.toBe('blue')
  })

  test('two 50% children divide parent width evenly', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 40; height: 3; }
       .child { width: 50%; height: 3; }
       .child1 { background: red; }
       .child2 { background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child child1' }),
        h('div', { class: 'child child2' })
      )
    )

    // First child: red, x=0-19 (20 cells)
    for (let x = 0; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }
    // Second child: blue, x=20-39 (20 cells)
    for (let x = 20; x < 40; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
  })

  test('width: 75% with parent width 40 = 30 cells', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 40; height: 2; }
       .child { width: 75%; height: 2; background: green; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // 75% of 40 = 30
    for (let x = 0; x < 30; x++) {
      expect(cellBg(buf, x, 0)).toBe('green')
    }
    expect(cellBg(buf, 30, 0)).not.toBe('green')
  })

  test('percentage respects padding', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 30; height: 5; padding: 1; }
       .child { width: 100%; height: 100%; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // Parent has padding, so child is relative to content box (30 - 2 = 28 wide)
    // Content area starts at (1, 1) due to padding
    for (let x = 1; x < 29; x++) {
      expect(cellBg(buf, x, 1)).toBe('blue')
    }
  })

  test('nested percentage calculations', async () => {
    const buf = await renderCSS(
      `.outer { width: 40; height: 5; background: white; }
       .inner { width: 50%; height: 50%; background: red; }`,
      h(
        'div',
        { class: 'outer' },
        h('div', { class: 'inner' })
      )
    )

    // Inner: 50% of 40 = 20 wide, 50% of 5 = 2.5 → 2-3 tall
    for (let x = 0; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }
  })
})
