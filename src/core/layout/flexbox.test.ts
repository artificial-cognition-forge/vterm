/**
 * Tests for flexbox layout algorithm
 *
 * These tests verify platform-agnostic flexbox logic
 * without any blessed or terminal dependencies
 */

import { test, expect, describe } from 'bun:test'
import {
  computeFlexLayout,
  getFlexConfig,
  isFlexContainer,
  resolveDimension,
} from './flexbox'
import { createLayoutNode } from './tree'
import type { LayoutNode, LayoutProperties } from './types'

// Helper to create a simple layout node with computed layout
function createTestNode(width: number, height: number): LayoutNode {
  const node = createLayoutNode({ type: 'box' })
  node.layout = {
    x: 0,
    y: 0,
    width,
    height,
    padding: { top: 0, right: 0, bottom: 0, left: 0 },
    margin: { top: 0, right: 0, bottom: 0, left: 0 },
    border: { width: 0, type: 'line' },
  }
  return node
}

describe('resolveDimension', () => {
  test('returns default for undefined', () => {
    expect(resolveDimension(undefined, 100, 50)).toBe(50)
  })

  test('returns number value directly', () => {
    expect(resolveDimension(75, 100, 50)).toBe(75)
  })

  test('calculates percentage of container', () => {
    expect(resolveDimension('50%', 100, 0)).toBe(50)
    expect(resolveDimension('25%', 200, 0)).toBe(50)
    expect(resolveDimension('100%', 80, 0)).toBe(80)
  })

  test('handles shrink value', () => {
    expect(resolveDimension('shrink', 100, 50)).toBe(50)
  })

  test('parses string numbers', () => {
    expect(resolveDimension('75', 100, 50)).toBe(75)
  })

  test('returns default for unparseable strings', () => {
    expect(resolveDimension('invalid', 100, 50)).toBe(50)
  })
})

describe('isFlexContainer', () => {
  test('returns true for display: flex', () => {
    const props: LayoutProperties = { display: 'flex' }
    expect(isFlexContainer(props)).toBe(true)
  })

  test('returns false for display: block', () => {
    const props: LayoutProperties = { display: 'block' }
    expect(isFlexContainer(props)).toBe(false)
  })

  test('returns false when display is not set', () => {
    const props: LayoutProperties = {}
    expect(isFlexContainer(props)).toBe(false)
  })
})

describe('getFlexConfig', () => {
  test('returns default config for empty props', () => {
    const config = getFlexConfig({})
    expect(config).toEqual({
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'stretch',
      flexWrap: 'nowrap',
      gap: 0,
      rowGap: undefined,
      columnGap: undefined,
    })
  })

  test('extracts flexDirection', () => {
    const config = getFlexConfig({ flexDirection: 'column' })
    expect(config.flexDirection).toBe('column')
  })

  test('extracts justifyContent', () => {
    const config = getFlexConfig({ justifyContent: 'center' })
    expect(config.justifyContent).toBe('center')
  })

  test('extracts alignItems', () => {
    const config = getFlexConfig({ alignItems: 'center' })
    expect(config.alignItems).toBe('center')
  })

  test('extracts gap values', () => {
    const config = getFlexConfig({ gap: 10, rowGap: 5, columnGap: 15 })
    expect(config.gap).toBe(10)
    expect(config.rowGap).toBe(5)
    expect(config.columnGap).toBe(15)
  })
})

describe('computeFlexLayout - Row Direction', () => {
  test('flex-start justification in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 20)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 100, 50)

    expect(child1.layout?.x).toBe(0)
    expect(child1.layout?.y).toBe(0)
    expect(child2.layout?.x).toBe(30)
    expect(child2.layout?.y).toBe(0)
  })

  test('flex-end justification in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 20)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 100, 50)

    // Free space = 100 - 30 - 40 = 30
    expect(child1.layout?.x).toBe(30)
    expect(child2.layout?.x).toBe(60)
  })

  test('center justification in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 20)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      justifyContent: 'center',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 100, 50)

    // Free space = 100 - 30 - 40 = 30, offset = 15
    expect(child1.layout?.x).toBe(15)
    expect(child2.layout?.x).toBe(45)
  })

  test('space-between justification in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 20)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 100, 50)

    // Free space = 100 - 30 - 40 = 30
    expect(child1.layout?.x).toBe(0)
    expect(child2.layout?.x).toBe(60) // 30 + 30 (space-between)
  })

  test('space-around justification in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 20)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      justifyContent: 'space-around',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 100, 50)

    // Free space = 100 - 30 - 40 = 30, per child = 15, half = 7.5
    // Note: positions are rounded, so 7.5 becomes 8
    expect(child1.layout?.x).toBe(8) // Math.round(7.5)
    expect(child2.layout?.x).toBe(53) // Math.round(52.5)
  })

  test('space-evenly justification in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 20)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      justifyContent: 'space-evenly',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 100, 50)

    // Free space = 100 - 30 - 40 = 30, divided by 3 = 10
    expect(child1.layout?.x).toBe(10)
    expect(child2.layout?.x).toBe(50) // 10 + 30 + 10
  })

  test('gap between children in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 20)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: 10,
    })

    computeFlexLayout(container, children, config, 100, 50)

    expect(child1.layout?.x).toBe(0)
    expect(child2.layout?.x).toBe(40) // 30 + 10 (gap)
  })
})

