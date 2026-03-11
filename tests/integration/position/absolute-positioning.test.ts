/**
 * INT-POSITION: Absolute Positioning
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellBg } from '../helpers'
import { h } from 'vue'

describe('Absolute Positioning', () => {
  test('position: absolute at top-left', async () => {
    const buf = await renderCSS(
      `.container { position: relative; width: 30; height: 10; background: white; }
       .abs { position: absolute; top: 2; left: 5; width: 5; height: 2; background: blue; }`,
      h('div', { class: 'container' }, h('div', { class: 'abs' }))
    )

    // Absolute at (5, 2)
    expect(cellBg(buf, 5, 2)).toBe('blue')
    expect(cellBg(buf, 4, 2)).not.toBe('blue')
  })

  test('position: absolute with right and top', async () => {
    const buf = await renderCSS(
      `.container { position: relative; width: 30; height: 10; background: white; }
       .abs { position: absolute; top: 1; right: 0; width: 5; height: 2; background: red; }`,
      h('div', { class: 'container' }, h('div', { class: 'abs' }))
    )

    // Right-aligned: element ends at x=29 (container width - 1)
    // So starts at x=24 (29 - 5)
    expect(cellBg(buf, 25, 1)).toBe('red')
  })

  test('position: absolute with bottom and left', async () => {
    const buf = await renderCSS(
      `.container { position: relative; width: 30; height: 10; background: white; }
       .abs { position: absolute; bottom: 0; left: 2; width: 5; height: 2; background: green; }`,
      h('div', { class: 'container' }, h('div', { class: 'abs' }))
    )

    // Bottom-aligned: element ends at y=9 (container height - 1)
    // So starts at y=8 (9 - 2)
    expect(cellBg(buf, 2, 8)).toBe('green')
  })

  test('absolute element removes from flow', async () => {
    const buf = await renderCSS(
      `.container { width: 30; height: 10; }
       .abs { position: absolute; top: 0; left: 0; width: 5; height: 3; background: blue; }
       .flow { width: 10; height: 2; background: red; }`,
      h(
        'div',
        { class: 'container' },
        h('div', { class: 'abs' }),
        h('div', { class: 'flow' })
      )
    )

    // Absolute positioned element
    expect(cellBg(buf, 0, 0)).toBe('blue')

    // Flow element should still start at y=0 (not affected by absolute)
    expect(cellBg(buf, 0, 0)).toBe('blue') // Overlapped by absolute
  })

  test('absolute renders on top of flow content', async () => {
    const buf = await renderCSS(
      `.container { position: relative; width: 30; height: 10; }
       .flow { width: 30; height: 5; background: red; }
       .abs { position: absolute; top: 2; left: 5; width: 10; height: 2; background: blue; }`,
      h(
        'div',
        { class: 'container' },
        h('div', { class: 'flow' }),
        h('div', { class: 'abs' })
      )
    )

    // Flow content: red at y=0-4
    expect(cellBg(buf, 0, 0)).toBe('red')

    // Absolute on top: blue at y=2-3
    expect(cellBg(buf, 5, 2)).toBe('blue')
  })

  test('absolute positioned relative to nearest positioned ancestor', async () => {
    const buf = await renderCSS(
      `.outer { position: relative; width: 30; height: 10; background: white; }
       .inner { width: 20; height: 8; background: white; }
       .abs { position: absolute; top: 1; left: 2; width: 5; height: 2; background: green; }`,
      h(
        'div',
        { class: 'outer' },
        h('div', { class: 'inner' }, h('div', { class: 'abs' }))
      )
    )

    // Absolute positioned relative to .outer (positioned ancestor)
    expect(cellBg(buf, 2, 1)).toBe('green')
  })
})
