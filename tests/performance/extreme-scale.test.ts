/**
 * Extreme Scale Testing — Push VTerm to its limits
 *
 * This test suite profiles massive apps to identify scaling bottlenecks:
 * - 500+ node flat trees
 * - Deep nesting (20+ levels)
 * - Heavy CSS rulesets (1000+ rules)
 * - Complex flex layouts
 * - Large scrollable containers
 *
 * Run with: bun test tests/performance/extreme-scale.test.ts
 */

import { test, describe } from 'bun:test'
import { h, type VNode } from 'vue'
import { timed, buildScenario } from './helpers'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'
import { buildStackingContextTree } from '../../src/core/layout/stacking-context'

/**
 * Format phase results with detailed timing
 */
function formatPhaseResults(title: string, phases: Record<string, number>): string {
  const lines: string[] = []
  lines.push(`\n${title}`)
  lines.push('─'.repeat(70))

  let total = 0
  for (const ms of Object.values(phases)) total += ms

  for (const [name, ms] of Object.entries(phases)) {
    const percent = ((ms / total) * 100).toFixed(1)
    lines.push(
      name.padEnd(30) +
      ms.toFixed(3).padStart(8) + 'ms' +
      percent.padStart(8) + '%'
    )
  }

  lines.push('─'.repeat(70))
  lines.push('Total'.padEnd(30) + total.toFixed(3).padStart(8) + 'ms')
  lines.push('')

  return lines.join('\n')
}

// ============================================================================
// EXTREME CASE 1: Massive Flat List (500 nodes)
// ============================================================================

/**
 * Helper: Build a scrollable container with many rich items (like ChatMessage list)
 * Each item has multiple sub-elements: type label + text + metadata
 */
function buildRichItemList(itemCount: number, itemsPerGroup: number = 5) {
  const items = Array.from({ length: itemCount }).map((_, i) => {
    // Each item = 5 nodes: wrapper + type + text + metadata + divider
    const content = h('div', { class: 'message-content' }, [
      h('div', { class: 'message-type' }, i % 4 === 0 ? 'user' : 'agent'),
      h('div', { class: 'message-text' }, `Message ${i}: This is a sample message that could be quite long.`),
      h('div', { class: 'message-meta' }, `${i} min ago`),
      h('div', { class: 'message-divider' }, ''),
    ])
    return content
  })
  return h('div', { class: 'message-list' }, items)
}