describe('computeFlexLayout - Column Direction', () => {
  test('flex-start justification in column', () => {
    const container = createTestNode(50, 100)
    const child1 = createTestNode(20, 30)
    const child2 = createTestNode(20, 40)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'column',
      justifyContent: 'flex-start',
      alignItems: 'flex-start',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 50, 100)

    expect(child1.layout?.x).toBe(0)
    expect(child1.layout?.y).toBe(0)
    expect(child2.layout?.x).toBe(0)
    expect(child2.layout?.y).toBe(30)
  })

  test('center justification in column', () => {
    const container = createTestNode(50, 100)
    const child1 = createTestNode(20, 30)
    const child2 = createTestNode(20, 40)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'column',
      justifyContent: 'center',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 50, 100)

    // Free space = 100 - 30 - 40 = 30, offset = 15
    expect(child1.layout?.y).toBe(15)
    expect(child2.layout?.y).toBe(45)
  })

  test('gap between children in column', () => {
    const container = createTestNode(50, 100)
    const child1 = createTestNode(20, 30)
    const child2 = createTestNode(20, 40)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'column',
      justifyContent: 'flex-start',
      gap: 10,
    })

    computeFlexLayout(container, children, config, 50, 100)

    expect(child1.layout?.y).toBe(0)
    expect(child2.layout?.y).toBe(40) // 30 + 10 (gap)
  })
})

describe('computeFlexLayout - Alignment', () => {
  test('align-items: flex-start in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 30)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      alignItems: 'flex-start',
    })

    computeFlexLayout(container, children, config, 100, 50)

    expect(child1.layout?.y).toBe(0)
    expect(child2.layout?.y).toBe(0)
  })

  test('align-items: flex-end in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 30)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      alignItems: 'flex-end',
    })

    computeFlexLayout(container, children, config, 100, 50)

    expect(child1.layout?.y).toBe(30) // 50 - 20
    expect(child2.layout?.y).toBe(20) // 50 - 30
  })

  test('align-items: center in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 30)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      alignItems: 'center',
    })

    computeFlexLayout(container, children, config, 100, 50)

    expect(child1.layout?.y).toBe(15) // (50 - 20) / 2
    expect(child2.layout?.y).toBe(10) // (50 - 30) / 2
  })

  test('align-items: stretch in row', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 30)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      alignItems: 'stretch',
    })

    computeFlexLayout(container, children, config, 100, 50)

    // Children should be stretched to container height
    expect(child1.layout?.height).toBe(50)
    expect(child2.layout?.height).toBe(50)
    expect(child1.layout?.y).toBe(0)
    expect(child2.layout?.y).toBe(0)
  })

  test('align-items: center in column', () => {
    const container = createTestNode(50, 100)
    const child1 = createTestNode(20, 30)
    const child2 = createTestNode(30, 40)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'column',
      alignItems: 'center',
    })

    computeFlexLayout(container, children, config, 50, 100)

    expect(child1.layout?.x).toBe(15) // (50 - 20) / 2
    expect(child2.layout?.x).toBe(10) // (50 - 30) / 2
  })

  test('align-items: stretch in column', () => {
    const container = createTestNode(50, 100)
    const child1 = createTestNode(20, 30)
    const child2 = createTestNode(30, 40)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'column',
      alignItems: 'stretch',
    })

    computeFlexLayout(container, children, config, 50, 100)

    // Children should be stretched to container width
    expect(child1.layout?.width).toBe(50)
    expect(child2.layout?.width).toBe(50)
  })
})

