/**
 * CSS Compliance — Visibility
 * spec.md § 16
 *
 * Tests: display: none, visibility: hidden, opacity < 1
 * Pipeline tier: parser + renderer (invisible flag, display:none skip)
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS } from './helpers'
import { transformCSSToLayout } from '../../src/core/css/transformer'

describe('display: none', () => {
  test('element is not rendered at all', async () => {
    const buf = await renderCSS(
      `.box { display: none; width: 20; height: 5; background: red; }`,
      h('div', { class: 'box' })
    )
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 20; x++) {
        expect(buf.getCell(x, y)?.background).not.toBe('red')
      }
    }
  })

  test('display: none parsed to display property on LayoutProperties', async () => {
    const styles = await transformCSSToLayout(`.box { display: none; }`)
    expect(styles['.box']?.display).toBe('none')
  })
})

describe('visibility: hidden', () => {
  test('visibility: hidden sets invisible: true on VisualStyle', async () => {
    const styles = await transformCSSToLayout(`.box { visibility: hidden; }`)
    expect(styles['.box']?.visualStyles?.invisible).toBe(true)
  })

  test('invisible element not rendered to buffer', async () => {
    const buf = await renderCSS(
      `.box { visibility: hidden; width: 10; height: 3; background: red; }`,
      h('div', { class: 'box' })
    )
    // invisible nodes are skipped in renderNode
    for (let y = 0; y < 3; y++) {
      expect(buf.getCell(0, y)?.background).not.toBe('red')
    }
  })
})

describe('opacity', () => {
  test('opacity < 1 sets transparent: true on VisualStyle', async () => {
    const styles = await transformCSSToLayout(`.box { opacity: 0.5; }`)
    expect(styles['.box']?.visualStyles?.transparent).toBe(true)
  })

  test('opacity: 0 sets transparent: true', async () => {
    const styles = await transformCSSToLayout(`.box { opacity: 0; }`)
    expect(styles['.box']?.visualStyles?.transparent).toBe(true)
  })

  test('opacity: 1 does not set transparent flag', async () => {
    const styles = await transformCSSToLayout(`.box { opacity: 1; }`)
    expect(styles['.box']?.visualStyles?.transparent).toBeUndefined()
  })
})