describe('Extreme Scale Tests', () => {
  // ============================================================================
  // CHAT-LIKE SCROLLABLE CONTAINER (matching Axon CLI use case)
  // ============================================================================

  test('scrollable message list (100 items, 220×50 terminal) - FULL PIPELINE', async () => {
    const vnode = buildRichItemList(100)
    const css = `
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
      .message-type {
        color: cyan;
      }
      .message-text {
        color: white;
        padding: 1 0;
      }
      .message-meta {
        color: grey;
        font-size: 0.8em;
      }
      .message-divider {
        height: 1;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const phases: Record<string, number> = {}

    // Tree build (100 items × 5 nodes each = 500 nodes)
    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 10)
    phases['Tree Build (500 nodes)'] = treeResult.mean

    const tree = engine.buildLayoutTree(vnode, styles)

    // Layout compute
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 10)
    phases['Layout Compute'] = layoutResult.mean

    engine.computeLayout(tree)

    // Stacking context
    const stackingResult = timed(() => {
      buildStackingContextTree(tree)
    }, 10)
    phases['Stacking Context'] = stackingResult.mean

    // Buffer render (FULL PIPELINE - this is critical)
    const scenario = await buildScenario(css, vnode, 220, 50)
    const renderResult = timed(() => {
      scenario.renderer.render(scenario.tree, scenario.buffer)
    }, 10)
    phases['Buffer Render'] = renderResult.mean

    console.log(formatPhaseResults('CHAT-LIKE: 100 Messages (500 nodes, 220×50)', phases))
  })

  test('scrollable message list (250 items, 220×50 terminal) - FULL PIPELINE', async () => {
    const vnode = buildRichItemList(250)
    const css = `
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
      .message-type {
        color: cyan;
      }
      .message-text {
        color: white;
        padding: 1 0;
      }
      .message-meta {
        color: grey;
      }
      .message-divider {
        height: 1;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const phases: Record<string, number> = {}

    // Tree build (250 items × 5 nodes each = 1250 nodes)
    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 10)
    phases['Tree Build (1250 nodes)'] = treeResult.mean

    const tree = engine.buildLayoutTree(vnode, styles)

    // Layout compute
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 10)
    phases['Layout Compute'] = layoutResult.mean

    engine.computeLayout(tree)

    // Stacking context
    const stackingResult = timed(() => {
      buildStackingContextTree(tree)
    }, 10)
    phases['Stacking Context'] = stackingResult.mean

    // Buffer render
    const scenario = await buildScenario(css, vnode, 220, 50)
    const renderResult = timed(() => {
      scenario.renderer.render(scenario.tree, scenario.buffer)
    }, 10)
    phases['Buffer Render'] = renderResult.mean

    console.log(formatPhaseResults('CHAT-LIKE: 250 Messages (1250 nodes, 220×50)', phases))
  })

  test('scrollable message list (500 items, 220×50 terminal) - FULL PIPELINE', async () => {
    const vnode = buildRichItemList(500)
    const css = `
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
      .message-type {
        color: cyan;
      }
      .message-text {
        color: white;
        padding: 1 0;
      }
      .message-meta {
        color: grey;
      }
      .message-divider {
        height: 1;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    const phases: Record<string, number> = {}

    // Tree build (500 items × 5 nodes each = 2500 nodes)
    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 10)
    phases['Tree Build (2500 nodes)'] = treeResult.mean

    const tree = engine.buildLayoutTree(vnode, styles)

    // Layout compute
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 10)
    phases['Layout Compute'] = layoutResult.mean

    engine.computeLayout(tree)

    // Stacking context
    const stackingResult = timed(() => {
      buildStackingContextTree(tree)
    }, 10)
    phases['Stacking Context'] = stackingResult.mean

    // Buffer render
    const scenario = await buildScenario(css, vnode, 220, 50)
    const renderResult = timed(() => {
      scenario.renderer.render(scenario.tree, scenario.buffer)
    }, 10)
    phases['Buffer Render'] = renderResult.mean

    console.log(formatPhaseResults('CHAT-LIKE: 500 Messages (2500 nodes, 220×50)', phases))
  })

  // ============================================================================
  // ORIGINAL TEST SUITE
  // ============================================================================

  test('massive flat list (500 nodes, 80×24 terminal)', async () => {
    // Build 500 flat items in a container
    const nodes = Array.from({ length: 500 }).map((_, i) =>
      h('div', { class: 'item' }, `Item ${i}`)
    )
    const vnode = h('div', { class: 'list' }, nodes)

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
        border-bottom: 1px solid grey;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))

    const engine = createLayoutEngine(80, 24)

    const phases: Record<string, number> = {}

    // Tree build
    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 10)
    phases['Tree Build (500 nodes)'] = treeResult.mean

    const tree = engine.buildLayoutTree(vnode, styles)

    // Layout compute
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 10)
    phases['Layout Compute'] = layoutResult.mean

    engine.computeLayout(tree)

    // Stacking
    const stackingResult = timed(() => {
      buildStackingContextTree(tree)
    }, 10)
    phases['Stacking Context'] = stackingResult.mean

    // Render (skip for now, focus on tree/layout/stacking bottlenecks)
    // const buffer = new ScreenBuffer(80, 24)
    // const renderer = new BufferRenderer(buffer, new InteractionManager())
    // const stackingContext = buildStackingContextTree(tree)

    console.log(formatPhaseResults('Extreme Case 1: 500-Node Flat List', phases))
  })

  // ============================================================================
  // EXTREME CASE 2: Deep Nesting (20 levels)
  // ============================================================================

  test('deep nesting (20 levels, 80×24 terminal)', async () => {
    // Build deeply nested structure
    let vnode = h('div', { class: 'item' }, 'Content')
    for (let i = 0; i < 20; i++) {
      vnode = h('div', { class: 'nested' }, vnode)
    }

    const css = `
      .nested {
        display: flex;
        padding: 1;
        width: 100%;
        height: 100%;
      }
      .item {
        padding: 1;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))

    const engine = createLayoutEngine(80, 24)

    const phases: Record<string, number> = {}

    // Tree build
    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 10)
    phases['Tree Build (20 levels)'] = treeResult.mean

    const tree = engine.buildLayoutTree(vnode, styles)

    // Layout compute
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 10)
    phases['Layout Compute'] = layoutResult.mean

    engine.computeLayout(tree)

    // Stacking
    const stackingResult = timed(() => {
      buildStackingContextTree(tree)
    }, 10)
    phases['Stacking Context'] = stackingResult.mean

    console.log(formatPhaseResults('Extreme Case 2: 20-Level Deep Nesting', phases))
  })

  // ============================================================================
  // EXTREME CASE 3: Heavy CSS (1000+ rules)
  // ============================================================================

  test('heavy CSS ruleset (1000+ rules, 200 nodes)', async () => {
    // Build 200-node tree
    const nodes = Array.from({ length: 200 }).map((_, i) =>
      h('div', { class: `item-${i % 50}` }, `Item ${i}`)
    )
    const vnode = h('div', { class: 'root' }, nodes)

    // Generate 1000+ CSS rules
    let css = '.root { display: flex; flex-direction: column; }\n'
    for (let i = 0; i < 50; i++) {
      css += `.item-${i} { padding: ${(i % 4) + 1}; color: #${Math.random().toString(16).slice(2, 8)}; }\n`
    }

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))

    const engine = createLayoutEngine(80, 24)

    const phases: Record<string, number> = {}

    // Tree build
    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 10)
    phases['Tree Build (200 nodes)'] = treeResult.mean

    const tree = engine.buildLayoutTree(vnode, styles)

    // Layout compute
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 10)
    phases['Layout Compute'] = layoutResult.mean

    engine.computeLayout(tree)

    // Stacking
    const stackingResult = timed(() => {
      buildStackingContextTree(tree)
    }, 10)
    phases['Stacking Context'] = stackingResult.mean

    console.log(formatPhaseResults('Extreme Case 3: 1000+ CSS Rules', phases))
  })

  // ============================================================================
  // EXTREME CASE 4: Complex Flexbox Grid (16×16 = 256 flex items)
  // ============================================================================

  test('complex flexbox grid (16×16 = 256 items)', async () => {
    const rows = Array.from({ length: 16 }).map((_, rowIdx) =>
      h('div', { class: 'row' }, [
        ...Array.from({ length: 16 }).map((_, colIdx) =>
          h('div', { class: 'cell' }, `${rowIdx},${colIdx}`)
        ),
      ])
    )
    const vnode = h('div', { class: 'grid' }, rows)

    const css = `
      .grid {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
        gap: 1;
      }
      .row {
        display: flex;
        gap: 1;
        flex: 1;
      }
      .cell {
        flex: 1;
        padding: 1;
        border: 1px solid green;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))

    const engine = createLayoutEngine(220, 50)

    const phases: Record<string, number> = {}

    // Tree build
    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 10)
    phases['Tree Build (256 flex items)'] = treeResult.mean

    const tree = engine.buildLayoutTree(vnode, styles)

    // Layout compute
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 10)
    phases['Layout Compute'] = layoutResult.mean

    engine.computeLayout(tree)

    // Stacking
    const stackingResult = timed(() => {
      buildStackingContextTree(tree)
    }, 10)
    phases['Stacking Context'] = stackingResult.mean

    console.log(formatPhaseResults('Extreme Case 4: 16×16 Flex Grid (256 items)', phases))
  })

  // ============================================================================
  // EXTREME CASE 5: Very Large Terminal (500×200 = 100k cells)
  // ============================================================================

  test('very large terminal (500×200, 100k cells)', async () => {
    const nodes = Array.from({ length: 100 }).map((_, i) =>
      h('div', { class: 'line' }, `Line ${i}`)
    )
    const vnode = h('div', { class: 'content' }, nodes)

    const css = `
      .content {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
      }
      .line {
        padding: 1;
      }
    `

    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))

    const engine = createLayoutEngine(500, 200)

    const phases: Record<string, number> = {}

    // Tree build
    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 10)
    phases['Tree Build'] = treeResult.mean

    const tree = engine.buildLayoutTree(vnode, styles)

    // Layout compute
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 10)
    phases['Layout Compute'] = layoutResult.mean

    engine.computeLayout(tree)

    // Stacking
    const stackingResult = timed(() => {
      buildStackingContextTree(tree)
    }, 5)
    phases['Stacking Context'] = stackingResult.mean

    console.log(formatPhaseResults('Extreme Case 5: Very Large Terminal (500×200)', phases))
  })
})
