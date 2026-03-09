/**
 * CSS Compliance — User-Agent (Built-in) Element Styles
 *
 * VTerm applies default styles to certain HTML elements (analogous to the
 * browser's user-agent stylesheet). These are applied in BufferRenderer
 * via `getEffectiveStyle()` before any user CSS is applied.
 *
 * Built-in styles (from buffer-renderer.ts):
 *   button   → bg: 'blue'
 *   input    → bg: 'grey'
 *   textarea → bg: 'grey'
 *   select   → bg: 'grey'
 *   a        → fg: 'cyan', underline: true
 *
 * Tests verify that:
 * 1. UA styles are applied even with no user CSS
 * 2. User CSS can override UA styles
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, cellBg, cellColor } from './helpers'

// ─── button ───────────────────────────────────────────────────────────────────

describe('UA style: button', () => {
  test('button has bg: blue by default', async () => {
    const buf = await renderCSS(
      `.btn { width: 10; height: 1; }`,
      h('button', { class: 'btn' }, 'Click')
    )
    expect(cellBg(buf, 0, 0)).toBe('blue')
  })

  test('user background-color overrides button UA style', async () => {
    const buf = await renderCSS(
      `.btn { width: 10; height: 1; background: green; }`,
      h('button', { class: 'btn' }, 'Click')
    )
    expect(cellBg(buf, 0, 0)).toBe('green')
  })
})

// ─── input ────────────────────────────────────────────────────────────────────

describe('UA style: input', () => {
  test('input has bg: grey by default', async () => {
    const buf = await renderCSS(
      `.inp { width: 15; height: 1; }`,
      h('input', { class: 'inp' })
    )
    expect(cellBg(buf, 0, 0)).toBe('grey')
  })

  test('user background overrides input UA style', async () => {
    const buf = await renderCSS(
      `.inp { width: 15; height: 1; background: white; }`,
      h('input', { class: 'inp' })
    )
    expect(cellBg(buf, 0, 0)).toBe('white')
  })
})

// ─── textarea ─────────────────────────────────────────────────────────────────

describe('UA style: textarea', () => {
  test('textarea has bg: grey by default', async () => {
    const buf = await renderCSS(
      `.ta { width: 20; height: 3; }`,
      h('textarea', { class: 'ta' })
    )
    expect(cellBg(buf, 0, 0)).toBe('grey')
  })
})

// ─── a (anchor) ───────────────────────────────────────────────────────────────

describe('UA style: a (anchor)', () => {
  test('anchor has fg: cyan by default', async () => {
    const buf = await renderCSS(
      `.link { width: 15; height: 1; }`,
      h('a', { class: 'link' }, 'Click here')
    )
    expect(cellColor(buf, 0, 0)).toBe('cyan')
  })

  test('anchor has underline: true by default', async () => {
    const buf = await renderCSS(
      `.link { width: 15; height: 1; }`,
      h('a', { class: 'link' }, 'Click here')
    )
    expect(buf.getCell(0, 0)?.underline).toBe(true)
  })

  test('user color overrides anchor UA fg', async () => {
    const buf = await renderCSS(
      `.link { width: 15; height: 1; color: white; }`,
      h('a', { class: 'link' }, 'Click here')
    )
    expect(cellColor(buf, 0, 0)).toBe('white')
  })
})

// ─── Elements with no UA style ────────────────────────────────────────────────

describe('UA style: elements with no defaults', () => {
  test('div has no default bg or fg', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; }`,
      h('div', { class: 'box' })
    )
    expect(cellBg(buf, 0, 0)).toBeNull()
    expect(cellColor(buf, 0, 0)).toBeNull()
  })

  test('p has no default bg or fg', async () => {
    const buf = await renderCSS(
      `.para { width: 20; height: 1; }`,
      h('p', { class: 'para' }, 'text')
    )
    expect(cellBg(buf, 0, 0)).toBeNull()
  })
})
