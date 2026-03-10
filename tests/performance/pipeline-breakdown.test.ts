/**
 * Pipeline Breakdown — Phase-by-Phase Performance Analysis
 *
 * Measures the rendering pipeline in stages and shows contribution of each phase
 * as a percentage of total time. Helps identify the current bottleneck instantly.
 *
 * Run with: bun test tests/performance/pipeline-breakdown.test.ts
 */

import { test, describe } from 'bun:test'
import { h } from 'vue'
import {
  timed,
  CSS_SCENARIOS,
  buildTreeSmall,
  buildTreeLarge,
  buildScenario,
} from './helpers'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutEngine } from '../../src/core/layout'
import { buildStackingContextTree } from '../../src/core/layout/stacking-context'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import { FrameDiffer } from '../../src/runtime/terminal/differ'

/**
 * Phase timing with stats
 */
interface PhaseResult {
  name: string
  mean: number
  opsPerSec: number
}

/**
 * Format a pipeline breakdown table
 */
function formatBreakdownTable(
  title: string,
  phases: PhaseResult[],
  totalExcludingParse: number
): string {
  const lines: string[] = []

  lines.push(`\n${title}`)
  lines.push('─'.repeat(65))

  // Header
  lines.push('Phase'.padEnd(30) + 'Mean'.padEnd(12) + '% of total' + '  Ops/sec')
  lines.push('─'.repeat(65))

  // Find the slowest phase (excluding CSS parse for "excl parse" total)
  const otherPhases = phases.filter((p) => !p.name.includes('CSS Parse'))
  const slowestPhase = otherPhases.reduce((a, b) => (a.mean > b.mean ? a : b))

  // Add each phase
  let totalWithParse = 0
  for (const phase of phases) {
    totalWithParse += phase.mean
  }

  for (const phase of phases) {
    const percent = phase.name.includes('CSS Parse')
      ? '---' // CSS parse often done once, not per frame
      : ((phase.mean / totalExcludingParse) * 100).toFixed(0) + '%'

    const marker = phase.mean === slowestPhase.mean ? '  ← SLOWEST' : ''

    lines.push(
      phase.name.padEnd(30) +
        phase.mean.toFixed(3).padStart(8) +
        'ms'.padEnd(5) +
        percent.padStart(9) +
        ' | ' +
        phase.opsPerSec.toFixed(0).padStart(6) +
        ' ops/sec' +
        marker
    )
  }

  lines.push('─'.repeat(65))
  lines.push(
    'Total (excl CSS parse)'.padEnd(30) +
      totalExcludingParse.toFixed(3).padStart(8) +
      'ms' +
      ' | (avg full cycle)'
  )
  lines.push('')

  return lines.join('\n')
}

// ============================================================================
// MEDIUM APP BREAKDOWN
// ============================================================================

