/**
 * Render Correctness — Absolute Positioning
 * spec.md § 7
 *
 * Verifies that position:absolute elements are placed at the exact (x,y)
 * coordinates determined by top/left/right/bottom relative to their
 * positioned ancestor, and that flow layout is unaffected.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS } from './helpers'

// ─── top + left ───────────────────────────────────────────────────────────────

describe('position: absolute with top and left', () => {
  test('top:2 left:5 → element top-left at (5,2)', async () => {
    const buf = await renderCSS(
      `
      .container { width: 30; height: 15; position: relative; }
      .abs { position: absolute; top: 2; left: 5; width: 4; height: 2; background: red; }
      `,
      h('div', { class: 'container' },
        h('div', { class: 'abs' })
      )
    )
    expect(buf.getCell(5, 2)?.background).toBe('red')
    expect(buf.getCell(8, 2)?.background).toBe('red')  // rightmost cell of abs
    expect(buf.getCell(5, 3)?.background).toBe('red')  // second row of abs
    // not at (0,0) or (0,2)
    expect(buf.getCell(0, 2)?.background).toBeNull()
    expect(buf.getCell(4, 2)?.background).toBeNull()
  })

  test('top:0 left:0 → element at container origin', async () => {
    const buf = await renderCSS(
      `
      .container { width: 20; height: 10; position: relative; }
      .abs { position: absolute; top: 0; left: 0; width: 3; height: 2; background: cyan; }
      `,
      h('div', { class: 'container' },
        h('div', { class: 'abs' })
      )
    )
    expect(buf.getCell(0, 0)?.background).toBe('cyan')
    expect(buf.getCell(2, 1)?.background).toBe('cyan')
  })
})

// ─── top + right ──────────────────────────────────────────────────────────────

describe('position: absolute with top and right', () => {
  test('right:0 top:0 → element flush to right edge of container', async () => {
    const buf = await renderCSS(
      `
      .container { width: 20; height: 10; position: relative; }
      .abs { position: absolute; top: 0; right: 0; width: 4; height: 2; background: magenta; }
      `,
      h('div', { class: 'container' },
        h('div', { class: 'abs' })
      )
    )
    // Container width=20, abs width=4 → x=16..19
    expect(buf.getCell(16, 0)?.background).toBe('magenta')
    expect(buf.getCell(19, 0)?.background).toBe('magenta')
    expect(buf.getCell(15, 0)?.background).toBeNull()
  })
})

// ─── bottom + left ────────────────────────────────────────────────────────────

describe('position: absolute with bottom and left', () => {
  test('bottom:0 left:0 → element flush to bottom of container', async () => {
    const buf = await renderCSS(
      `
      .container { width: 20; height: 10; position: relative; }
      .abs { position: absolute; bottom: 0; left: 0; width: 4; height: 2; background: yellow; }
      `,
      h('div', { class: 'container' },
        h('div', { class: 'abs' })
      )
    )
    // Container height=10, abs height=2 → y=8..9
    expect(buf.getCell(0, 8)?.background).toBe('yellow')
    expect(buf.getCell(0, 9)?.background).toBe('yellow')
    expect(buf.getCell(0, 7)?.background).toBeNull()
  })
})

// ─── Absolute in positioned container ────────────────────────────────────────

describe('absolute element offset relative to container, not screen', () => {
  test('container at y=5, abs top:0 → element at screen y=5', async () => {
    const buf = await renderCSS(
      `
      .wrapper { width: 30; height: 20; display: flex; flex-direction: column; }
      .spacer { height: 5; width: 30; }
      .container { position: relative; width: 20; height: 10; }
      .abs { position: absolute; top: 0; left: 0; width: 3; height: 2; background: green; }
      `,
      h('div', { class: 'wrapper' },
        h('div', { class: 'spacer' }),
        h('div', { class: 'container' },
          h('div', { class: 'abs' })
        )
      )
    )
    // Container starts at y=5; abs top:0 → screen y=5
    expect(buf.getCell(0, 5)?.background).toBe('green')
    expect(buf.getCell(0, 6)?.background).toBe('green')
    // Not at y=0 (which is outside the container)
    expect(buf.getCell(0, 0)?.background).toBeNull()
  })
})

// ─── Flow layout unaffected ───────────────────────────────────────────────────

describe('flow siblings unaffected by absolute element', () => {
  test('flow child renders at y=0 even with absolute sibling at y=0', async () => {
    const buf = await renderCSS(
      `
      .container { width: 20; height: 10; position: relative; display: flex; flex-direction: column; }
      .flow { width: 20; height: 2; background: blue; }
      .abs { position: absolute; top: 0; left: 0; width: 4; height: 2; background: red; }
      `,
      h('div', { class: 'container' },
        h('div', { class: 'flow' }),
        h('div', { class: 'abs' })
      )
    )
    // Absolute renders on top of flow in same region (last painted wins)
    // The abs should be at (0,0) overwriting flow
    expect(buf.getCell(0, 0)?.background).toBe('red')
    // Flow extends to x=19; abs is only 4 wide, so x=4..19 still has blue
    expect(buf.getCell(4, 0)?.background).toBe('blue')
    expect(buf.getCell(19, 0)?.background).toBe('blue')
  })
})
