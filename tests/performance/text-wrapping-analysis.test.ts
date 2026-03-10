/**
 * Text Wrapping Performance Analysis
 *
 * Hypothesis: Text wrapping is expensive when applied to many nodes
 * This test measures layout compute WITH vs WITHOUT text content
 *
 * Run with: bun test tests/performance/text-wrapping-analysis.test.ts
 */

import { test, describe } from 'bun:test'
import { h } from 'vue'
import { timed } from './helpers'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'

describe('Text Wrapping Analysis', () => {
  // Baseline: Simple messages with short text
  test('messages with SHORT text', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'msg' },
          `Msg ${i}`
        )
      )
    )

    const css = `
      .list { display: flex; flex-direction: column; width: 100%; height: 100%; overflow-y: auto; }
      .msg { padding: 1; }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`\n📝 Text Wrapping Analysis:`)
    console.log(`   500 messages, SHORT text: ${layoutResult.mean.toFixed(3)}ms`)
  })

  // Longer text (single line but longer)
  test('messages with MEDIUM text', async () => {
    const mediumText = 'This is a message with some content. '

    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'msg' },
          `${i}: ${mediumText}`
        )
      )
    )

    const css = `
      .list { display: flex; flex-direction: column; width: 100%; height: 100%; overflow-y: auto; }
      .msg { padding: 1; }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`   500 messages, MEDIUM text: ${layoutResult.mean.toFixed(3)}ms`)
  })

  // Very long text (will wrap across multiple lines)
  test('messages with LONG text (will wrap)', async () => {
    const longText = 'This is a much longer message that will wrap across multiple lines in the terminal and cause text wrapping calculations to happen for every single message in the list.'

    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'msg' },
          `${i}: ${longText}`
        )
      )
    )

    const css = `
      .list { display: flex; flex-direction: column; width: 100%; height: 100%; overflow-y: auto; }
      .msg { padding: 1; }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`   500 messages, LONG text (wraps): ${layoutResult.mean.toFixed(3)}ms`)
  })

  // Match the actual Axon CLI structure
  test('AXON CLI pattern: rich message structure', async () => {
    const vnode = h('div', { class: 'message-list' },
      Array.from({ length: 500 }).map((_, i) => {
        const isUser = i % 4 === 0
        return h('div', { class: 'message-item' }, [
          h('div', { class: 'message-type' }, isUser ? 'user' : 'agent'),
          h('div', { class: 'message-text' },
            'This is a longer piece of text that might span multiple lines and cause text wrapping to occur. The terminal needs to calculate where line breaks happen.'
          ),
          h('div', { class: 'message-timestamp' }, `${i} mins`),
          h('div', { class: 'divider' }, '───────────────────────────────────────────'),
        ])
      })
    )

    const css = `
      .message-list {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        overflow-y: auto;
      }
      .message-item {
        padding: 1;
        border-bottom: 1px solid grey;
      }
      .message-type {
        color: cyan;
        font-weight: bold;
        margin-bottom: 1;
      }
      .message-text {
        color: white;
        padding: 1;
        margin-bottom: 1;
      }
      .message-timestamp {
        color: grey;
        font-size: 0;
        margin-bottom: 1;
      }
      .divider {
        color: #555;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`   500 Axon CLI messages: ${layoutResult.mean.toFixed(3)}ms`)
  })

  // Measure in isolation: tree build vs layout compute
  test('AXON CLI breakdown: tree build vs layout', async () => {
    const vnode = h('div', { class: 'message-list' },
      Array.from({ length: 500 }).map((_, i) => {
        const isUser = i % 4 === 0
        return h('div', { class: 'message-item' }, [
          h('div', { class: 'message-type' }, isUser ? 'user' : 'agent'),
          h('div', { class: 'message-text' },
            'This is a longer piece of text that might span multiple lines and cause text wrapping to occur. The terminal needs to calculate where line breaks happen.'
          ),
          h('div', { class: 'message-timestamp' }, `${i} mins`),
        ])
      })
    )

    const css = `
      .message-list { display: flex; flex-direction: column; width: 100%; height: 100%; overflow-y: auto; }
      .message-item { padding: 1; border-bottom: 1px solid grey; }
      .message-type { color: cyan; }
      .message-text { color: white; padding: 1; }
      .message-timestamp { color: grey; }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 30)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`\n   ─────────────────────`)
    console.log(`   Tree Build: ${treeResult.mean.toFixed(3)}ms`)
    console.log(`   Layout Compute: ${layoutResult.mean.toFixed(3)}ms`)
    console.log(`   Total: ${(treeResult.mean + layoutResult.mean).toFixed(3)}ms`)
    console.log(`   Layout is ${((layoutResult.mean / treeResult.mean) * 100).toFixed(0)}% of tree build`)
  })
})
