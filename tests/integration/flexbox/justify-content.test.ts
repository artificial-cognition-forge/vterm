/**
 * INT-FLEXBOX: Justify Content
 *
 * Tests that justify-content property distributes space on main axis.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg, findFirstCharInRow, findLastCharInRow } from '../helpers'
import { h } from 'vue'

describe('Justify Content', () => {
  test('justify-content: flex-start (default) aligns children to start', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; justify-content: flex-start; width: 40; height: 2; }
       .child { width: 10; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // Child should start at x=0
    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 9, 0)).toBe('blue')
    expect(cellBg(buf, 10, 0)).not.toBe('blue')
  })

  test('justify-content: flex-end aligns children to end', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; justify-content: flex-end; width: 40; height: 2; }
       .child { width: 10; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // Child should end at x=39 (40-wide container)
    expect(cellBg(buf, 30, 0)).toBe('blue')
    expect(cellBg(buf, 39, 0)).toBe('blue')
    expect(cellBg(buf, 29, 0)).not.toBe('blue')
  })

  test('justify-content: center centers children', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; justify-content: center; width: 40; height: 2; }
       .child { width: 10; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // 40-wide container, 10-wide child → child starts at (40-10)/2 = 15
    expect(cellBg(buf, 15, 0)).toBe('blue')
    expect(cellBg(buf, 24, 0)).toBe('blue')
    expect(cellBg(buf, 14, 0)).not.toBe('blue')
    expect(cellBg(buf, 25, 0)).not.toBe('blue')
  })

  test('justify-content: space-between distributes equal space between items', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; justify-content: space-between; width: 40; height: 2; }
       .child { width: 5; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' }, 'A'),
        h('div', { class: 'child' }, 'B'),
        h('div', { class: 'child' }, 'C')
      )
    )

    // 3 children × 5 = 15 cells, 40 - 15 = 25 cells for gaps
    // Between 3 items: 2 gaps of 25/2 = 12 each
    // Child 1: x=0-4
    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 4, 0)).toBe('blue')

    // Gap of 12
    // Child 2: x=17-21
    expect(cellBg(buf, 17, 0)).toBe('blue')
    expect(cellBg(buf, 21, 0)).toBe('blue')

    // Gap of 12
    // Child 3: x=34-38
    expect(cellBg(buf, 34, 0)).toBe('blue')
    expect(cellBg(buf, 38, 0)).toBe('blue')
  })

  test('justify-content: space-around distributes equal space around items', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; justify-content: space-around; width: 36; height: 2; }
       .child { width: 4; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' }),
        h('div', { class: 'child' })
      )
    )

    // 2 children × 4 = 8, 36 - 8 = 28 for gaps
    // space-around: 4 gaps (before 1st, between, after 2nd) → 28/4 = 7 each
    // Gap of 7, child 1, gap of 7, gap of 7, child 2, gap of 7

    // Child 1: x=7-10
    expect(cellBg(buf, 7, 0)).toBe('blue')
    expect(cellBg(buf, 10, 0)).toBe('blue')

    // Child 2: x=21-24
    expect(cellBg(buf, 21, 0)).toBe('blue')
    expect(cellBg(buf, 24, 0)).toBe('blue')
  })

  test('justify-content: space-evenly distributes equal space including edges', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; justify-content: space-evenly; width: 33; height: 2; }
       .child { width: 3; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' }),
        h('div', { class: 'child' })
      )
    )

    // 2 children × 3 = 6, 33 - 6 = 27 for gaps
    // space-evenly: 3 gaps (before, between, after) → 27/3 = 9 each

    // Gap of 9, child 1, gap of 9, child 2, gap of 9
    // Child 1: x=9-11
    expect(cellBg(buf, 9, 0)).toBe('blue')
    expect(cellBg(buf, 11, 0)).toBe('blue')

    // Child 2: x=21-23
    expect(cellBg(buf, 21, 0)).toBe('blue')
    expect(cellBg(buf, 23, 0)).toBe('blue')
  })
})
