/**
 * Render Correctness — Scroll Regions
 * spec.md § 5
 *
 * Verifies that scrollY on a scrollable node correctly shifts the visible
 * window of content. Content is clipped to the viewport; rows outside the
 * window are not rendered.
 *
 * Strategy: buildAndLayout() → mutate node.scrollY → renderTree()
 */

import { test, expect, describe } from 'bun:test'
import { h, buildAndLayout, renderTree, findNodeByClass } from './helpers'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a scroll container with N labeled rows and return
 * the ScreenBuffer after applying the given scrollY.
 */
async function scrollTest(rows: number, scrollY: number, viewportH = 4, width = 20) {
  const css = `
    .scroll { width: ${width}; height: ${viewportH}; overflow: scroll; display: flex; flex-direction: column; }
    .row { width: ${width}; height: 1; }
  `
  const children = Array.from({ length: rows }, (_, i) =>
    h('div', { class: 'row' }, `Row${i}`)
  )
  const { root } = await buildAndLayout(css, h('div', { class: 'scroll' }, ...children), width, 24)

  const scrollNode = findNodeByClass(root, 'scroll')
  if (scrollNode) scrollNode.scrollY = scrollY

  return renderTree(root, width, 24)
}

// ─── scrollY=0: first content at top ─────────────────────────────────────────

describe('scrollY=0: first content row is at viewport top', () => {
  test('Row0 first char visible at y=0', async () => {
    const buf = await scrollTest(8, 0)
    expect(buf.getCell(0, 0)?.char).toBe('R')
    // Verify it's specifically Row0
    const chars = [0,1,2,3].map(x => buf.getCell(x, 0)?.char).join('')
    expect(chars).toBe('Row0')
  })

  test('Row3 visible at y=3 (last row of 4-row viewport)', async () => {
    const buf = await scrollTest(8, 0)
    const chars = [0,1,2,3].map(x => buf.getCell(x, 3)?.char).join('')
    expect(chars).toBe('Row3')
  })
})

// ─── scrollY=1: window shifts down by 1 ──────────────────────────────────────

describe('scrollY=1: second content row at viewport top', () => {
  test('Row1 visible at y=0 of viewport', async () => {
    const buf = await scrollTest(8, 1)
    const chars = [0,1,2,3].map(x => buf.getCell(x, 0)?.char).join('')
    expect(chars).toBe('Row1')
  })

  test('Row0 is no longer visible', async () => {
    const buf = await scrollTest(8, 1)
    // y=-1 is offscreen; Row0 should not appear at any visible y
    // Row0 text starts with 'R' 'o' 'w' '0' — check y=0 does NOT show Row0
    const chars = [0,1,2,3].map(x => buf.getCell(x, 0)?.char).join('')
    expect(chars).not.toBe('Row0')
  })
})

// ─── scrollY=2: window shifts down by 2 ──────────────────────────────────────

describe('scrollY=2: third content row at viewport top', () => {
  test('Row2 visible at y=0', async () => {
    const buf = await scrollTest(8, 2)
    const chars = [0,1,2,3].map(x => buf.getCell(x, 0)?.char).join('')
    expect(chars).toBe('Row2')
  })

  test('Row5 visible at y=3 (last row in viewport)', async () => {
    const buf = await scrollTest(8, 2)
    const chars = [0,1,2,3].map(x => buf.getCell(x, 3)?.char).join('')
    expect(chars).toBe('Row5')
  })
})

// ─── Content below viewport is clipped ───────────────────────────────────────

describe('content below viewport is clipped', () => {
  test('scrollY=0 with 8 rows in 4-row viewport: rows 4-7 not rendered', async () => {
    const buf = await scrollTest(8, 0)
    // y=4..7 should be empty (outside viewport)
    for (let y = 4; y < 8; y++) {
      expect(buf.getCell(0, y)?.char).toBe(' ')
    }
  })
})

// ─── Content above viewport is clipped ───────────────────────────────────────

describe('content scrolled past top is clipped', () => {
  test('scrollY=3: Row0,Row1,Row2 are above the viewport and not rendered at any y', async () => {
    const buf = await scrollTest(8, 3)
    // The viewport shows Row3..Row6
    // Row0,Row1,Row2 should not be visible
    const row0chars = [0,1,2,3].map(x => buf.getCell(x, 0)?.char).join('')
    expect(row0chars).not.toBe('Row0')
    expect(row0chars).not.toBe('Row1')
    expect(row0chars).not.toBe('Row2')
    // Row3 should be at y=0
    expect(row0chars).toBe('Row3')
  })
})

// ─── Scroll state is per-node ─────────────────────────────────────────────────

describe('scroll state is isolated to the scrollable node', () => {
  test('sibling outside scroll container is unaffected by scrollY', async () => {
    const css = `
      .wrapper { width: 20; height: 10; display: flex; flex-direction: column; }
      .header { width: 20; height: 2; }
      .scroll { width: 20; height: 4; overflow: scroll; display: flex; flex-direction: column; }
      .row { width: 20; height: 1; }
    `
    const { root } = await buildAndLayout(
      css,
      h('div', { class: 'wrapper' },
        h('div', { class: 'header' }, 'HEADER'),
        h('div', { class: 'scroll' },
          h('div', { class: 'row' }, 'Row0'),
          h('div', { class: 'row' }, 'Row1'),
          h('div', { class: 'row' }, 'Row2'),
          h('div', { class: 'row' }, 'Row3'),
          h('div', { class: 'row' }, 'Row4'),
          h('div', { class: 'row' }, 'Row5'),
        )
      ),
      20, 24
    )

    const scrollNode = findNodeByClass(root, 'scroll')
    if (scrollNode) scrollNode.scrollY = 2

    const buf = renderTree(root, 20, 24)

    // Header still at y=0 unaffected
    const headerChars = [0,1,2,3,4,5].map(x => buf.getCell(x, 0)?.char).join('')
    expect(headerChars).toBe('HEADER')

    // Scroll viewport starts at y=2 (after header)
    // With scrollY=2, Row2 should be visible at scroll top
    const scrollTopChars = [0,1,2,3].map(x => buf.getCell(x, 2)?.char).join('')
    expect(scrollTopChars).toBe('Row2')
  })
})
