/**
 * Render Correctness — Sidebar Layout Patterns
 * spec.md § 8
 *
 * Real-world sidebar + content area tests. This is the most common TUI layout
 * and a frequent source of off-by-one rendering bugs. Tests verify exact
 * column boundaries and content placement within each region.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, expectRegionBg, rowSlice } from './helpers'

// ─── Basic sidebar + content ──────────────────────────────────────────────────

describe('sidebar width:20 + flex:1 content in 80-wide terminal', () => {
  test('sidebar occupies x=0..19', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 80; height: 20; display: flex; }
      .sidebar { width: 20; height: 20; background: blue; }
      .content { flex: 1; height: 20; background: green; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' })
      )
    )
    expectRegionBg(buf, 0, 0, 20, 20, 'blue')
  })

  test('content occupies x=20..79', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 80; height: 20; display: flex; }
      .sidebar { width: 20; height: 20; background: blue; }
      .content { flex: 1; height: 20; background: green; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' })
      )
    )
    expectRegionBg(buf, 20, 0, 60, 20, 'green')
  })

  test('x=19 is sidebar, x=20 is content (no gap, no overlap)', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 80; height: 20; display: flex; }
      .sidebar { width: 20; height: 20; background: blue; }
      .content { flex: 1; height: 20; background: green; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' })
      )
    )
    expect(buf.getCell(19, 0)?.background).toBe('blue')
    expect(buf.getCell(20, 0)?.background).toBe('green')
  })
})

// ─── Sidebar content placement ────────────────────────────────────────────────

describe('sidebar content renders within sidebar bounds', () => {
  test('sidebar items text does not extend past x=19', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 80; height: 20; display: flex; }
      .sidebar { width: 20; height: 20; background: blue; display: flex; flex-direction: column; }
      .item { width: 20; height: 2; }
      .content { flex: 1; height: 20; background: green; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'sidebar' },
          h('div', { class: 'item' }, 'Sessions'),
          h('div', { class: 'item' }, 'Settings')
        ),
        h('div', { class: 'content' })
      )
    )
    // Sessions text starts at x=0
    expect(buf.getCell(0, 0)?.char).toBe('S')
    // Content area at x=20 should still be green, not text
    expect(buf.getCell(20, 0)?.background).toBe('green')
  })

  test('sidebar item with padding-left: 2 → text at x=2', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 80; height: 20; display: flex; }
      .sidebar { width: 20; height: 20; background: blue; display: flex; flex-direction: column; }
      .item { width: 20; height: 2; padding-left: 2; }
      .content { flex: 1; height: 20; background: green; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'sidebar' },
          h('div', { class: 'item' }, 'Nav')
        ),
        h('div', { class: 'content' })
      )
    )
    // padding-left:2 → text at x=2
    expect(buf.getCell(0, 0)?.char).toBe(' ')
    expect(buf.getCell(1, 0)?.char).toBe(' ')
    expect(buf.getCell(2, 0)?.char).toBe('N')
  })
})

// ─── Sidebar with border ──────────────────────────────────────────────────────

describe('sidebar with right border: content starts at x=21', () => {
  test('sidebar border at x=20, content starts at x=21', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 80; height: 10; display: flex; }
      .sidebar { width: 21; height: 10; border: 1px solid white; background: blue; }
      .content { flex: 1; height: 10; background: green; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' })
      )
    )
    // sidebar width=21: x=0..20; right border at x=20
    expect(buf.getCell(20, 0)?.char).toBe('┐')
    // content starts at x=21
    expect(buf.getCell(21, 0)?.background).toBe('green')
  })
})

// ─── Three-column layout ──────────────────────────────────────────────────────

describe('three-column layout: left, center, right', () => {
  test('60-wide layout with 15+30+15: each column at correct x', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 60; height: 10; display: flex; }
      .left { width: 15; height: 10; background: blue; }
      .center { width: 30; height: 10; background: green; }
      .right { width: 15; height: 10; background: red; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'left' }),
        h('div', { class: 'center' }),
        h('div', { class: 'right' })
      )
    )
    expectRegionBg(buf, 0, 0, 15, 10, 'blue')
    expectRegionBg(buf, 15, 0, 30, 10, 'green')
    expectRegionBg(buf, 45, 0, 15, 10, 'red')
  })

  test('column boundaries are exact: x=14 left, x=15 center, x=44 center, x=45 right', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 60; height: 10; display: flex; }
      .left { width: 15; height: 10; background: blue; }
      .center { width: 30; height: 10; background: green; }
      .right { width: 15; height: 10; background: red; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'left' }),
        h('div', { class: 'center' }),
        h('div', { class: 'right' })
      )
    )
    expect(buf.getCell(14, 0)?.background).toBe('blue')
    expect(buf.getCell(15, 0)?.background).toBe('green')
    expect(buf.getCell(44, 0)?.background).toBe('green')
    expect(buf.getCell(45, 0)?.background).toBe('red')
  })
})

// ─── Content fills remaining width ────────────────────────────────────────────

describe('content flex:1 fills remaining width exactly', () => {
  test('sidebar 20 + content flex:1 in 80-wide: content last cell at x=79', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 80; height: 5; display: flex; }
      .sidebar { width: 20; height: 5; background: blue; }
      .content { flex: 1; height: 5; background: green; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' })
      )
    )
    expect(buf.getCell(79, 0)?.background).toBe('green')
  })

  test('sidebar 30 + content flex:1 in 80-wide: content from x=30 to x=79', async () => {
    const buf = await renderCSS(
      `
      .layout { width: 80; height: 5; display: flex; }
      .sidebar { width: 30; height: 5; background: blue; }
      .content { flex: 1; height: 5; background: red; }
      `,
      h('div', { class: 'layout' },
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' })
      )
    )
    expect(buf.getCell(29, 0)?.background).toBe('blue')
    expect(buf.getCell(30, 0)?.background).toBe('red')
    expect(buf.getCell(79, 0)?.background).toBe('red')
  })
})

// ─── Full app layout (header + sidebar + content) ─────────────────────────────

describe('full app layout: header + sidebar + content', () => {
  test('header at y=0, sidebar+content below at y=2', async () => {
    // Note: sidebar and content need explicit height because cross-axis stretch
    // (filling flex row container height) requires explicit height in vterm.
    const buf = await renderCSS(
      `
      .app { width: 40; height: 12; display: flex; flex-direction: column; }
      .header { width: 40; height: 2; background: magenta; }
      .body { flex: 1; width: 40; height: 10; display: flex; }
      .sidebar { width: 10; height: 10; background: blue; }
      .content { flex: 1; height: 10; background: green; }
      `,
      h('div', { class: 'app' },
        h('div', { class: 'header' }),
        h('div', { class: 'body' },
          h('div', { class: 'sidebar' }),
          h('div', { class: 'content' })
        )
      )
    )
    // Header: y=0..1
    expectRegionBg(buf, 0, 0, 40, 2, 'magenta')
    // Sidebar: x=0..9, y=2..11
    expectRegionBg(buf, 0, 2, 10, 10, 'blue')
    // Content: x=10..39, y=2..11
    expectRegionBg(buf, 10, 2, 30, 10, 'green')
  })
})
