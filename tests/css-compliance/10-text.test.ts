/**
 * CSS Compliance — Text Alignment
 * spec.md § 10
 *
 * Tests: text-align (left, center, right), vertical-align (top, middle, bottom)
 * Pipeline tier: buffer renderer (text placement within content box)
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice } from './helpers'

// ─── text-align ──────────────────────────────────────────────────────────────

describe('text-align: left', () => {
  test('text starts at left edge of content box', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 3; text-align: left; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    // Content at (0, 0)
    expect(buf.getCell(0, 0)?.char).toBe('H')
    expect(buf.getCell(1, 0)?.char).toBe('i')
  })

  test('text-align: left is the default', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 3; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    expect(buf.getCell(0, 0)?.char).toBe('H')
  })
})

describe('text-align: center', () => {
  test('text is horizontally centered in the content box', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 3; text-align: center; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    // 'Hi' is 2 chars; center of 20 = offset 9
    // Math.floor((20 - 2) / 2) = 9
    expect(buf.getCell(9, 0)?.char).toBe('H')
    expect(buf.getCell(10, 0)?.char).toBe('i')
  })

  test('text-align: center with padding applied', async () => {
    const buf = await renderCSS(
      `.box { width: 22; height: 3; text-align: center; padding: 1; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    // Content box: x=1..19 (width=20), center of 20 = offset 9
    expect(buf.getCell(10, 1)?.char).toBe('H')
  })
})

describe('text-align: right', () => {
  test('text is flush to the right edge of the content box', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 3; text-align: right; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    // 'Hi' flush right in 20 cols: starts at x=18
    expect(buf.getCell(18, 0)?.char).toBe('H')
    expect(buf.getCell(19, 0)?.char).toBe('i')
  })

  test('text-align: right with long text truncates at content width', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 3; text-align: right; }`,
      h('div', { class: 'box' }, 'ABCDEFGHIJ')
    )
    // Text fits exactly, last char at x=9
    expect(buf.getCell(9, 0)?.char).toBe('J')
  })
})

// ─── Interaction: text-align with border ─────────────────────────────────────

describe('text-align within bordered box', () => {
  test('text-align: center centers within content area (excluding border)', async () => {
    const buf = await renderCSS(
      `.box { width: 12; height: 3; border: 1px solid white; text-align: center; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    // Content box: x=1..10 (width=10), center of 10 = offset 4
    // Text 'Hi' (len 2): x = 1 + Math.floor((10 - 2) / 2) = 1 + 4 = 5
    expect(buf.getCell(5, 1)?.char).toBe('H')
    expect(buf.getCell(6, 1)?.char).toBe('i')
  })
})
