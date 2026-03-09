/**
 * Performance Limits Test Suite
 *
 * Hard-limit assertion tests that fail CI on regressions.
 * Run with: bun test tests/performance/limits.test.ts
 *
 * Philosophy: Limits start at ~3-5x measured baseline. As we optimize,
 * tighten them. The comments show what to tighten to after each optimization.
 */

import { test, describe, expect } from 'bun:test'
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
import { ScreenBuffer } from '../../src/runtime/terminal/buffer'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import { FrameDiffer } from '../../src/runtime/terminal/differ'

/**
 * Performance limits in milliseconds
 *
 * These are deliberately conservative on first run to establish a baseline.
 * After each optimization, tighten the relevant limit.
 */
const LIMITS = {
  // CSS Parsing
  cssParseSmall: 2,          // transformCSSToLayout for 5 properties
  cssParseMedium: 5,         // transformCSSToLayout for 20 properties with nesting
  cssParseLarge: 15,         // transformCSSToLayout for 50+ properties

  // Layout Engine - Tree Building
  layoutBuildSmall: 2,       // buildLayoutTree for 20 nodes
  layoutBuildLarge: 20,      // buildLayoutTree for 200 nodes

  // Layout Engine - Computation
  layoutComputeSmall: 2,     // computeLayout for 20 nodes
  layoutComputeMedium: 8,    // computeLayout for ~60 nodes, 80x24 terminal
  layoutComputeLarge: 25,    // computeLayout for 200 nodes, 220x50 terminal

  // Layout Engine - Depth
  layoutComputeDeep: 5,      // computeLayout for 10-level tree, each level 1 child

  // Buffer Renderer
  bufferRenderSmall: 5,      // render 80x24 minimal content
  bufferRenderLarge: 40,     // render 220x50 dense content

  // Frame Differ
  frameDifferFirst: 15,      // first render (full repaint)
  frameDifferIdentical: 2,   // identical frames (best case)
  frameDifferDelta: 8,       // 5% cells changed (typical incremental)

  // Full Pipeline End-to-End
  fullCycleSmall: 25,        // CSS + layout + render for small app
  fullCycleLarge: 100,       // CSS + layout + render for large app (200 nodes, 220x50)
}

/**
 * Helper to measure and assert
 */
function measureAndAssert(
  name: string,
  fn: () => void,
  limit: number,
  iterations: number = 50
): number {
  const result = timed(fn, iterations)
  const avg = result.mean

  console.log(`  ${name}`)
  console.log(`    p50: ${result.p50.toFixed(3)}ms, p95: ${result.p95.toFixed(3)}ms, max: ${result.max.toFixed(3)}ms, mean: ${avg.toFixed(3)}ms`)

  if (avg > limit) {
    console.error(`    ❌ FAILED: ${avg.toFixed(3)}ms > limit ${limit}ms`)
  } else {
    console.log(`    ✓ PASSED: ${avg.toFixed(3)}ms < limit ${limit}ms`)
  }

  expect(avg).toBeLessThan(limit)
  return avg
}

// ============================================================================
// CSS PARSING
// ============================================================================

describe('Performance: CSS Parsing', () => {
  test('small CSS (5 properties)', () => {
    measureAndAssert(
      'CSS parse - small',
      async () => {
        await transformCSSToLayout(CSS_SCENARIOS.small)
      },
      LIMITS.cssParseSmall,
      100
    )
  })

  test('medium CSS (20 properties, nesting)', () => {
    measureAndAssert(
      'CSS parse - medium',
      async () => {
        await transformCSSToLayout(CSS_SCENARIOS.medium)
      },
      LIMITS.cssParseMedium,
      50
    )
  })

  test('large CSS (50+ properties)', () => {
    measureAndAssert(
      'CSS parse - large',
      async () => {
        await transformCSSToLayout(CSS_SCENARIOS.large)
      },
      LIMITS.cssParseLarge,
      30
    )
  })
})

// ============================================================================
// LAYOUT ENGINE - TREE BUILDING
// ============================================================================

describe('Performance: Layout Tree Building', () => {
  test('small tree (20 nodes)', async () => {
    const css = CSS_SCENARIOS.small
    const vnode = buildTreeSmall()
    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(80, 24)

    measureAndAssert(
      'Layout tree build - small',
      () => {
        engine.buildLayoutTree(vnode, styles)
      },
      LIMITS.layoutBuildSmall,
      100
    )
  })

  test('large tree (200 nodes)', async () => {
    const css = CSS_SCENARIOS.large
    const vnode = buildTreeLarge()
    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(220, 50)

    measureAndAssert(
      'Layout tree build - large',
      () => {
        engine.buildLayoutTree(vnode, styles)
      },
      LIMITS.layoutBuildLarge,
      30
    )
  })
})

// ============================================================================
// LAYOUT ENGINE - COMPUTATION
// ============================================================================