describe('computeFlexLayout - Reverse Directions', () => {
  test('row-reverse direction', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(40, 20)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row-reverse',
      justifyContent: 'flex-start',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 100, 50)

    // CSS row-reverse: main axis runs right-to-left, first DOM item is rightmost
    expect(child1.layout?.x).toBe(70) // 100 - 30 (first DOM item at right edge)
    expect(child2.layout?.x).toBe(30) // 70 - 40
  })

  test('column-reverse direction', () => {
    const container = createTestNode(50, 100)
    const child1 = createTestNode(20, 30)
    const child2 = createTestNode(20, 40)
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'column-reverse',
      justifyContent: 'flex-start',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 50, 100)

    // CSS column-reverse: main axis runs bottom-to-top, first DOM item is bottommost
    expect(child1.layout?.y).toBe(70) // 100 - 30 (first DOM item at bottom edge)
    expect(child2.layout?.y).toBe(30) // 70 - 40
  })
})

describe('computeFlexLayout - Edge Cases', () => {
  test('handles empty children array', () => {
    const container = createTestNode(100, 50)
    const children: LayoutNode[] = []

    const config = getFlexConfig({ flexDirection: 'row' })

    // Should not throw
    expect(() => {
      computeFlexLayout(container, children, config, 100, 50)
    }).not.toThrow()
  })

  test('handles single child', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(30, 20)
    const children = [child1]

    const config = getFlexConfig({
      flexDirection: 'row',
      justifyContent: 'center',
    })

    computeFlexLayout(container, children, config, 100, 50)

    expect(child1.layout?.x).toBe(35) // (100 - 30) / 2
  })

  test('handles children without layout', () => {
    const container = createTestNode(100, 50)
    const child1 = createLayoutNode({ type: 'box' }) // No layout
    const child2 = createTestNode(40, 20)
    const children = [child1, child2]

    const config = getFlexConfig({ flexDirection: 'row' })

    // Should not throw, should skip child without layout
    expect(() => {
      computeFlexLayout(container, children, config, 100, 50)
    }).not.toThrow()
  })

  test('shrinks children to fit via flex-shrink (default=1)', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(80, 20)
    const child2 = createTestNode(80, 20)
    child1.layoutProps = {}
    child2.layoutProps = {}
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 100, 50)

    // Total 160 > 100: each child shrinks by (80/160)*60 = 30 → width 50
    expect(child1.layout?.width).toBe(50)
    expect(child2.layout?.width).toBe(50)
    expect(child1.layout?.x).toBe(0)
    expect(child2.layout?.x).toBe(50)
  })

  test('allows overflow when flex-shrink: 0', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(80, 20)
    const child2 = createTestNode(80, 20)
    child1.layoutProps = { flexShrink: 0 }
    child2.layoutProps = { flexShrink: 0 }
    const children = [child1, child2]

    const config = getFlexConfig({
      flexDirection: 'row',
      justifyContent: 'flex-start',
      gap: 0,
    })

    computeFlexLayout(container, children, config, 100, 50)

    // flex-shrink: 0 means children do not shrink — overflow is allowed
    expect(child1.layout?.width).toBe(80)
    expect(child2.layout?.width).toBe(80)
    expect(child1.layout?.x).toBe(0)
    expect(child2.layout?.x).toBe(80)
  })
})

