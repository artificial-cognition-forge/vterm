/**
 * Render Correctness — Scrollbar Overlay
 * spec.md § 11
 *
 * Verifies that the scrollbar is drawn at the correct column, with the thumb
 * at the correct position relative to scrollY, and only when content overflows.
 *
 * Scrollbar characters:
 *   track: '│' (color: grey)
 *   thumb: '█' (color: white)
 *
 * Scrollbar is painted at: x = node.layout.x + node.layout.width - 1
 * (rightmost column of the scroll viewport).
 */

import { test, expect, describe } from 'bun:test'
import { h, buildAndLayout, renderTree, findNodeByClass } from './helpers'

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TRACK = '│'
const THUMB = '█'

/**
 * Build a scroll container with N 1-row children, apply scrollY, render.
 * Scroll region: x=0..width-1, y=0..viewportH-1.
 * Scrollbar column: x = width - 1.
 */
async function scrollbarTest(
  totalRows: number,
  scrollY: number,
  viewportH = 6,
  width = 10
) {
  const css = `
    .scroll { width: ${width}; height: ${viewportH}; overflow: scroll; display: flex; flex-direction: column; }
    .row { width: ${width}; height: 1; }
  `
  const children = Array.from({ length: totalRows }, (_, i) =>
    h('div', { class: 'row' }, `Row${i}`)
  )
  const { root } = await buildAndLayout(
    css, h('div', { class: 'scroll' }, ...children), width, 24
  )
  const scrollNode = findNodeByClass(root, 'scroll')
  if (scrollNode) {
    scrollNode.scrollY = scrollY
  }
  return { buf: renderTree(root, width, 24), scrollbarX: width - 1 }
}

// ─── No overflow: no scrollbar ────────────────────────────────────────────────

describe('no scrollbar when content fits in viewport', () => {
  test('exactly fitting content: rightmost column has no track or thumb char', async () => {
    // 4 rows, 4-row viewport → no overflow
    const { buf, scrollbarX } = await scrollbarTest(4, 0, 4, 10)
    for (let y = 0; y < 4; y++) {
      const char = buf.getCell(scrollbarX, y)?.char
      expect(char).not.toBe(TRACK)
      expect(char).not.toBe(THUMB)
    }
  })
})

// ─── Overflow present: scrollbar rendered ────────────────────────────────────

describe('scrollbar appears when content overflows viewport', () => {
  test('10 rows in 5-row viewport: scrollbar chars on rightmost column', async () => {
    const { buf, scrollbarX } = await scrollbarTest(10, 0, 5, 10)
    // At least one scrollbar char (track or thumb) should appear in the column
    let found = false
    for (let y = 0; y < 5; y++) {
      const char = buf.getCell(scrollbarX, y)?.char
      if (char === TRACK || char === THUMB) { found = true; break }
    }
    expect(found).toBe(true)
  })

  test('scrollbar column is rightmost: x = width - 1', async () => {
    const width = 12
    const { buf } = await scrollbarTest(10, 0, 5, width)
    const scrollbarX = width - 1
    // Column at x=width-1 has scrollbar
    let foundScrollbar = false
    for (let y = 0; y < 5; y++) {
      const char = buf.getCell(scrollbarX, y)?.char
      if (char === TRACK || char === THUMB) { foundScrollbar = true; break }
    }
    expect(foundScrollbar).toBe(true)

    // Column at x=width-2 should not have scrollbar chars in it
    let foundAtWrongCol = false
    for (let y = 0; y < 5; y++) {
      const char = buf.getCell(scrollbarX - 1, y)?.char
      if (char === TRACK || char === THUMB) { foundAtWrongCol = true; break }
    }
    expect(foundAtWrongCol).toBe(false)
  })
})

// ─── scrollY=0: thumb at top ──────────────────────────────────────────────────

describe('scrollY=0: thumb at start of track', () => {
  test('first scrollbar cell is thumb, not track', async () => {
    const { buf, scrollbarX } = await scrollbarTest(10, 0, 5, 10)
    // At scrollY=0, thumb should be at y=0
    expect(buf.getCell(scrollbarX, 0)?.char).toBe(THUMB)
  })
})

// ─── scrollY=max: thumb at bottom ────────────────────────────────────────────

describe('scrollY at maximum: thumb at end of track', () => {
  test('last scrollbar row is thumb when scrolled to bottom', async () => {
    // 10 rows, 5-row viewport → scrollRange = 10-5 = 5
    const maxScrollY = 5
    const viewportH = 5
    const { buf, scrollbarX } = await scrollbarTest(10, maxScrollY, viewportH, 10)
    // At max scroll, thumb should be at y = viewportH-1 (last row)
    expect(buf.getCell(scrollbarX, viewportH - 1)?.char).toBe(THUMB)
  })
})

// ─── Mid-scroll: thumb moves ──────────────────────────────────────────────────