describe('Pipeline Breakdown', () => {
  test('medium app breakdown (80×24, ~60 nodes)', async () => {
    const css = CSS_SCENARIOS.medium
    const vnode = buildTreeSmall()

    // Phase 1: CSS Parse
    const cssParseResult = timed(async () => {
      await transformCSSToLayout(css)
    }, 50)

    // Build styles (once)
    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))

    // Phase 2: Layout Tree Build
    const engine = createLayoutEngine(80, 24)
    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 50)

    const tree = engine.buildLayoutTree(vnode, styles)

    // Phase 3: Layout Compute
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 50)

    engine.computeLayout(tree)

    // Phase 4: Stacking Context Build
    const stackingResult = timed(() => {
      buildStackingContextTree(tree)
    }, 50)

    // Phase 5: Buffer Render
    const scenario = await buildScenario(css, vnode, 80, 24)
    const bufferResult = timed(() => {
      scenario.renderer.render(scenario.tree, scenario.buffer)
    }, 50)

    // Phase 6: Frame Differ (5% delta)
    const differ = new FrameDiffer()
    const changed = scenario.buffer.clone()
    const cellCount = 80 * 24
    const changeCount = Math.ceil(cellCount * 0.05)
    for (let i = 0; i < changeCount; i++) {
      const idx = i
      const x = idx % 80
      const y = Math.floor(idx / 80)
      changed.write(x, y, 'X', { color: 'red' })
    }

    const diffResult = timed(() => {
      differ.diff(scenario.buffer, changed)
    }, 50)

    // Calculate totals
    const phasesWithParse: PhaseResult[] = [
      { name: 'CSS Parse (medium)', mean: cssParseResult.mean, opsPerSec: 1000 / cssParseResult.mean },
      { name: 'Layout Tree Build', mean: treeResult.mean, opsPerSec: 1000 / treeResult.mean },
      { name: 'Layout Compute', mean: layoutResult.mean, opsPerSec: 1000 / layoutResult.mean },
      { name: 'Stacking Context Build', mean: stackingResult.mean, opsPerSec: 1000 / stackingResult.mean },
      { name: 'Buffer Render', mean: bufferResult.mean, opsPerSec: 1000 / bufferResult.mean },
      { name: 'Frame Differ (5% delta)', mean: diffResult.mean, opsPerSec: 1000 / diffResult.mean },
    ]

    const totalExcludingParse =
      treeResult.mean +
      layoutResult.mean +
      stackingResult.mean +
      bufferResult.mean +
      diffResult.mean

    console.log(
      formatBreakdownTable('Pipeline Phase Breakdown — Medium App (80×24, ~60 nodes)', phasesWithParse, totalExcludingParse)
    )
  })

  test('large app breakdown (220×50, ~200 nodes)', async () => {
    const css = CSS_SCENARIOS.large
    const vnode = buildTreeLarge()

    // Phase 1: CSS Parse
    const cssParseResult = timed(async () => {
      await transformCSSToLayout(css)
    }, 30)

    // Build styles (once)
    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))

    // Phase 2: Layout Tree Build
    const engine = createLayoutEngine(220, 50)
    const treeResult = timed(() => {
      engine.buildLayoutTree(vnode, styles)
    }, 30)

    const tree = engine.buildLayoutTree(vnode, styles)

    // Phase 3: Layout Compute
    const layoutResult = timed(() => {
      engine.computeLayout(tree)
    }, 30)

    engine.computeLayout(tree)

    // Phase 4: Stacking Context Build
    const stackingResult = timed(() => {
      buildStackingContextTree(tree)
    }, 30)

    // Phase 5: Buffer Render
    const scenario = await buildScenario(css, vnode, 220, 50)
    const bufferResult = timed(() => {
      scenario.renderer.render(scenario.tree, scenario.buffer)
    }, 30)

    // Phase 6: Frame Differ (5% delta)
    const differ = new FrameDiffer()
    const changed = scenario.buffer.clone()
    const cellCount = 220 * 50
    const changeCount = Math.ceil(cellCount * 0.05)
    for (let i = 0; i < changeCount; i++) {
      const idx = i
      const x = idx % 220
      const y = Math.floor(idx / 50)
      changed.write(x, y, 'X', { color: 'red' })
    }

    const diffResult = timed(() => {
      differ.diff(scenario.buffer, changed)
    }, 30)

    // Calculate totals
    const phasesWithParse: PhaseResult[] = [
      { name: 'CSS Parse (large)', mean: cssParseResult.mean, opsPerSec: 1000 / cssParseResult.mean },
      { name: 'Layout Tree Build', mean: treeResult.mean, opsPerSec: 1000 / treeResult.mean },
      { name: 'Layout Compute', mean: layoutResult.mean, opsPerSec: 1000 / layoutResult.mean },
      { name: 'Stacking Context Build', mean: stackingResult.mean, opsPerSec: 1000 / stackingResult.mean },
      { name: 'Buffer Render', mean: bufferResult.mean, opsPerSec: 1000 / bufferResult.mean },
      { name: 'Frame Differ (5% delta)', mean: diffResult.mean, opsPerSec: 1000 / diffResult.mean },
    ]

    const totalExcludingParse =
      treeResult.mean +
      layoutResult.mean +
      stackingResult.mean +
      bufferResult.mean +
      diffResult.mean

    console.log(
      formatBreakdownTable('Pipeline Phase Breakdown — Large App (220×50, ~200 nodes)', phasesWithParse, totalExcludingParse)
    )
  })
})
