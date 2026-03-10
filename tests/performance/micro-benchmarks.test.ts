/**
 * Micro-Benchmarks — Granular Sub-Operation Performance
 *
 * Measures individual operations within the rendering pipeline:
 * buffer ops, CSS parsing, layout algorithms, ANSI encoding, frame diffing.
 *
 * Run with: bun test tests/performance/micro-benchmarks.test.ts
 */

import { test, describe } from 'bun:test'
import { h } from 'vue'
import {
  timed,
  CSS_SCENARIOS,
  buildTreeFlat,
  buildTreeDeep,
  buildScenario,
} from './helpers'
import { transformDeclaration } from '../../src/core/css/declaration-transformer'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { resolveDimension, computeFlexLayout } from '../../src/core/layout/flexbox'
import { buildStackingContextTree } from '../../src/core/layout/stacking-context'
import { ScreenBuffer } from '../../src/runtime/terminal/buffer'
import { AnsiWriter } from '../../src/runtime/terminal/ansi'
import { FrameDiffer } from '../../src/runtime/terminal/differ'
import type { LayoutProperties } from '../../src/core/layout/types'

/**
 * Report a single micro-benchmark result
 */
function reportMicro(name: string, result: ReturnType<typeof timed>) {
  const opsPerSec = (1000 / result.mean) * 1
  console.log(
    `  ${name.padEnd(45)} | ${opsPerSec.toFixed(0).padStart(8)} ops/sec | ${result.mean.toFixed(3)}ms`
  )
}

// ============================================================================
// BUFFER OPERATIONS
// ============================================================================

describe('Micro: Buffer Operations', () => {
  test('buffer.clear() - 80×24', () => {
    const buffer = new ScreenBuffer(80, 24)
    buffer.fill(0, 0, 80, 24, 'X', { color: 'cyan' })
    const result = timed(() => {
      buffer.clear()
    }, 200)
    reportMicro('buffer.clear() — 80×24', result)
  })

  test('buffer.clear() - 120×30', () => {
    const buffer = new ScreenBuffer(120, 30)
    buffer.fill(0, 0, 120, 30, 'X', { color: 'cyan' })
    const result = timed(() => {
      buffer.clear()
    }, 200)
    reportMicro('buffer.clear() — 120×30', result)
  })

  test('buffer.clear() - 220×50', () => {
    const buffer = new ScreenBuffer(220, 50)
    buffer.fill(0, 0, 220, 50, 'X', { color: 'cyan' })
    const result = timed(() => {
      buffer.clear()
    }, 200)
    reportMicro('buffer.clear() — 220×50', result)
  })

  test('buffer.fill() - small (10×3)', () => {
    const buffer = new ScreenBuffer(80, 24)
    const result = timed(() => {
      buffer.fill(5, 5, 15, 8, 'X', { color: 'red' })
    }, 300)
    reportMicro('buffer.fill() — small (10×3)', result)
  })

  test('buffer.fill() - medium (40×10)', () => {
    const buffer = new ScreenBuffer(80, 24)
    const result = timed(() => {
      buffer.fill(10, 5, 50, 15, 'X', { color: 'green' })
    }, 200)
    reportMicro('buffer.fill() — medium (40×10)', result)
  })

  test('buffer.fill() - full screen (80×24)', () => {
    const buffer = new ScreenBuffer(80, 24)
    const result = timed(() => {
      buffer.fill(0, 0, 80, 24, 'X', { color: 'blue' })
    }, 100)
    reportMicro('buffer.fill() — full screen (80×24)', result)
  })

  test('buffer.write() - 1 char', () => {
    const buffer = new ScreenBuffer(80, 24)
    const result = timed(() => {
      buffer.write(40, 12, 'X', { color: 'yellow' })
    }, 1000)
    reportMicro('buffer.write() — 1 char', result)
  })

  test('buffer.write() - 10 chars', () => {
    const buffer = new ScreenBuffer(80, 24)
    const result = timed(() => {
      for (let i = 0; i < 10; i++) {
        buffer.write(30 + i, 12, 'A', { color: 'cyan' })
      }
    }, 500)
    reportMicro('buffer.write() — 10 chars', result)
  })

  test('buffer.write() - 80 chars', () => {
    const buffer = new ScreenBuffer(80, 24)
    const result = timed(() => {
      for (let i = 0; i < 80; i++) {
        buffer.write(i, 0, 'X', { color: 'white' })
      }
    }, 100)
    reportMicro('buffer.write() — 80 chars', result)
  })

  test('buffer.clone() - 80×24', () => {
    const buffer = new ScreenBuffer(80, 24)
    buffer.fill(0, 0, 80, 24, 'X', { color: 'red' })
    const result = timed(() => {
      buffer.clone()
    }, 100)
    reportMicro('buffer.clone() — 80×24', result)
  })

  test('buffer.clone() - 220×50', () => {
    const buffer = new ScreenBuffer(220, 50)
    buffer.fill(0, 0, 220, 50, 'X', { color: 'blue' })
    const result = timed(() => {
      buffer.clone()
    }, 50)
    reportMicro('buffer.clone() — 220×50', result)
  })
})

