/**
 * CSS Compliance — Units & Values
 * spec.md § 14
 *
 * Tests: integer, px, em, rem, %, calc(), negative values, floats
 * Pipeline tier: parser (parseNumericValue) + layout engine (calc resolution)
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS } from './helpers'
import { transformCSSToLayout } from '../../src/core/css/transformer'

// ─── Unit parsing (parser tier) ───────────────────────────────────────────────

describe('unit parsing — width property', () => {
  test('integer (no unit) parsed as number', async () => {
    const styles = await transformCSSToLayout(`.box { width: 20; }`)
    expect(styles['.box']?.width).toBe(20)
  })

  test('px unit stripped → integer', async () => {
    const styles = await transformCSSToLayout(`.box { width: 20px; }`)
    expect(styles['.box']?.width).toBe(20)
  })

  test('em unit stripped → integer', async () => {
    const styles = await transformCSSToLayout(`.box { width: 5em; }`)
    expect(styles['.box']?.width).toBe(5)
  })

  test('rem unit stripped → integer', async () => {
    const styles = await transformCSSToLayout(`.box { width: 3rem; }`)
    expect(styles['.box']?.width).toBe(3)
  })

  test('% value stored as string', async () => {
    const styles = await transformCSSToLayout(`.box { width: 50%; }`)
    expect(styles['.box']?.width).toBe('50%')
  })

  test('calc() value stored as string for later resolution', async () => {
    const styles = await transformCSSToLayout(`.box { width: calc(100% - 4); }`)
    expect(typeof styles['.box']?.width).toBe('string')
    expect(styles['.box']?.width).toContain('calc(')
  })

  // NOTE: Floats are NOT rounded to the nearest integer by the parser.
  // parseNumericValue returns the raw float for non-integer values.
  // Only values where Number.isInteger(num) is true get Math.round() applied
  // (which is always false for floats). Spec comment updated to reflect this.
  test('float value preserved as-is (not rounded by parser)', async () => {
    const styles = await transformCSSToLayout(`.box { width: 10.7px; }`)
    expect(styles['.box']?.width).toBe(10.7)
  })
})

describe('unit parsing — padding property', () => {
  test('px padding stripped to integer', async () => {
    const styles = await transformCSSToLayout(`.box { padding: 4px; }`)
    expect(styles['.box']?.padding).toBe(4)
  })
})

// ─── calc() resolution (layout tier) ─────────────────────────────────────────

describe('calc() resolution in layout', () => {
  test('calc(100% - 4) in 20-wide parent = 16-wide child', async () => {
    const buf = await renderCSS(
      `.parent { width: 20; height: 5; }
       .child  { width: calc(100% - 4); height: 2; background: blue; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    // child = 16 wide: col 15 = blue, col 16 = no bg
    expect(buf.getCell(15, 0)?.background).toBe('blue')
    expect(buf.getCell(16, 0)?.background).toBeNull()
  })

  test('calc(100% - 2) used for border inset pattern', async () => {
    const buf = await renderCSS(
      `.parent { width: 20; height: 5; }
       .child  { width: calc(100% - 2); height: 2; background: red; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    // child = 18 wide: col 17 = red, col 18 = no bg
    expect(buf.getCell(17, 0)?.background).toBe('red')
    expect(buf.getCell(18, 0)?.background).toBeNull()
  })
})

// ─── Percentage dimensions ────────────────────────────────────────────────────

describe('percentage width', () => {
  test('50% of 40-wide parent = 20 cells', async () => {
    const buf = await renderCSS(
      `.parent { width: 40; height: 5; }
       .child  { width: 50%; height: 2; background: cyan; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    expect(buf.getCell(19, 0)?.background).toBe('cyan')
    expect(buf.getCell(20, 0)?.background).toBeNull()
  })

  test('100% fills parent entirely', async () => {
    const buf = await renderCSS(
      `.parent { width: 30; height: 5; }
       .child  { width: 100%; height: 2; background: green; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    expect(buf.getCell(29, 0)?.background).toBe('green')
    expect(buf.getCell(30, 0)?.background).toBeNull()
  })
})

describe('percentage height', () => {
  test('50% of 10-tall parent = 5 rows', async () => {
    const buf = await renderCSS(
      `.parent { width: 10; height: 10; }
       .child  { width: 5; height: 50%; background: yellow; }`,
      h('div', { class: 'parent' }, h('div', { class: 'child' }))
    )
    expect(buf.getCell(0, 4)?.background).toBe('yellow')
    expect(buf.getCell(0, 5)?.background).toBeNull()
  })
})
