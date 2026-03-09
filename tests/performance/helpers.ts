/**
 * Performance Testing Helpers
 *
 * Shared utilities for measuring vterm rendering pipeline performance
 */

import { h, type VNode } from 'vue'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'
import { ScreenBuffer } from '../../src/runtime/terminal/buffer'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import { FrameDiffer } from '../../src/runtime/terminal/differ'
import { InteractionManager } from '../../src/runtime/renderer/interaction'
import type { LayoutNode } from '../../src/core/layout/types'

/**
 * Timing result with percentiles
 */
export interface TimingResult {
  p50: number  // median
  p95: number  // 95th percentile
  max: number  // maximum
  min: number  // minimum
  mean: number // average
}

/**
 * Run a function N times and collect timing stats
 * Automatically warmups 5 times first
 */
export function timed(fn: () => void, iterations: number = 100): TimingResult {
  // Warmup to stabilize JIT
  for (let i = 0; i < 5; i++) {
    fn()
  }

  // Measure
  const times: number[] = []
  for (let i = 0; i < iterations; i++) {
    const start = performance.now()
    fn()
    const end = performance.now()
    times.push(end - start)
  }

  // Sort for percentile calculation
  times.sort((a, b) => a - b)

  const mean = times.reduce((a, b) => a + b, 0) / times.length
  const p50 = times[Math.floor(times.length * 0.5)]
  const p95 = times[Math.floor(times.length * 0.95)]
  const max = times[times.length - 1]
  const min = times[0]

  return { p50, p95, max, min, mean }
}

/**
 * Build CSS test scenarios
 */
export const CSS_SCENARIOS = {
  small: `
    .box {
      display: flex;
      width: 20;
      height: 10;
    }
  `,
  medium: `
    .container {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      padding: 1;
      gap: 1;
    }
    .header {
      width: 100%;
      height: 3;
      background: blue;
      color: white;
    }
    .content {
      flex: 1;
      overflow: auto;
      padding: 2;
    }
    .item {
      margin-bottom: 1;
      padding: 1;
      border: 1px solid cyan;
    }
  `,
  large: `
    .app {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      background: black;
      color: white;
    }
    .header {
      display: flex;
      gap: 2;
      padding: 1;
      background: navy;
      border-bottom: 1px solid cyan;
    }
    .header-item {
      padding: 1;
      color: cyan;
    }
    .main {
      display: flex;
      flex: 1;
      gap: 2;
    }
    .sidebar {
      width: 20;
      overflow-y: auto;
      border-right: 1px solid green;
      padding: 1;
    }
    .content {
      flex: 1;
      overflow: auto;
      padding: 2;
    }
    .card {
      margin-bottom: 2;
      padding: 1;
      border: 1px solid yellow;
      background: #222;
    }
    .card-title {
      color: cyan;
      font-weight: bold;
      margin-bottom: 1;
    }
    .card-body {
      color: white;
      line-height: 1;
    }
    .footer {
      padding: 1;
      border-top: 1px solid cyan;
      background: navy;
      font-size: 0;
    }
  `,
}

/**
 * Build VNode tree test scenarios
 */
export function buildTreeSmall(): VNode {
  return h('div', { class: 'container' }, [
    h('div', { class: 'header' }, 'Header'),
    h('div', { class: 'content' }, [
      ...Array.from({ length: 18 }).map((_, i) =>
        h('div', { class: 'item' }, `Item ${i}`)
      ),
    ]),
  ])
}

export function buildTreeLarge(): VNode {
  return h('div', { class: 'app' }, [
    h('div', { class: 'header' }, [
      h('div', { class: 'header-item' }, 'Home'),
      h('div', { class: 'header-item' }, 'Settings'),
      h('div', { class: 'header-item' }, 'Help'),
    ]),
    h('div', { class: 'main' }, [
      h('div', { class: 'sidebar' }, [
        ...Array.from({ length: 10 }).map((_, i) =>
          h('div', { class: 'item' }, `Menu ${i}`)
        ),
      ]),
      h('div', { class: 'content' }, [
        ...Array.from({ length: 30 }).map((_, i) =>
          h('div', { class: 'card' }, [
            h('div', { class: 'card-title' }, `Card ${i}`),
            h('div', { class: 'card-body' }, `Content for card ${i}`),
          ])
        ),
      ]),
    ]),
    h('div', { class: 'footer' }, 'Footer'),
  ])
}

