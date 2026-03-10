/**
 * Axon CLI Structure Analysis
 *
 * The Axon pattern (500 messages × 4 children each) is 7× slower than simple list
 * This test isolates which part of the structure causes the slowdown
 *
 * Run with: bun test tests/performance/axon-structure-analysis.test.ts
 */

import { test, describe } from 'bun:test'
import { h } from 'vue'
import { timed } from './helpers'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'

describe('Axon Structure Analysis', () => {
  test('baseline: simple messages', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'msg' }, `Message ${i}`)
      )
    )

    const css = `.list { display: flex; flex-direction: column; width: 100%; }
                 .msg { padding: 1; }`

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`\n🔬 Axon Structure Breakdown:`)
    console.log(`   Baseline (simple): ${layoutResult.mean.toFixed(3)}ms`)
  })

  test('add: border-bottom to each message', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'msg' }, `Message ${i}`)
      )
    )

    const css = `.list { display: flex; flex-direction: column; width: 100%; }
                 .msg { padding: 1; border-bottom: 1px solid grey; }`

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`   + border-bottom: ${layoutResult.mean.toFixed(3)}ms`)
  })

  test('add: 4 children per message', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'msg' }, [
          h('div', 'Type'),
          h('div', 'Text'),
          h('div', 'Time'),
          h('div', 'Divider'),
        ])
      )
    )

    const css = `.list { display: flex; flex-direction: column; width: 100%; }
                 .msg { padding: 1; border-bottom: 1px solid grey; }`

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`   + 4 children per msg: ${layoutResult.mean.toFixed(3)}ms`)
  })

  test('add: classes on children', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'msg' }, [
          h('div', { class: 'type' }, 'Type'),
          h('div', { class: 'text' }, 'Text'),
          h('div', { class: 'time' }, 'Time'),
          h('div', { class: 'divider' }, 'Divider'),
        ])
      )
    )

    const css = `.list { display: flex; flex-direction: column; width: 100%; }
                 .msg { padding: 1; border-bottom: 1px solid grey; }
                 .type { color: cyan; }
                 .text { color: white; }
                 .time { color: grey; }
                 .divider { color: #555; }`

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`   + child classes: ${layoutResult.mean.toFixed(3)}ms`)
  })

  test('add: padding on children', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'msg' }, [
          h('div', { class: 'type' }, 'Type'),
          h('div', { class: 'text' }, 'Text'),
          h('div', { class: 'time' }, 'Time'),
          h('div', { class: 'divider' }, 'Divider'),
        ])
      )
    )

    const css = `.list { display: flex; flex-direction: column; width: 100%; }
                 .msg { padding: 1; border-bottom: 1px solid grey; }
                 .type { color: cyan; padding: 1; }
                 .text { color: white; padding: 1; }
                 .time { color: grey; padding: 1; }
                 .divider { color: #555; padding: 1; }`

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`   + padding on children: ${layoutResult.mean.toFixed(3)}ms`)
  })

  test('add: margin on children', async () => {
    const vnode = h('div', { class: 'list' },
      Array.from({ length: 500 }).map((_, i) =>
        h('div', { class: 'msg' }, [
          h('div', { class: 'type' }, 'Type'),
          h('div', { class: 'text' }, 'Text'),
          h('div', { class: 'time' }, 'Time'),
          h('div', { class: 'divider' }, 'Divider'),
        ])
      )
    )

    const css = `.list { display: flex; flex-direction: column; width: 100%; }
                 .msg { padding: 1; border-bottom: 1px solid grey; }
                 .type { color: cyan; padding: 1; margin-bottom: 1; }
                 .text { color: white; padding: 1; margin-bottom: 1; }
                 .time { color: grey; padding: 1; margin-bottom: 1; }
                 .divider { color: #555; padding: 1; }`

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const tree = engine.buildLayoutTree(vnode, styles)
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    console.log(`   + margin on children: ${layoutResult.mean.toFixed(3)}ms`)
  })

  test('full Axon pattern', async () => {
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

    console.log(`   + FULL Axon pattern: ${layoutResult.mean.toFixed(3)}ms`)
  })
})
