/**
 * Performance Benchmarks
 *
 * Statistical benchmarks for discovery using timed() helper.
 * Run with: bun test tests/performance/benchmarks.test.ts
 *
 * These are for profiling and understanding throughput — they never fail CI.
 * Output shows ops/sec, min/max timing, and helps identify hot paths.
 */

import { test, describe } from 'bun:test'
import { h } from 'vue'
import {
  timed,
  CSS_SCENARIOS,
  buildTreeSmall,
  buildTreeLarge,
  buildTreeFlat,
  buildTreeDeep,
  buildScenario,
} from './helpers'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import { FrameDiffer } from '../../src/runtime/terminal/differ'

/**
 * Helper to report benchmark stats
 */
function reportBench(name: string, iterations: number, result: ReturnType<typeof timed>) {
  const opsPerSec = (1000 / result.mean) * 1
  console.log(`  ${name}`)
  console.log(`    ${opsPerSec.toFixed(0)} ops/sec | mean: ${result.mean.toFixed(3)}ms | p95: ${result.p95.toFixed(3)}ms | max: ${result.max.toFixed(3)}ms`)
}

// ============================================================================
// CSS PARSING BENCHMARKS
// ============================================================================

describe('Bench: CSS Parsing', () => {
  test('CSS parse - small', async () => {
    const result = timed(async () => {
      await transformCSSToLayout(CSS_SCENARIOS.small)
    }, 100)
    reportBench('CSS parse - small', 100, result)
  })

  test('CSS parse - medium', async () => {
    const result = timed(async () => {
      await transformCSSToLayout(CSS_SCENARIOS.medium)
    }, 50)
    reportBench('CSS parse - medium', 50, result)
  })

  test('CSS parse - large', async () => {
    const result = timed(async () => {
      await transformCSSToLayout(CSS_SCENARIOS.large)
    }, 30)
    reportBench('CSS parse - large', 30, result)
  })
})

// ============================================================================
// LAYOUT ENGINE BENCHMARKS
// ============================================================================

describe('Bench: Layout Engine', async () => {
  // Tree building benches
  const smallParsed = await transformCSSToLayout(CSS_SCENARIOS.small)
  const smallStyles = new Map(Object.entries(smallParsed))
  const smallVNode = buildTreeSmall()
  const smallEngine = createLayoutEngine(80, 24)

  test('Layout tree build - small (20 nodes)', () => {
    const result = timed(() => {
      smallEngine.buildLayoutTree(smallVNode, smallStyles)
    }, 100)
    reportBench('Layout tree build - small', 100, result)
  })

  const largeParsed = await transformCSSToLayout(CSS_SCENARIOS.large)
  const largeStyles = new Map(Object.entries(largeParsed))
  const largeVNode = buildTreeLarge()
  const largeEngine = createLayoutEngine(220, 50)

  test('Layout tree build - large (200 nodes)', () => {
    const result = timed(() => {
      largeEngine.buildLayoutTree(largeVNode, largeStyles)
    }, 30)
    reportBench('Layout tree build - large', 30, result)
  })

  // Compute benches
  const smallScenario = await buildScenario(CSS_SCENARIOS.small, buildTreeSmall(), 80, 24)

  test('Layout compute - small (20 nodes)', () => {
    const result = timed(() => {
      smallScenario.engine.computeLayout(smallScenario.tree)
    }, 100)
    reportBench('Layout compute - small', 100, result)
  })

  const flatVNode = buildTreeFlat(50)
  const mediumScenario = await buildScenario(CSS_SCENARIOS.medium, flatVNode, 80, 24)

  test('Layout compute - medium (60 nodes)', () => {
    const result = timed(() => {
      mediumScenario.engine.computeLayout(mediumScenario.tree)
    }, 50)
    reportBench('Layout compute - medium', 50, result)
  })

  const largeScenario = await buildScenario(CSS_SCENARIOS.large, buildTreeLarge(), 220, 50)

  test('Layout compute - large (200 nodes)', () => {
    const result = timed(() => {
      largeScenario.engine.computeLayout(largeScenario.tree)
    }, 30)
    reportBench('Layout compute - large', 30, result)
  })

  const deepVNode = buildTreeDeep(10)
  const deepScenario = await buildScenario(CSS_SCENARIOS.small, deepVNode, 80, 24)

  test('Layout compute - deep (10 levels)', () => {
    const result = timed(() => {
      deepScenario.engine.computeLayout(deepScenario.tree)
    }, 50)
    reportBench('Layout compute - deep', 50, result)
  })
})

// ============================================================================
// BUFFER RENDERER BENCHMARKS
// ============================================================================

describe('Bench: Buffer Renderer', async () => {
  const smallScenario = await buildScenario(CSS_SCENARIOS.small, buildTreeSmall(), 80, 24)

  test('Buffer render - small (80x24)', () => {
    const result = timed(() => {
      smallScenario.renderer.render(smallScenario.tree, smallScenario.buffer)
    }, 50)
    reportBench('Buffer render - small', 50, result)
  })

  const largeScenario = await buildScenario(CSS_SCENARIOS.large, buildTreeLarge(), 220, 50)

  test('Buffer render - large (220x50)', () => {
    const result = timed(() => {
      largeScenario.renderer.render(largeScenario.tree, largeScenario.buffer)
    }, 30)
    reportBench('Buffer render - large', 30, result)
  })
})

// ============================================================================
// FRAME DIFFER BENCHMARKS
// ============================================================================

describe('Bench: Frame Differ', async () => {
  const scenario = await buildScenario(CSS_SCENARIOS.medium, buildTreeSmall(), 80, 24)
  const differ = new FrameDiffer()

  test('Frame differ - first render', () => {
    const result = timed(() => {
      differ.diff(null, scenario.buffer)
    }, 50)
    reportBench('Frame differ - first render', 50, result)
  })

  test('Frame differ - identical frames', () => {
    const result = timed(() => {
      differ.diff(scenario.buffer, scenario.buffer)
    }, 100)
    reportBench('Frame differ - identical', 100, result)
  })

  const changed = scenario.buffer.clone()
  const cellCount = scenario.buffer.width * scenario.buffer.height
  const changeCount = Math.ceil(cellCount * 0.05)
  for (let i = 0; i < changeCount; i++) {
    const idx = Math.floor(Math.random() * cellCount)
    const x = idx % scenario.buffer.width
    const y = Math.floor(idx / scenario.buffer.width)
    changed.write(x, y, 'X', { color: 'red' })
  }

  test('Frame differ - delta (5% changed)', () => {
    const result = timed(() => {
      differ.diff(scenario.buffer, changed)
    }, 50)
    reportBench('Frame differ - delta', 50, result)
  })
})

// ============================================================================
// FULL PIPELINE BENCHMARKS
// ============================================================================

describe('Bench: Full Pipeline', async () => {
  const smallScenario = await buildScenario(CSS_SCENARIOS.small, buildTreeSmall(), 80, 24)

  test('Full cycle - small app', () => {
    const result = timed(() => {
      smallScenario.engine.computeLayout(smallScenario.tree)
      smallScenario.renderer.render(smallScenario.tree, smallScenario.buffer)
    }, 30)
    reportBench('Full cycle - small', 30, result)
  })

  const largeScenario = await buildScenario(CSS_SCENARIOS.large, buildTreeLarge(), 220, 50)

  test('Full cycle - large app', () => {
    const result = timed(() => {
      largeScenario.engine.computeLayout(largeScenario.tree)
      largeScenario.renderer.render(largeScenario.tree, largeScenario.buffer)
    }, 20)
    reportBench('Full cycle - large', 20, result)
  })
})
