/**
 * CSS Compliance — Extended Color Tests
 * Covers additional color parsing edge cases not covered in the basic suite.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, cellColor, cellBg } from './helpers'

describe('color parsing edge cases', () => {
  test('4‑digit hex #RGBA expands and strips alpha', async () => {
    const buf = await renderCSS(
      `.box { color: #f6a5; width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    // #f6a5 -> #ff66aa (expand each digit, drop alpha)
    expect(cellColor(buf, 0, 0)).toBe('#ff66aa')
  })

  test('256‑color index works as foreground color', async () => {
    const buf = await renderCSS(
      `.box { color: 123; width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    expect(cellColor(buf, 0, 0)).toBe('123')
  })

  test('uppercase hex is case‑insensitive', async () => {
    const buf = await renderCSS(
      `.box { color: #FF6600; width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )
    expect(cellColor(buf, 0, 0)).toBe('#ff6600')
  })

  test('opacity < 1 makes background transparent (no fill)', async () => {
    const buf = await renderCSS(
      `.box { background: blue; opacity: 0.5; width: 2; height: 2; }`,
      h('div', { class: 'box' })
    )
    // background should be null (no fill) for both cells
    expect(cellBg(buf, 0, 0)).toBeNull()
    expect(cellBg(buf, 1, 1)).toBeNull()
  })
})
