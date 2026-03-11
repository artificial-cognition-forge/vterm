/**
 * INT-COLOR: Hex Colors
 *
 * Tests that hex color formats (#RGB, #RRGGBB, #RRGGBBAA) work correctly.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellColor, cellBg } from '../helpers'
import { h } from 'vue'

describe('Hex Colors', () => {
  test('#RRGGBB foreground renders correctly', async () => {
    const buf = await renderCSS(
      `.red { color: #ff0000; width: 10; height: 1; }`,
      h('div', { class: 'red' }, 'text')
    )

    expect(cellColor(buf, 0, 0)).toBe('#ff0000')
  })

  test('#RGB shorthand expands to #RRGGBB', async () => {
    const buf = await renderCSS(
      `.red { color: #f00; width: 10; height: 1; }`,
      h('div', { class: 'red' }, 'text')
    )

    // Should expand #f00 to #ff0000
    expect(cellColor(buf, 0, 0)).toBe('#ff0000')
  })

  test('#RRGGBBAA strips alpha channel', async () => {
    const buf = await renderCSS(
      `.red { color: #ff000080; width: 10; height: 1; }`,
      h('div', { class: 'red' }, 'text')
    )

    // Should strip alpha, become #ff0000
    expect(cellColor(buf, 0, 0)).toBe('#ff0000')
  })

  test('hex colors work in background-color', async () => {
    const buf = await renderCSS(
      `.box { background: #00ff00; width: 10; height: 3; }`,
      h('div', { class: 'box' })
    )

    expect(cellBg(buf, 0, 0)).toBe('#00ff00')
    expect(cellBg(buf, 5, 1)).toBe('#00ff00')
  })

  test('hex colors work in border-color', async () => {
    const buf = await renderCSS(
      `.box { border: 1px solid #0000ff; width: 10; height: 3; }`,
      h('div', { class: 'box' })
    )

    expect(cellColor(buf, 0, 0)).toBe('#0000ff') // Top-left corner
    expect(cellColor(buf, 5, 0)).toBe('#0000ff') // Top edge
  })

  test('multiple hex colors in same element', async () => {
    const buf = await renderCSS(
      `.box { color: #ff00ff; background: #00ffff; width: 10; height: 2; }`,
      h('div', { class: 'box' }, 'text')
    )

    expect(cellColor(buf, 0, 0)).toBe('#ff00ff')
    expect(cellBg(buf, 0, 0)).toBe('#00ffff')
  })
})