/**
 * Build a simple N-node flat tree
 */
export function buildTreeFlat(nodeCount: number): VNode {
  return h('div', { class: 'root' }, [
    ...Array.from({ length: nodeCount }).map((_, i) =>
      h('div', { class: `item-${i}` }, `Item ${i}`)
    ),
  ])
}

/**
 * Build a deep N-level tree
 */
export function buildTreeDeep(depth: number): VNode {
  let current = h('div', { class: 'leaf' }, 'End')
  for (let i = depth - 1; i > 0; i--) {
    current = h('div', { class: `level-${i}` }, [current])
  }
  return current
}

/**
 * Pre-built scenario: CSS + VNode + layout all prepared
 */
export interface RenderScenario {
  css: string
  vnode: VNode
  tree: LayoutNode
  buffer: ScreenBuffer
  renderer: BufferRenderer
  engine: ReturnType<typeof createLayoutEngine>
  width: number
  height: number
}

/**
 * Build a complete render scenario
 */
export async function buildScenario(
  css: string,
  vnode: VNode,
  width: number = 80,
  height: number = 24
): Promise<RenderScenario> {
  // Parse CSS
  const parsed = await transformCSSToLayout(css)
  const styles = new Map(Object.entries(parsed))

  // Build layout tree
  const engine = createLayoutEngine(width, height)
  const tree = engine.buildLayoutTree(vnode, styles)

  // Compute layout
  engine.computeLayout(tree)

  // Create buffer and renderer
  const buffer = new ScreenBuffer(width, height)
  const renderer = new BufferRenderer()

  return {
    css,
    vnode,
    tree,
    buffer,
    renderer,
    engine,
    width,
    height,
  }
}

/**
 * Measure CSS parser performance
 */
export function measureCSSParsing(css: string, iterations: number = 100): TimingResult {
  return timed(async () => {
    await transformCSSToLayout(css)
  }, iterations)
}

/**
 * Measure layout tree building
 */
export function measureLayoutTreeBuild(
  vnode: VNode,
  css: string,
  width: number = 80,
  height: number = 24,
  iterations: number = 50
): TimingResult {
  let styles: Map<string, any>
  let engine: ReturnType<typeof createLayoutEngine>

  return timed(() => {
    // Pre-parse CSS to isolate tree building
    engine = createLayoutEngine(width, height)
    engine.buildLayoutTree(vnode, styles)
  }, iterations)
}

/**
 * Measure layout computation
 */
export function measureLayoutCompute(
  tree: LayoutNode,
  engine: ReturnType<typeof createLayoutEngine>,
  iterations: number = 50
): TimingResult {
  return timed(() => {
    engine.computeLayout(tree)
  }, iterations)
}

/**
 * Measure buffer rendering
 */
export function measureBufferRender(
  tree: LayoutNode,
  buffer: ScreenBuffer,
  renderer: BufferRenderer,
  iterations: number = 50
): TimingResult {
  return timed(() => {
    renderer.render(tree, buffer)
  }, iterations)
}

/**
 * Measure frame differ
 */
export function measureFrameDiffer(
  differ: FrameDiffer,
  buffer: ScreenBuffer,
  scenario: 'first' | 'identical' | 'delta',
  iterations: number = 50
): TimingResult {
  if (scenario === 'first') {
    return timed(() => {
      differ.diff(null, buffer)
    }, iterations)
  } else if (scenario === 'identical') {
    return timed(() => {
      differ.diff(buffer, buffer)
    }, iterations)
  } else {
    // For delta, create a copy with 5% changed
    const changed = buffer.clone()
    const cellCount = buffer.width * buffer.height
    const changeCount = Math.ceil(cellCount * 0.05)
    for (let i = 0; i < changeCount; i++) {
      const idx = Math.floor(Math.random() * cellCount)
      const x = idx % buffer.width
      const y = Math.floor(idx / buffer.width)
      changed.write(x, y, 'X', { color: 'red' })
    }
    return timed(() => {
      differ.diff(buffer, changed)
    }, iterations)
  }
}
