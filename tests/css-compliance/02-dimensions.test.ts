/**
 * CSS Compliance — Dimensions
 * spec.md § 2
 *
 * Tests: width, height, min-width, min-height, max-width, max-height
 * Pipeline tier: layout engine (computed x/y/width/height)
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS } from './helpers'

// ─── 2.1  width / height ──────────────────────────────────────────────────────

describe('width', () => {
  test('integer width sets exact cell width', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 5; background: blue; }`,
      h('div', { class: 'box' })
    )
    // Column 19 should have bg, column 20 should not
    expect(buf.getCell(19, 0)?.background).toBe('blue')
    expect(buf.getCell(20, 0)?.background).toBeNull()
  })

  test('px unit strips correctly (20px = 20 cells)', async () => {
    const buf = await renderCSS(
      `.box { width: 20px; height: 1; background: red; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(19, 0)?.background).toBe('red')
    expect(buf.getCell(20, 0)?.background).toBeNull()
  })

  test('percentage width relative to parent', async () => {
    // Parent = 80 cells wide; child = 50% = 40 cells
    const buf = await renderCSS(
      `.parent { width: 80; height: 5; } .child { width: 50%; height: 1; background: cyan; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    expect(buf.getCell(39, 0)?.background).toBe('cyan')
    expect(buf.getCell(40, 0)?.background).toBeNull()
  })

  test('calc(100% - 2) subtracts from parent width', async () => {
    const buf = await renderCSS(
      `.parent { width: 20; height: 5; } .child { width: calc(100% - 2); height: 1; background: green; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    // child should be 18 cells wide
    expect(buf.getCell(17, 0)?.background).toBe('green')
    expect(buf.getCell(18, 0)?.background).toBeNull()
  })
})

describe('height', () => {
  test('integer height sets exact cell height', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 3; background: blue; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 2)?.background).toBe('blue')
    expect(buf.getCell(0, 3)?.background).toBeNull()
  })

  test('percentage height relative to parent', async () => {
    const buf = await renderCSS(
      `.parent { width: 10; height: 10; } .child { width: 10; height: 50%; background: cyan; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    // child = 5 rows
    expect(buf.getCell(0, 4)?.background).toBe('cyan')
    expect(buf.getCell(0, 5)?.background).toBeNull()
  })
})

// ─── 2.2  min-width / min-height ─────────────────────────────────────────────

describe('min-width', () => {
  test('min-width enforces lower bound when computed width is smaller', async () => {
    // flex: 1 in a 10-wide container with no other siblings → natural width = 10
    // Use min-width to test lower bound enforcement explicitly
    const buf = await renderCSS(
      `.box { width: 5; min-width: 10; height: 1; background: red; }`,
      h('div', { class: 'box' })
    )
    // Should be at least 10 wide
    expect(buf.getCell(9, 0)?.background).toBe('red')
  })
})

describe('min-height', () => {
  test('min-height enforces lower bound', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; min-height: 4; background: blue; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 3)?.background).toBe('blue')
  })
})

// ─── 2.3  max-width / max-height ─────────────────────────────────────────────

describe('max-width', () => {
  test('max-width caps width even if flex would grow larger', async () => {
    const buf = await renderCSS(
      `.parent { display: flex; width: 80; height: 5; } .child { flex: 1; max-width: 20; height: 1; background: green; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    // child should not exceed 20 cols
    expect(buf.getCell(19, 0)?.background).toBe('green')
    expect(buf.getCell(20, 0)?.background).toBeNull()
  })
})

describe('max-height', () => {
  test('max-height caps height', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 10; max-height: 3; background: cyan; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 2)?.background).toBe('cyan')
    expect(buf.getCell(0, 3)?.background).toBeNull()
  })
})
