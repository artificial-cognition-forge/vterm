/**
 * INT-DIMENSIONS: calc() Expressions
 *
 * Tests that calc() expressions resolve correctly at layout time.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('calc() Dimensions', () => {
  test('calc(100% - 10) subtracts correctly', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 50; height: 3; }
       .sidebar { width: 10; height: 3; background: red; }
       .content { width: calc(100% - 10); height: 3; background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' })
      )
    )

    // Sidebar: 10 cells at x=0-9 (red)
    for (let x = 0; x < 10; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }

    // Content: 40 cells at x=10-49 (calc(50 - 10) = 40)
    for (let x = 10; x < 50; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
  })

  test('calc(50% + 5) adds correctly', async () => {
    const buf = await renderCSS(
      `.parent { width: 40; height: 3; display: flex; }
       .child { width: calc(50% + 5); height: 3; background: green; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // 50% of 40 = 20, plus 5 = 25
    for (let x = 0; x < 25; x++) {
      expect(cellBg(buf, x, 0)).toBe('green')
    }
    expect(cellBg(buf, 25, 0)).not.toBe('green')
  })

  test('calc(100% / 2) divides correctly', async () => {
    const buf = await renderCSS(
      `.parent { width: 30; height: 3; display: flex; }
       .child { width: calc(100% / 2); height: 3; background: cyan; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // 100% / 2 = 30 / 2 = 15
    for (let x = 0; x < 15; x++) {
      expect(cellBg(buf, x, 0)).toBe('cyan')
    }
    expect(cellBg(buf, 15, 0)).not.toBe('cyan')
  })

  test('calc() in height works', async () => {
    const buf = await renderCSS(
      `.parent { width: 10; height: 20; }
       .top { width: 10; height: 5; background: red; }
       .bottom { width: 10; height: calc(100% - 5); background: blue; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'top' }),
        h('div', { class: 'bottom' })
      )
    )

    // Top: 5 rows (0-4) red
    for (let y = 0; y < 5; y++) {
      expect(cellBg(buf, 0, y)).toBe('red')
    }

    // Bottom: 15 rows (5-19) blue (calc(20 - 5) = 15)
    for (let y = 5; y < 20; y++) {
      expect(cellBg(buf, 0, y)).toBe('blue')
    }
  })

  test('calc() with negative values', async () => {
    const buf = await renderCSS(
      `.parent { width: 40; height: 3; display: flex; }
       .child { width: calc(100% - 15); height: 3; background: yellow; }`,
      h(
        'div',
        { class: 'parent' },
        h('div', { class: 'child' })
      )
    )

    // 100% - 15 = 40 - 15 = 25
    for (let x = 0; x < 25; x++) {
      expect(cellBg(buf, x, 0)).toBe('yellow')
    }
  })

  test('calc() in sidebar + content layout', async () => {
    const buf = await renderCSS(
      `.layout { display: flex; width: 80; height: 10; }
       .sidebar { width: 20; height: 10; background: blue; }
       .content { width: calc(100% - 20); height: 10; background: green; }`,
      h(
        'div',
        { class: 'layout' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' })
      )
    )

    // Sidebar: x=0-19, blue
    for (let x = 0; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }

    // Content: x=20-79, green (calc(80 - 20) = 60)
    for (let x = 20; x < 80; x++) {
      expect(cellBg(buf, x, 0)).toBe('green')
    }
  })
})
