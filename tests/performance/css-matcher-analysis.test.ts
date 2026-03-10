/**
 * CSS Transformer Performance Analysis
 *
 * Hypothesis: With large node counts, CSS selector matching becomes expensive
 * This test isolates CSS matching overhead from flex compute overhead
 *
 * Run with: bun test tests/performance/css-matcher-analysis.test.ts
 */

import { test, describe } from 'bun:test'
import { h } from 'vue'
import { timed } from './helpers'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'

describe('CSS Matcher Analysis', () => {
  test('500-node tree: Tree build with complex CSS', async () => {
    const richItemList = h('div', { class: 'message-list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'message-content' }, [
          h('div', { class: 'message-type' }, i % 4 === 0 ? 'user' : 'agent'),
          h('div', { class: 'message-text' }, `Message ${i}: This is a sample message.`),
          h('div', { class: 'message-meta' }, `${i} min ago`),
          h('div', { class: 'message-divider' }, ''),
        ])
      )
    )

    const complexCSS = `
      .message-list {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow-y: auto;
      }
      .message-content {
        padding: 1;
        border-bottom: 1px solid grey;
      }
      .message-content:hover {
        background: #333;
      }
      .message-type {
        color: cyan;
        font-weight: bold;
      }
      .message-type[class*="user"] {
        color: yellow;
      }
      .message-text {
        color: white;
        padding: 1 0;
        margin: 1;
      }
      .message-text:active {
        color: green;
      }
      .message-meta {
        color: grey;
        font-size: 0;
      }
      .message-divider {
        height: 1;
        background: #555;
      }
      /* Additional noise rules */
      .message-content:focus { outline: 1px solid white; }
      .message-text:focus { outline: 1px solid green; }
      .message-meta:focus { outline: 1px solid blue; }
      .message-type:focus { outline: 1px solid yellow; }
    `

    const parsed = await transformCSSToLayout(complexCSS)
    const styles = new Map(Object.entries(parsed))

    const engine = createLayoutEngine(220, 50)

    // Measure tree build WITH CSS matching
    const treeWithCSSResult = timed(() => {
      engine.buildLayoutTree(richItemList, styles)
    }, 30)

    console.log(`\n📊 Tree Build with CSS Matching:`)
    console.log(`   500-node tree (2500 total divs): ${treeWithCSSResult.mean.toFixed(3)}ms`)
    console.log(`   (This includes CSS selector matching overhead)`)

    // Now measure tree build WITHOUT CSS matching
    const emptyStyles = new Map()
    const treeNoCSSResult = timed(() => {
      engine.buildLayoutTree(richItemList, emptyStyles)
    }, 30)

    console.log(`\n   Same tree, NO CSS (baseline): ${treeNoCSSResult.mean.toFixed(3)}ms`)

    const cssMatchingOverhead = treeWithCSSResult.mean - treeNoCSSResult.mean
    const cssPercentage = (cssMatchingOverhead / treeWithCSSResult.mean) * 100

    console.log(`\n   CSS Matching Overhead: ${cssMatchingOverhead.toFixed(3)}ms (${cssPercentage.toFixed(1)}%)`)

    // Now measure layout compute AFTER tree is built
    const tree = engine.buildLayoutTree(richItemList, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`\n   Layout Compute (flex algorithm): ${layoutResult.mean.toFixed(3)}ms`)
    console.log(`   ────────────────────────────────────────`)
    console.log(`   Total Tree + Layout: ${(treeWithCSSResult.mean + layoutResult.mean).toFixed(3)}ms`)
  })

  test('selector complexity test: increasing specificity', async () => {
    console.log('\n🔍 Selector Complexity Impact:')

    for (const ruleCount of [10, 50, 100, 200]) {
      let css = '.root { display: flex; flex-direction: column; }\n'
      for (let i = 0; i < ruleCount; i++) {
        css += `.item-${i} { padding: 1; color: #${Math.random().toString(16).slice(2, 8)}; }\n`
      }

      const tree = h('div', { class: 'root' },
        Array.from({ length: 500 }).map((_, i) =>
          h('div', { class: `item-${i % ruleCount}` }, `Item ${i}`)
        )
      )

      const parsed = await transformCSSToLayout(css)
      const styles = new Map(Object.entries(parsed))
      const engine = createLayoutEngine(220, 50)

      const treeResult = timed(() => {
        engine.buildLayoutTree(tree, styles)
      }, 30)

      console.log(`   ${ruleCount} CSS rules: ${treeResult.mean.toFixed(3)}ms`)
    }
  })
})
