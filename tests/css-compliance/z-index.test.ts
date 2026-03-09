/**
 * Z-Index CSS Compliance Tests
 *
 * Tests that verify z-index property parsing and computation
 * across various input formats and edge cases.
 */

import { describe, it, expect } from 'bun:test'
import { transformCSSToLayout } from '../../src/core/css'
import { createLayoutEngine } from '../../src/core/layout'

describe('z-index CSS compliance', () => {
  it('parses numeric z-index values', async () => {
    const css = `
      .zero { z-index: 0; }
      .positive { z-index: 10; }
      .large { z-index: 9999; }
      .negative { z-index: -5; }
    `

    const styles = await transformCSSToLayout(css)

    expect(styles['.zero'].zIndex).toBe(0)
    expect(styles['.positive'].zIndex).toBe(10)
    expect(styles['.large'].zIndex).toBe(9999)
    expect(styles['.negative'].zIndex).toBe(-5)
  })

  it('handles z-index: auto', async () => {
    const css = `.auto { z-index: auto; }`
    const styles = await transformCSSToLayout(css)
    expect(styles['.auto'].zIndex).toBe('auto')
  })

  it('ignores invalid z-index values', async () => {
    const css = `
      .invalid1 { z-index: notanumber; }
      .invalid2 { z-index: 10px; }
      .invalid3 { z-index: inherit; }
    `

    const styles = await transformCSSToLayout(css)

    // Invalid values should be treated as 'auto'
    expect(styles['.invalid1'].zIndex).toBe('auto')
    expect(styles['.invalid2'].zIndex).toBe('auto')
    expect(styles['.invalid3'].zIndex).toBe('auto')
  })

  it('computes z-index as 0 by default in layout engine', () => {
    const engine = createLayoutEngine(20, 10)

    // Node without z-index
    const node = engine.buildLayoutTree({
      type: 'div',
      props: {},
      children: [],
    } as any)

    engine.computeLayout(node)
    expect(node.zIndex).toBe(0)
  })

  it('applies z-index from layout properties to computed node', async () => {
    const css = `.zindex5 { z-index: 5; }`
    const engine = createLayoutEngine(20, 10)
    const styles = await transformCSSToLayout(css)

    const node = engine.buildLayoutTree({
      type: 'div',
      props: { class: 'zindex5' },
      children: [],
    } as any, styles)

    engine.computeLayout(node)
    expect(node.zIndex).toBe(5)
  })

  it('propagates z-index to all nodes during layout', async () => {
    const css = `
      .parent { z-index: 10; }
      .child { z-index: 5; }
      .default { }
    `

    const engine = createLayoutEngine(20, 10)
    const styles = await transformCSSToLayout(css)

    const tree = engine.buildLayoutTree({
      type: 'div',
      props: { class: 'parent' },
      children: [
        {
          type: 'div',
          props: { class: 'child' },
          children: [],
        } as any,
        {
          type: 'div',
          props: { class: 'default' },
          children: [],
        } as any,
      ],
    } as any, styles)

    engine.computeLayout(tree)

    expect(tree.zIndex).toBe(10)
    expect(tree.children[0]?.zIndex).toBe(5)
    expect(tree.children[1]?.zIndex).toBe(0)
  })

  it('handles z-index on positioned elements', async () => {
    const css = `
      .absolute { position: absolute; z-index: 20; }
      .relative { position: relative; z-index: 15; }
      .static { position: static; z-index: 10; }
    `

    const styles = await transformCSSToLayout(css)

    // z-index should be parsed regardless of position value
    expect(styles['.absolute'].zIndex).toBe(20)
    expect(styles['.relative'].zIndex).toBe(15)
    expect(styles['.static'].zIndex).toBe(10)
  })

  it('handles decimal z-index (rounded to integer)', async () => {
    const css = `.decimal { z-index: 10.5; }`
    const styles = await transformCSSToLayout(css)

    expect(styles['.decimal'].zIndex).toBe(10)
  })

  it('max z-index limits', async () => {
    const css = `
      .maxJs { z-index: 2147483647; }
      .minJs { z-index: -2147483648; }
    `

    const styles = await transformCSSToLayout(css)

    expect(styles['.maxJs'].zIndex).toBe(2147483647)
    expect(styles['.minJs'].zIndex).toBe(-2147483648)
  })

  it('whitespace tolerance in z-index values', async () => {
    const css = `
      .spaces { z-index:   42   ; }
      .tabs { z-index:   99; }
    `

    const styles = await transformCSSToLayout(css)

    expect(styles['.spaces'].zIndex).toBe(42)
    expect(styles['.tabs'].zIndex).toBe(99)
  })
})