describe('computeFlexLayout - flex-grow', () => {
  test('distributes free space equally with equal flex-grow', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(0, 20)
    const child2 = createTestNode(0, 20)
    child1.layoutProps = { flexGrow: 1, flexBasis: 0 }
    child2.layoutProps = { flexGrow: 1, flexBasis: 0 }

    const config = getFlexConfig({ flexDirection: 'row', justifyContent: 'flex-start', gap: 0 })
    computeFlexLayout(container, [child1, child2], config, 100, 50)

    expect(child1.layout?.width).toBe(50)
    expect(child2.layout?.width).toBe(50)
    expect(child1.layout?.x).toBe(0)
    expect(child2.layout?.x).toBe(50)
  })

  test('distributes free space proportionally with unequal flex-grow (1:2)', () => {
    const container = createTestNode(90, 50)
    const child1 = createTestNode(0, 20)
    const child2 = createTestNode(0, 20)
    child1.layoutProps = { flexGrow: 1, flexBasis: 0 }
    child2.layoutProps = { flexGrow: 2, flexBasis: 0 }

    const config = getFlexConfig({ flexDirection: 'row', justifyContent: 'flex-start', gap: 0 })
    computeFlexLayout(container, [child1, child2], config, 90, 50)

    // 90 total, 1:2 ratio → 30 and 60
    expect(child1.layout?.width).toBe(30)
    expect(child2.layout?.width).toBe(60)
  })

  test('flex-grow from flexBasis: 0 (the flex: 1 pattern)', () => {
    const container = createTestNode(120, 50)
    const child1 = createTestNode(40, 20) // natural width 40, but basis overrides
    const child2 = createTestNode(40, 20)
    child1.layoutProps = { flexGrow: 1, flexBasis: 0 }
    child2.layoutProps = { flexGrow: 1, flexBasis: 0 }

    const config = getFlexConfig({ flexDirection: 'row', justifyContent: 'flex-start', gap: 0 })
    computeFlexLayout(container, [child1, child2], config, 120, 50)

    // Basis is 0, so all 120 is distributed equally: 60 each
    expect(child1.layout?.width).toBe(60)
    expect(child2.layout?.width).toBe(60)
  })

  test('allowShrink=false lets children overflow (scrollable container)', () => {
    const container = createTestNode(100, 50)
    const child1 = createTestNode(80, 20)
    const child2 = createTestNode(80, 20)
    child1.layoutProps = {}
    child2.layoutProps = {}

    const config = getFlexConfig({ flexDirection: 'row', justifyContent: 'flex-start', gap: 0 })
    computeFlexLayout(container, [child1, child2], config, 100, 50, false)

    // Children keep natural sizes — overflow for scrolling
    expect(child1.layout?.width).toBe(80)
    expect(child2.layout?.width).toBe(80)
    expect(child1.layout?.x).toBe(0)
    expect(child2.layout?.x).toBe(80)
  })

  test('alignSelf overrides container alignItems for individual children', () => {
    const container = createTestNode(100, 60)
    const child1 = createTestNode(30, 20)
    const child2 = createTestNode(30, 20)
    const child3 = createTestNode(30, 20)
    child1.layoutProps = { alignSelf: 'flex-end' }
    child2.layoutProps = { alignSelf: 'center' }
    child3.layoutProps = {} // inherits container alignItems: flex-start

    const config = getFlexConfig({ flexDirection: 'row', alignItems: 'flex-start', gap: 0 })
    computeFlexLayout(container, [child1, child2, child3], config, 100, 60)

    expect(child1.layout?.y).toBe(40) // flex-end: 60 - 20
    expect(child2.layout?.y).toBe(20) // center: (60 - 20) / 2
    expect(child3.layout?.y).toBe(0)  // flex-start (from alignItems)
  })

  test('flex-column: children with width=0 stretch to container width by default (the invisible children bug)', () => {
    // Regression: with alignItems default 'flex-start', divs in flex-column started at
    // width=0 (CSS correct default) but were never stretched to fill the container,
    // causing them to render as invisible zero-width elements.
    const container = createTestNode(80, 100)
    const child1 = createTestNode(0, 1) // div starts at width=0
    const child2 = createTestNode(0, 1)
    child1.layoutProps = {}
    child2.layoutProps = {}

    const config = getFlexConfig({ flexDirection: 'column' }) // default alignItems: 'stretch'
    computeFlexLayout(container, [child1, child2], config, 80, 100)

    // Both children must stretch to fill the container width
    expect(child1.layout?.width).toBe(80)
    expect(child2.layout?.width).toBe(80)
  })

  test('flex-grow in column direction distributes height', () => {
    const container = createTestNode(50, 90)
    const child1 = createTestNode(50, 0)
    const child2 = createTestNode(50, 0)
    child1.layoutProps = { flexGrow: 1, flexBasis: 0 }
    child2.layoutProps = { flexGrow: 2, flexBasis: 0 }

    const config = getFlexConfig({ flexDirection: 'column', justifyContent: 'flex-start', gap: 0 })
    computeFlexLayout(container, [child1, child2], config, 50, 90)

    // 90 total, 1:2 → 30 and 60
    expect(child1.layout?.height).toBe(30)
    expect(child2.layout?.height).toBe(60)
    expect(child1.layout?.y).toBe(0)
    expect(child2.layout?.y).toBe(30)
  })
})