describe('Performance: Layout Computation', () => {
  test('small tree (20 nodes)', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.small, buildTreeSmall(), 80, 24)

    measureAndAssert(
      'Layout compute - small',
      () => {
        scenario.engine.computeLayout(scenario.tree)
      },
      LIMITS.layoutComputeSmall,
      100
    )
  })

  test('medium tree (~60 nodes, 80x24 terminal)', async () => {
    const css = CSS_SCENARIOS.medium
    const vnode = buildTreeFlat(50)
    const scenario = await buildScenario(css, vnode, 80, 24)

    measureAndAssert(
      'Layout compute - medium',
      () => {
        scenario.engine.computeLayout(scenario.tree)
      },
      LIMITS.layoutComputeMedium,
      50
    )
  })

  test('large tree (200 nodes, 220x50 terminal)', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.large, buildTreeLarge(), 220, 50)

    measureAndAssert(
      'Layout compute - large',
      () => {
        scenario.engine.computeLayout(scenario.tree)
      },
      LIMITS.layoutComputeLarge,
      30
    )
  })

  test('deep tree (10 levels)', async () => {
    const css = CSS_SCENARIOS.small
    const vnode = buildTreeDeep(10)
    const scenario = await buildScenario(css, vnode, 80, 24)

    measureAndAssert(
      'Layout compute - deep',
      () => {
        scenario.engine.computeLayout(scenario.tree)
      },
      LIMITS.layoutComputeDeep,
      50
    )
  })
})

// ============================================================================
// BUFFER RENDERER
// ============================================================================

describe('Performance: Buffer Renderer', () => {
  test('small terminal (80x24, minimal content)', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.small, buildTreeSmall(), 80, 24)

    measureAndAssert(
      'Buffer render - small',
      () => {
        scenario.renderer.render(scenario.tree, scenario.buffer)
      },
      LIMITS.bufferRenderSmall,
      50
    )
  })

  test('large terminal (220x50, dense content)', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.large, buildTreeLarge(), 220, 50)

    measureAndAssert(
      'Buffer render - large',
      () => {
        scenario.renderer.render(scenario.tree, scenario.buffer)
      },
      LIMITS.bufferRenderLarge,
      30
    )
  })
})

// ============================================================================
// FRAME DIFFER
// ============================================================================

describe('Performance: Frame Differ', () => {
  test('first render (full repaint, prev=null)', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.medium, buildTreeSmall(), 80, 24)
    const differ = new FrameDiffer()

    measureAndAssert(
      'Frame differ - first render',
      () => {
        differ.diff(null, scenario.buffer)
      },
      LIMITS.frameDifferFirst,
      50
    )
  })

  test('identical frames (0 changes - best case)', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.medium, buildTreeSmall(), 80, 24)
    const differ = new FrameDiffer()

    measureAndAssert(
      'Frame differ - identical',
      () => {
        differ.diff(scenario.buffer, scenario.buffer)
      },
      LIMITS.frameDifferIdentical,
      100
    )
  })

  test('incremental update (5% cells changed)', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.medium, buildTreeSmall(), 80, 24)
    const differ = new FrameDiffer()
    const changed = scenario.buffer.clone()

    // Modify 5% of cells
    const cellCount = scenario.buffer.width * scenario.buffer.height
    const changeCount = Math.ceil(cellCount * 0.05)
    for (let i = 0; i < changeCount; i++) {
      const idx = Math.floor(Math.random() * cellCount)
      const x = idx % scenario.buffer.width
      const y = Math.floor(idx / scenario.buffer.width)
      changed.write(x, y, 'X', { color: 'red' })
    }

    measureAndAssert(
      'Frame differ - delta (5%)',
      () => {
        differ.diff(scenario.buffer, changed)
      },
      LIMITS.frameDifferDelta,
      50
    )
  })
})

// ============================================================================
// FULL PIPELINE END-TO-END
// ============================================================================

describe('Performance: Full Pipeline', () => {
  test('small app (CSS + layout + render)', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.small, buildTreeSmall(), 80, 24)

    measureAndAssert(
      'Full cycle - small',
      () => {
        // Simulate a complete render cycle: layout compute + buffer render
        scenario.engine.computeLayout(scenario.tree)
        scenario.renderer.render(scenario.tree, scenario.buffer)
      },
      LIMITS.fullCycleSmall,
      30
    )
  })

  test('large app (200 nodes, 220x50 terminal)', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.large, buildTreeLarge(), 220, 50)

    measureAndAssert(
      'Full cycle - large',
      () => {
        // Simulate a complete render cycle: layout compute + buffer render
        scenario.engine.computeLayout(scenario.tree)
        scenario.renderer.render(scenario.tree, scenario.buffer)
      },
      LIMITS.fullCycleLarge,
      20
    )
  })
})

// ============================================================================
// REGRESSION DETECTION SUMMARY
// ============================================================================

console.log('\n✓ Performance baseline established')
console.log('  Next step: Run benchmarks.bench.ts to see ops/sec breakdown')
console.log('  After optimization, tighten limits in this file and re-run')