// ============================================================================
// CSS TRANSFORMATION SUB-OPERATIONS
// ============================================================================

describe('Micro: CSS Transformations', () => {
  test('transformDeclaration() - color hex', () => {
    const props: LayoutProperties = {}
    const result = timed(() => {
      transformDeclaration('color', '#ff0000', props)
    }, 1000)
    reportMicro('transformDeclaration(color, hex)', result)
  })

  test('transformDeclaration() - color named', () => {
    const props: LayoutProperties = {}
    const result = timed(() => {
      transformDeclaration('color', 'cyan', props)
    }, 1000)
    reportMicro('transformDeclaration(color, named)', result)
  })

  test('transformDeclaration() - padding single', () => {
    const props: LayoutProperties = {}
    const result = timed(() => {
      transformDeclaration('padding', '2', props)
    }, 1000)
    reportMicro('transformDeclaration(padding, single)', result)
  })

  test('transformDeclaration() - padding 4-value', () => {
    const props: LayoutProperties = {}
    const result = timed(() => {
      transformDeclaration('padding', '1 2 3 4', props)
    }, 1000)
    reportMicro('transformDeclaration(padding, 4-value)', result)
  })

  test('transformDeclaration() - flex shorthand', () => {
    const props: LayoutProperties = {}
    const result = timed(() => {
      transformDeclaration('flex', '1 0 auto', props)
    }, 1000)
    reportMicro('transformDeclaration(flex, shorthand)', result)
  })

  test('transformDeclaration() - border', () => {
    const props: LayoutProperties = {}
    const result = timed(() => {
      transformDeclaration('border', '1px solid cyan', props)
    }, 1000)
    reportMicro('transformDeclaration(border, parse)', result)
  })

  test('transformCSSToLayout() - small CSS', async () => {
    const result = timed(async () => {
      await transformCSSToLayout(CSS_SCENARIOS.small)
    }, 100)
    reportMicro('transformCSSToLayout(small CSS)', result)
  })

  test('transformCSSToLayout() - large CSS', async () => {
    const result = timed(async () => {
      await transformCSSToLayout(CSS_SCENARIOS.large)
    }, 30)
    reportMicro('transformCSSToLayout(large CSS)', result)
  })
})

// ============================================================================
// LAYOUT DIMENSION RESOLUTION
// ============================================================================

describe('Micro: Layout Dimension Resolution', () => {
  test('resolveDimension() - plain number', () => {
    const result = timed(() => {
      resolveDimension(50, 100)
    }, 2000)
    reportMicro('resolveDimension(50, 100)', result)
  })

  test('resolveDimension() - percentage', () => {
    const result = timed(() => {
      resolveDimension('50%', 100)
    }, 2000)
    reportMicro('resolveDimension("50%", 100)', result)
  })

  test('resolveDimension() - calc expression', () => {
    const result = timed(() => {
      resolveDimension('calc(100% - 2)', 100)
    }, 500)
    reportMicro('resolveDimension(calc(100% - 2), 100)', result)
  })
})

