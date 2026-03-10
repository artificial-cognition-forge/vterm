/**
 * Deep Dive into Layout Compute Bottleneck
 *
 * The extreme-scale tests showed that Layout Compute takes 48-59% of time
 * for scrollable containers with 500+ nodes. This test breaks down WHICH
 * part of layout compute is slow:
 *
 * - Flex algorithm? O(N²) child processing?
 * - Text wrapping on large text?
 * - Overflow/scroll computation?
 * - Recursive depth computation?
 *
 * Run with: bun test tests/performance/layout-deep-dive.test.ts
 */

import { test, describe, afterEach } from 'bun:test'
import { h, type VNode } from 'vue'
import { timed } from './helpers'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'
import { buildStackingContextTree } from '../../src/core/layout/stacking-context'

/**
 * Instrument layout engine to measure phases
 */
function createInstrumentedEngine(width: number, height: number) {
  const engine = createLayoutEngine(width, height)

  // We'll measure different scenarios and compare
  return { engine }
}

describe('Layout Compute Deep Dive', () => {
  // Test 1: Simple flex column (no text, no overflow)
  test('baseline: simple flex column (500 children)', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'item' }, `Item ${i}`)
      )
    )

    const css = `
      .list {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
      }
      .item {
        padding: 1;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)

    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`\nLayout Compute (500 simple items): ${layoutResult.mean.toFixed(3)}ms`)
  })

  // Test 2: Flex with wrapping text (text layout is expensive)
  test('with text content: flex column (500 children with text)', async () => {
    const longText = 'This is a longer piece of text that might need wrapping across multiple lines in the terminal.'

    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'item' }, `${i}: ${longText}`)
      )
    )

    const css = `
      .list {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
      }
      .item {
        padding: 1;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)

    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`Layout Compute (500 items with text): ${layoutResult.mean.toFixed(3)}ms`)
  })

  // Test 3: Nested flex (flex items each contain nested flex)
  test('nested flex: flex column with nested content (500 items × nested)', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'item' }, [
          h('div', { class: 'item-header' }, `Item ${i}`),
          h('div', { class: 'item-body' }, 'Content'),
        ])
      )
    )

    const css = `
      .list {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
      }
      .item {
        display: flex;
        flex-direction: column;
        padding: 1;
      }
      .item-header {
        color: cyan;
      }
      .item-body {
        color: white;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)

    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`Layout Compute (500 nested flex items): ${layoutResult.mean.toFixed(3)}ms`)
  })

  // Test 4: Flex with gap (gap might have different compute path)
  test('flex with gap: column with gap (500 items)', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'item' }, `Item ${i}`)
      )
    )

    const css = `
      .list {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        gap: 1;
      }
      .item {
        padding: 1;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)

    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`Layout Compute (500 items with gap): ${layoutResult.mean.toFixed(3)}ms`)
  })

  // Test 5: Flex with overflow/scroll (maybe overflow has expensive logic?)
  test('flex with overflow: column with overflow-y auto (500 items)', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'item' }, `Item ${i}`)
      )
    )

    const css = `
      .list {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow-y: auto;
      }
      .item {
        padding: 1;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)

    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`Layout Compute (500 items with overflow): ${layoutResult.mean.toFixed(3)}ms`)
  })

  // Test 6: Measure scaling factor (doubling node count)
  test('scaling analysis: 100 vs 200 vs 500 items', async () => {
    const measurements: Record<number, number> = {}

    for (const count of [100, 200, 500]) {
      const vnode = h('div', { class: 'list' },
        Array.from({ length: count }).map((_, i) =>
          h('div', { class: 'item' }, `Item ${i}`)
        )
      )

      const css = `
        .list {
          display: flex;
          flex-direction: column;
          width: 100%;
          height: 100%;
          overflow-y: auto;
        }
        .item {
          padding: 1;
        }
      `

      const parsed = await transformCSSToLayout(css)
      const styles = new Map(Object.entries(parsed))
      const engine = createLayoutEngine(220, 50)

      const tree = engine.buildLayoutTree(vnode, styles)

      const layoutResult = timed(() => {
        engine.computeLayout(tree)
      }, 20)

      measurements[count] = layoutResult.mean
    }

    console.log('\n🔍 Scaling Analysis:')
    console.log(`  100 items:  ${measurements[100].toFixed(3)}ms`)
    console.log(`  200 items:  ${measurements[200].toFixed(3)}ms (${(measurements[200] / measurements[100]).toFixed(1)}× at 2× nodes)`)
    console.log(`  500 items:  ${measurements[500].toFixed(3)}ms (${(measurements[500] / measurements[100]).toFixed(1)}× at 5× nodes)`)

    // If it's O(N²), doubling should be 4×, at 5× should be 25×
    // If it's O(N), doubling should be 2×, at 5× should be 5×
    // If it's O(N log N), doubling should be ~2.3×, at 5× should be ~5.6×
    const ratio = measurements[500] / measurements[100]
    if (ratio > 20) console.log('  ⚠️  Looks like O(N²) or worse!')
    else if (ratio > 10) console.log('  ⚠️  Looks like O(N log N) or worse!')
    else if (ratio > 6) console.log('  ✓ Looks like O(N log N)')
    else if (ratio > 4) console.log('  ✓ Looks like O(N)')
  })
})