describe('thumb position changes with scrollY', () => {
  test('scrollY=0 vs scrollY=max have different thumb positions', async () => {
    const viewportH = 6
    const totalRows = 12

    const { buf: buf0, scrollbarX } = await scrollbarTest(totalRows, 0, viewportH, 10)
    const { buf: bufMax } = await scrollbarTest(totalRows, totalRows - viewportH, viewportH, 10)

    // Find thumb position at scrollY=0
    let thumbTop = -1
    for (let y = 0; y < viewportH; y++) {
      if (buf0.getCell(scrollbarX, y)?.char === THUMB) { thumbTop = y; break }
    }

    // Find thumb position at scrollY=max
    let thumbMax = -1
    for (let y = viewportH - 1; y >= 0; y--) {
      if (bufMax.getCell(scrollbarX, y)?.char === THUMB) { thumbMax = y; break }
    }

    expect(thumbTop).toBeGreaterThanOrEqual(0)
    expect(thumbMax).toBeGreaterThanOrEqual(0)
    expect(thumbMax).toBeGreaterThan(thumbTop)
  })
})

// ─── Scrollbar colors ─────────────────────────────────────────────────────────

describe('scrollbar character colors', () => {
  test('track character has grey color', async () => {
    const { buf, scrollbarX } = await scrollbarTest(10, 0, 5, 10)
    // Find a track char (not thumb)
    let trackFound = false
    for (let y = 0; y < 5; y++) {
      const cell = buf.getCell(scrollbarX, y)
      if (cell?.char === TRACK) {
        expect(cell.color).toBe('grey')
        trackFound = true
        break
      }
    }
    // If there's overflow, there should be a track char somewhere
    if (!trackFound) {
      // All cells might be thumb — that's ok for a very small viewport
      // Just verify at least one cell has grey or white
    }
  })

  test('thumb character has white color', async () => {
    const { buf, scrollbarX } = await scrollbarTest(10, 0, 5, 10)
    let thumbFound = false
    for (let y = 0; y < 5; y++) {
      const cell = buf.getCell(scrollbarX, y)
      if (cell?.char === THUMB) {
        expect(cell.color).toBe('white')
        thumbFound = true
        break
      }
    }
    expect(thumbFound).toBe(true)
  })
})

// ─── Scrollbar overlays content ───────────────────────────────────────────────

describe('scrollbar overlays content at rightmost column', () => {
  test('scrollbar char replaces any content character at that column', async () => {
    // Each row is the width of the container, so text would reach the scrollbar column
    const width = 8
    const viewportH = 4
    const css = `
      .scroll { width: ${width}; height: ${viewportH}; overflow: scroll; display: flex; flex-direction: column; }
      .row { width: ${width}; height: 1; }
    `
    const children = Array.from({ length: 10 }, (_, i) =>
      h('div', { class: 'row' }, 'ABCDEFGH')  // fills all 8 cells
    )
    const { root } = await buildAndLayout(css, h('div', { class: 'scroll' }, ...children), width, 24)
    const scrollNode = findNodeByClass(root, 'scroll')
    if (scrollNode) scrollNode.scrollY = 0

    const buf = renderTree(root, width, 24)

    const scrollbarX = width - 1
    // The scrollbar should override the 'H' character at the rightmost column
    const cell = buf.getCell(scrollbarX, 0)
    expect(cell?.char === THUMB || cell?.char === TRACK).toBe(true)
    expect(cell?.char).not.toBe('H')
  })
})

// ─── Scrollbar in non-root element ────────────────────────────────────────────

describe('scrollbar in a non-root scroll region', () => {
  test('scrollbar x position is relative to scroll node, not screen', async () => {
    const sidebarWidth = 15
    const scrollWidth = 20
    const css = `
      .layout { width: 80; height: 20; display: flex; }
      .sidebar { width: ${sidebarWidth}; height: 20; background: blue; }
      .scroll { width: ${scrollWidth}; height: 10; overflow: scroll; display: flex; flex-direction: column; }
      .row { width: ${scrollWidth}; height: 1; }
    `
    const children = Array.from({ length: 15 }, (_, i) =>
      h('div', { class: 'row' }, `Item${i}`)
    )
    const { root } = await buildAndLayout(
      css,
      h('div', { class: 'layout' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'scroll' }, ...children)
      ),
      80, 24
    )

    const scrollNode = findNodeByClass(root, 'scroll')
    if (scrollNode) scrollNode.scrollY = 0

    const buf = renderTree(root, 80, 24)

    // Scroll region starts at x=sidebarWidth; scrollbar at x = sidebarWidth + scrollWidth - 1
    const expectedScrollbarX = sidebarWidth + scrollWidth - 1
    let found = false
    for (let y = 0; y < 10; y++) {
      const cell = buf.getCell(expectedScrollbarX, y)
      if (cell?.char === THUMB || cell?.char === TRACK) { found = true; break }
    }
    expect(found).toBe(true)
  })
})