// ============================================================================
// FLEXBOX LAYOUT
// ============================================================================

describe('Micro: Flexbox Layout', () => {
  test('computeFlexLayout() - 5 children', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.small, buildTreeFlat(5), 80, 24)
    const [container, ...children] = scenario.tree.children || []

    const result = timed(() => {
      if (container && children.length > 0) {
        computeFlexLayout(
          container,
          children,
          {
            flexDirection: 'row',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            flexWrap: 'nowrap',
            gap: 0,
          },
          80,
          24
        )
      }
    }, 500)
    reportMicro('computeFlexLayout() — 5 children', result)
  })

  test('computeFlexLayout() - 20 children', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.small, buildTreeFlat(20), 80, 24)
    const [container, ...children] = scenario.tree.children || []

    const result = timed(() => {
      if (container && children.length > 0) {
        computeFlexLayout(
          container,
          children,
          {
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'stretch',
            flexWrap: 'nowrap',
            gap: 1,
          },
          80,
          24
        )
      }
    }, 200)
    reportMicro('computeFlexLayout() — 20 children', result)
  })
})

// ============================================================================
// STACKING CONTEXT TREE BUILD
// ============================================================================

describe('Micro: Stacking Context Tree', () => {
  test('buildStackingContextTree() - 10 nodes', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.small, buildTreeFlat(10), 80, 24)

    const result = timed(() => {
      buildStackingContextTree(scenario.tree)
    }, 200)
    reportMicro('buildStackingContextTree() — 10 nodes', result)
  })

  test('buildStackingContextTree() - 30 nodes', async () => {
    const scenario = await buildScenario(CSS_SCENARIOS.medium, buildTreeFlat(30), 80, 24)

    const result = timed(() => {
      buildStackingContextTree(scenario.tree)
    }, 200)
    reportMicro('buildStackingContextTree() — 30 nodes', result)
  })

  test('buildStackingContextTree() - deep tree (50 levels)', async () => {
    const deepVNode = buildTreeDeep(50)
    const scenario = await buildScenario(CSS_SCENARIOS.small, deepVNode, 80, 24)

    const result = timed(() => {
      buildStackingContextTree(scenario.tree)
    }, 50)
    reportMicro('buildStackingContextTree() — 50-level deep', result)
  })
})

// ============================================================================
// ANSI COLOR/WRITING OPERATIONS
// ============================================================================

describe('Micro: ANSI Writer', () => {
  test('AnsiWriter.setForeground() - named color', () => {
    const writer = new AnsiWriter()
    const result = timed(() => {
      writer.setForeground('red')
    }, 1000)
    reportMicro('AnsiWriter.setForeground(red)', result)
  })

  test('AnsiWriter.setForeground() - hex first call', () => {
    const writer = new AnsiWriter()
    const result = timed(() => {
      writer.setForeground('#ff0000')
    }, 500)
    reportMicro('AnsiWriter.setForeground(#ff0000) [1st]', result)
  })

  test('AnsiWriter.setForeground() - hex cached', () => {
    const writer = new AnsiWriter()
    writer.setForeground('#ff0000') // Prime cache
    const result = timed(() => {
      writer.setForeground('#ff0000')
    }, 1000)
    reportMicro('AnsiWriter.setForeground(#ff0000) [cached]', result)
  })

  test('AnsiWriter.setBackground() - hex', () => {
    const writer = new AnsiWriter()
    const result = timed(() => {
      writer.setBackground('#222244')
    }, 500)
    reportMicro('AnsiWriter.setBackground(#222244)', result)
  })

  test('AnsiWriter.flush() - empty', () => {
    const writer = new AnsiWriter()
    const result = timed(() => {
      writer.flush()
    }, 2000)
    reportMicro('AnsiWriter.flush() — empty', result)
  })

  test('AnsiWriter full write loop - 1920 cells (80×24)', () => {
    const writer = new AnsiWriter()
    const result = timed(() => {
      for (let y = 0; y < 24; y++) {
        for (let x = 0; x < 80; x++) {
          writer.moveCursor(x, y)
          writer.setForeground('#ff00ff')
          writer.write('X')
        }
      }
      writer.flush()
    }, 10)
    reportMicro('AnsiWriter full loop — 1920 cells', result)
  })
})

