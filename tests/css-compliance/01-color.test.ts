/**
 * CSS Compliance — Color
 * spec.md § 1
 *
 * Tests: color, background-color / background
 * Pipeline tier: parser (transformDeclaration) + render (BufferRenderer cell colors)
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, cellColor, cellBg } from './helpers'

// ─── 1.1  Foreground color ────────────────────────────────────────────────────

describe('color — terminal named colors', () => {
  const names = ['black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'grey']

  for (const name of names) {
    test(`color: ${name} applies to text cells`, async () => {
      const buf = await renderCSS(
        `.box { color: ${name}; width: 10; height: 1; }`,
        h('div', { class: 'box' }, 'Hi')
      )
      expect(cellColor(buf, 0, 0)).toBe(name)
    })
  }
})

describe('color — bright terminal named colors', () => {
  const names = ['brightblack', 'brightred', 'brightgreen', 'brightyellow', 'brightblue', 'brightmagenta', 'brightcyan', 'brightwhite']

  for (const name of names) {
    test(`color: ${name} applies to text cells`, async () => {
      const buf = await renderCSS(
        `.box { color: ${name}; width: 10; height: 1; }`,
        h('div', { class: 'box' }, 'Hi')
      )
      expect(cellColor(buf, 0, 0)).toBe(name)
    })
  }
})

describe('color — hex values', () => {
  test('#RRGGBB is passed through as-is', async () => {
    const buf = await renderCSS(
      `.box { color: #ff6600; width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    expect(cellColor(buf, 0, 0)).toBe('#ff6600')
  })

  // FIXED: 3-digit hex shorthand (#RGB) is now properly expanded to #RRGGBB.
  test('#RGB expands to #RRGGBB', async () => {
    const buf = await renderCSS(
      `.box { color: #f60; width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    expect(cellColor(buf, 0, 0)).toBe('#ff6600')
  })

  test('#RRGGBBAA strips alpha channel → #RRGGBB', async () => {
    const buf = await renderCSS(
      `.box { color: #ff6600ff; width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    expect(cellColor(buf, 0, 0)).toBe('#ff6600')
  })
})

describe('color — rgb() / rgba()', () => {
  test('rgb(255, 102, 0) converts to hex', async () => {
    const buf = await renderCSS(
      `.box { color: rgb(255, 102, 0); width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    expect(cellColor(buf, 0, 0)).toBe('#ff6600')
  })

  test('rgba(255, 102, 0, 0.5) — alpha applies opacity', async () => {
    const buf = await renderCSS(
      `.box { color: rgba(255, 102, 0, 0.5); width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    // 255*0.5=127.5→128, 102*0.5=51, 0*0.5=0 = #803300
    expect(cellColor(buf, 0, 0)).toBe('#803300')
  })
})

describe('color — hsl()', () => {
  test('hsl(24, 100%, 50%) converts to hex', async () => {
    const buf = await renderCSS(
      `.box { color: hsl(24, 100%, 50%); width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    // hsl(24, 100%, 50%) ≈ #ff6600 (orange)
    const color = cellColor(buf, 0, 0)
    expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('color — CSS named colors', () => {
  test('tomato converts to hex', async () => {
    const buf = await renderCSS(
      `.box { color: tomato; width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    expect(cellColor(buf, 0, 0)).toBe('#ff6347')
  })

  test('cyan passes through as terminal name (not CSS named color)', async () => {
    const buf = await renderCSS(
      `.box { color: cyan; width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    expect(cellColor(buf, 0, 0)).toBe('cyan')
  })
})

// ─── 1.2  Background color ────────────────────────────────────────────────────

describe('background-color', () => {
  test('background-color: blue fills all cells in the box', async () => {
    const buf = await renderCSS(
      `.box { background-color: blue; width: 10; height: 2; }`,
      h('div', { class: 'box' })
    )
    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 9, 0)).toBe('blue')
    expect(cellBg(buf, 0, 1)).toBe('blue')
    expect(cellBg(buf, 9, 1)).toBe('blue')
  })

  test('background shorthand sets bg color', async () => {
    const buf = await renderCSS(
      `.box { background: red; width: 5; height: 1; }`,
      h('div', { class: 'box' })
    )
    expect(cellBg(buf, 0, 0)).toBe('red')
  })

  test('hex background-color', async () => {
    const buf = await renderCSS(
      `.box { background-color: #123456; width: 5; height: 1; }`,
      h('div', { class: 'box' })
    )
    expect(cellBg(buf, 0, 0)).toBe('#123456')
  })

  test('rgb() background-color converts to hex', async () => {
    const buf = await renderCSS(
      `.box { background-color: rgb(18, 52, 86); width: 5; height: 1; }`,
      h('div', { class: 'box' })
    )
    expect(cellBg(buf, 0, 0)).toBe('#123456')
  })
})

describe('color — both fg and bg on same element', () => {
  test('color and background-color set independently on same element', async () => {
    const buf = await renderCSS(
      `.box { color: white; background-color: blue; width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    const cell = buf.getCell(0, 0)
    expect(cell?.color).toBe('white')
    expect(cell?.background).toBe('blue')
  })
})
