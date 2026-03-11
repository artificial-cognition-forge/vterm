/**
 * INT-BORDER: Border Styles
 *
 * Tests that all border styles (line, heavy, double, ascii) render correctly.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellText } from '../helpers'
import { h } from 'vue'

describe('Border Styles', () => {
  test('border-style: solid renders line characters', async () => {
    const buf = await renderCSS(
      `.box { border-style: solid; width: 8; height: 4; }`,
      h('div', { class: 'box' })
    )

    expect(cellText(buf, 0, 0)).toBe('┌')
    expect(cellText(buf, 1, 0)).toBe('─')
    expect(cellText(buf, 0, 1)).toBe('│')
  })

  test('border-style: heavy renders heavy characters', async () => {
    const buf = await renderCSS(
      `.box { border-style: heavy; width: 8; height: 4; }`,
      h('div', { class: 'box' })
    )

    expect(cellText(buf, 0, 0)).toBe('┏')
    expect(cellText(buf, 7, 0)).toBe('┓')
    expect(cellText(buf, 0, 3)).toBe('┗')
    expect(cellText(buf, 7, 3)).toBe('┛')

    // Horizontal edge
    expect(cellText(buf, 3, 0)).toBe('━')

    // Vertical edge
    expect(cellText(buf, 0, 1)).toBe('┃')
  })

  test('border-style: double renders double characters', async () => {
    const buf = await renderCSS(
      `.box { border-style: double; width: 8; height: 4; }`,
      h('div', { class: 'box' })
    )

    expect(cellText(buf, 0, 0)).toBe('╔')
    expect(cellText(buf, 7, 0)).toBe('╗')
    expect(cellText(buf, 0, 3)).toBe('╚')
    expect(cellText(buf, 7, 3)).toBe('╝')

    // Horizontal edge
    expect(cellText(buf, 3, 0)).toBe('═')

    // Vertical edge
    expect(cellText(buf, 0, 1)).toBe('║')
  })

  test('border-style: ascii renders ASCII characters', async () => {
    const buf = await renderCSS(
      `.box { border-style: ascii; width: 8; height: 4; }`,
      h('div', { class: 'box' })
    )

    expect(cellText(buf, 0, 0)).toBe('+')
    expect(cellText(buf, 7, 0)).toBe('+')
    expect(cellText(buf, 0, 3)).toBe('+')
    expect(cellText(buf, 7, 3)).toBe('+')

    // Horizontal edge
    expect(cellText(buf, 3, 0)).toBe('-')

    // Vertical edge
    expect(cellText(buf, 0, 1)).toBe('|')
  })

  test('different border styles are visually distinct', async () => {
    const solidBuf = await renderCSS(
      `.box { border-style: solid; width: 6; height: 3; }`,
      h('div', { class: 'box' })
    )
    const heavyBuf = await renderCSS(
      `.box { border-style: heavy; width: 6; height: 3; }`,
      h('div', { class: 'box' })
    )
    const doubleBuf = await renderCSS(
      `.box { border-style: double; width: 6; height: 3; }`,
      h('div', { class: 'box' })
    )

    const solidCorner = cellText(solidBuf, 0, 0)
    const heavyCorner = cellText(heavyBuf, 0, 0)
    const doubleCorner = cellText(doubleBuf, 0, 0)

    expect(solidCorner).toBe('┌')
    expect(heavyCorner).toBe('┏')
    expect(doubleCorner).toBe('╔')
    expect(solidCorner).not.toBe(heavyCorner)
    expect(heavyCorner).not.toBe(doubleCorner)
  })

  test('border-style overrides border: shorthand', async () => {
    const buf = await renderCSS(
      `.box { border: 1px solid blue; border-style: heavy; width: 6; height: 3; }`,
      h('div', { class: 'box' })
    )

    // Should use heavy style, not solid
    expect(cellText(buf, 0, 0)).toBe('┏')
    expect(cellText(buf, 3, 0)).toBe('━')
  })
})