// ============================================================================
// FRAME DIFFER BY CHANGE DENSITY
// ============================================================================

describe('Micro: Frame Differ by Change Density', () => {
  const differ = new FrameDiffer()
  const baseBuffer = new ScreenBuffer(80, 24)
  baseBuffer.fill(0, 0, 80, 24, '.', { color: 'white' })

  test('differ — 0% changed (identical)', () => {
    const result = timed(() => {
      differ.diff(baseBuffer, baseBuffer)
    }, 200)
    reportMicro('FrameDiffer — 0% changed (identical)', result)
  })

  test('differ — 1% changed', () => {
    const changed = baseBuffer.clone()
    const cellCount = 80 * 24
    const changeCount = Math.ceil(cellCount * 0.01)
    for (let i = 0; i < changeCount; i++) {
      const idx = i
      const x = idx % 80
      const y = Math.floor(idx / 80)
      changed.write(x, y, 'X', { color: 'red' })
    }

    const result = timed(() => {
      differ.diff(baseBuffer, changed)
    }, 200)
    reportMicro('FrameDiffer — 1% changed', result)
  })

  test('differ — 5% changed', () => {
    const changed = baseBuffer.clone()
    const cellCount = 80 * 24
    const changeCount = Math.ceil(cellCount * 0.05)
    for (let i = 0; i < changeCount; i++) {
      const idx = i
      const x = idx % 80
      const y = Math.floor(idx / 80)
      changed.write(x, y, 'X', { color: 'green' })
    }

    const result = timed(() => {
      differ.diff(baseBuffer, changed)
    }, 200)
    reportMicro('FrameDiffer — 5% changed', result)
  })

  test('differ — 10% changed', () => {
    const changed = baseBuffer.clone()
    const cellCount = 80 * 24
    const changeCount = Math.ceil(cellCount * 0.1)
    for (let i = 0; i < changeCount; i++) {
      const idx = i
      const x = idx % 80
      const y = Math.floor(idx / 80)
      changed.write(x, y, 'X', { color: 'yellow' })
    }

    const result = timed(() => {
      differ.diff(baseBuffer, changed)
    }, 200)
    reportMicro('FrameDiffer — 10% changed', result)
  })

  test('differ — 25% changed', () => {
    const changed = baseBuffer.clone()
    const cellCount = 80 * 24
    const changeCount = Math.ceil(cellCount * 0.25)
    for (let i = 0; i < changeCount; i++) {
      const idx = i
      const x = idx % 80
      const y = Math.floor(idx / 80)
      changed.write(x, y, 'X', { color: 'cyan' })
    }

    const result = timed(() => {
      differ.diff(baseBuffer, changed)
    }, 100)
    reportMicro('FrameDiffer — 25% changed', result)
  })

  test('differ — 50% changed', () => {
    const changed = baseBuffer.clone()
    const cellCount = 80 * 24
    const changeCount = Math.ceil(cellCount * 0.5)
    for (let i = 0; i < changeCount; i++) {
      const idx = i
      const x = idx % 80
      const y = Math.floor(idx / 80)
      changed.write(x, y, 'X', { color: 'blue' })
    }

    const result = timed(() => {
      differ.diff(baseBuffer, changed)
    }, 50)
    reportMicro('FrameDiffer — 50% changed', result)
  })

  test('differ — 100% changed (full repaint)', () => {
    const changed = new ScreenBuffer(80, 24)
    changed.fill(0, 0, 80, 24, 'Y', { color: 'magenta' })

    const result = timed(() => {
      differ.diff(baseBuffer, changed)
    }, 50)
    reportMicro('FrameDiffer — 100% changed (repaint)', result)
  })
})
