/**
 * CSS Compliance — Overflow
 * spec.md § 12
 *
 * Tests: overflow: scroll/auto/hidden, overflow-y, overflow-x
 * Pipeline tier: parser (sets scrollable flags on LayoutProperties)
 */

import { test, expect, describe } from 'bun:test'
import { transformCSSToLayout } from '../../src/core/css/transformer'

// Parser-level tests — overflow sets the correct flags on LayoutProperties
// Note: scrollable/scrollableX/scrollableY are stored as booleans (true/false),
// not as strings, since they're written via (props as any).scrollable = true.

describe('overflow: scroll', () => {
  test('sets scrollable: true', async () => {
    const styles = await transformCSSToLayout(`.box { overflow: scroll; }`)
    expect((styles['.box'] as any).scrollable).toBe(true)
  })

  test('sets alwaysScroll: true', async () => {
    const styles = await transformCSSToLayout(`.box { overflow: scroll; }`)
    expect((styles['.box'] as any).alwaysScroll).toBe(true)
  })
})

describe('overflow: auto', () => {
  test('sets scrollable: true', async () => {
    const styles = await transformCSSToLayout(`.box { overflow: auto; }`)
    expect((styles['.box'] as any).scrollable).toBe(true)
  })
})

describe('overflow: hidden', () => {
  test('sets scrollable to false', async () => {
    const styles = await transformCSSToLayout(`.box { overflow: hidden; }`)
    expect((styles['.box'] as any).scrollable).toBe(false)
  })
})

describe('overflow-y: scroll', () => {
  test('sets scrollableY: true', async () => {
    const styles = await transformCSSToLayout(`.box { overflow-y: scroll; }`)
    expect((styles['.box'] as any).scrollableY).toBe(true)
  })
})

describe('overflow-x: scroll', () => {
  test('sets scrollableX: true', async () => {
    const styles = await transformCSSToLayout(`.box { overflow-x: scroll; }`)
    expect((styles['.box'] as any).scrollableX).toBe(true)
  })
})
