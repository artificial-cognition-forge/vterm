/**
 * INT-LAYOUT: Sidebar + Content Layout
 *
 * Real-world pattern: fixed-width sidebar + flex content area.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Sidebar + Content Layout', () => {
  test('sidebar fixed width, content flex fills remaining', async () => {
    const buf = await renderCSS(
      `.layout { display: flex; width: 80; height: 24; }
       .sidebar { width: 20; height: 24; background: blue; }
       .content { flex: 1; height: 24; background: green; }`,
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

    // Content: x=20-79, green
    for (let x = 20; x < 80; x++) {
      expect(cellBg(buf, x, 0)).toBe('green')
    }
  })

  test('sidebar with border', async () => {
    const buf = await renderCSS(
      `.layout { display: flex; width: 80; height: 10; }
       .sidebar { width: 20; height: 10; border-right: 1px solid white; background: blue; }
       .content { flex: 1; height: 10; background: green; }`,
      h(
        'div',
        { class: 'layout' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' })
      )
    )

    // Sidebar blue
    for (let x = 0; x < 20; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }

    // Content green starts at x=20
    expect(cellBg(buf, 20, 0)).toBe('green')
  })

  test('sidebar scrollable, content scrollable independently', async () => {
    const buf = await renderCSS(
      `.layout { display: flex; width: 80; height: 10; }
       .sidebar { width: 15; height: 10; overflow: scroll; background: blue; }
       .content { flex: 1; height: 10; overflow: scroll; background: green; }`,
      h(
        'div',
        { class: 'layout' },
        h(
          'div',
          { class: 'sidebar' },
          h('div', {}, 'Item1'),
          h('div', {}, 'Item2'),
          h('div', {}, 'Item3'),
          h('div', {}, 'Item4'),
          h('div', {}, 'Item5')
        ),
        h(
          'div',
          { class: 'content' },
          h('div', {}, 'Content...'),
          h('div', {}, 'More...'),
          h('div', {}, 'Even more...')
        )
      )
    )

    // Both sections render independently
    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 15, 0)).toBe('green')
  })

  test('sidebar items with padding', async () => {
    const buf = await renderCSS(
      `.layout { display: flex; width: 40; height: 8; }
       .sidebar { width: 15; height: 8; background: blue; }
       .item { width: 15; height: 1; padding: 1; background: blue; }`,
      h(
        'div',
        { class: 'layout' },
        h('div', { class: 'sidebar' }, h('div', { class: 'item' }, 'Item'))
      )
    )

    // Sidebar fills left side
    for (let x = 0; x < 15; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
  })

  test('three-column layout', async () => {
    const buf = await renderCSS(
      `.layout { display: flex; width: 60; height: 5; }
       .left { width: 15; height: 5; background: red; }
       .center { flex: 1; height: 5; background: green; }
       .right { width: 15; height: 5; background: blue; }`,
      h(
        'div',
        { class: 'layout' },
        h('div', { class: 'left' }),
        h('div', { class: 'center' }),
        h('div', { class: 'right' })
      )
    )

    // Left: x=0-14 red
    for (let x = 0; x < 15; x++) {
      expect(cellBg(buf, x, 0)).toBe('red')
    }

    // Center: x=15-44 green
    for (let x = 15; x < 45; x++) {
      expect(cellBg(buf, x, 0)).toBe('green')
    }

    // Right: x=45-59 blue
    for (let x = 45; x < 60; x++) {
      expect(cellBg(buf, x, 0)).toBe('blue')
    }
  })
})
