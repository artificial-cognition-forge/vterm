/**
 * Tests for box-model calculations
 *
 * These tests verify platform-agnostic box model logic
 * without any blessed or terminal dependencies
 */

import { test, expect, describe } from 'bun:test'
import {
  normalizeSpacing,
  getPadding,
  getMargin,
  getBorder,
  getHorizontalSpacing,
  getVerticalSpacing,
  getContentWidth,
  getContentHeight,
  getOuterWidth,
  getOuterHeight,
  getInnerPosition,
  clamp,
  applyConstraints,
} from './box-model'
import type { Spacing, LayoutProperties } from './types'

describe('normalizeSpacing', () => {
  test('handles undefined', () => {
    const result = normalizeSpacing(undefined)
    expect(result).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  test('handles number (all sides equal)', () => {
    const result = normalizeSpacing(10)
    expect(result).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })
  })

  test('handles Spacing object', () => {
    const spacing: Spacing = { top: 5, right: 10, bottom: 15, left: 20 }
    const result = normalizeSpacing(spacing)
    expect(result).toEqual(spacing)
  })

  test('handles zero', () => {
    const result = normalizeSpacing(0)
    expect(result).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })
})

describe('getPadding', () => {
  test('extracts padding from single value', () => {
    const props: LayoutProperties = { padding: 10 }
    const result = getPadding(props)
    expect(result).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })
  })

  test('extracts padding from Spacing object', () => {
    const props: LayoutProperties = {
      padding: { top: 5, right: 10, bottom: 15, left: 20 }
    }
    const result = getPadding(props)
    expect(result).toEqual({ top: 5, right: 10, bottom: 15, left: 20 })
  })

  test('extracts individual padding properties', () => {
    const props: LayoutProperties = {
      paddingTop: 5,
      paddingRight: 10,
      paddingBottom: 15,
      paddingLeft: 20,
    }
    const result = getPadding(props)
    expect(result).toEqual({ top: 5, right: 10, bottom: 15, left: 20 })
  })

  test('padding property overrides individual properties', () => {
    const props: LayoutProperties = {
      padding: 10,
      paddingTop: 5, // Should be ignored
    }
    const result = getPadding(props)
    expect(result).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })
  })

  test('defaults to zero when no padding specified', () => {
    const props: LayoutProperties = {}
    const result = getPadding(props)
    expect(result).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })

  test('handles partial individual padding properties', () => {
    const props: LayoutProperties = {
      paddingTop: 5,
      paddingLeft: 10,
    }
    const result = getPadding(props)
    expect(result).toEqual({ top: 5, right: 0, bottom: 0, left: 10 })
  })
})

describe('getMargin', () => {
  test('extracts margin from single value', () => {
    const props: LayoutProperties = { margin: 10 }
    const result = getMargin(props)
    expect(result).toEqual({ top: 10, right: 10, bottom: 10, left: 10 })
  })

  test('extracts margin from Spacing object', () => {
    const props: LayoutProperties = {
      margin: { top: 5, right: 10, bottom: 15, left: 20 }
    }
    const result = getMargin(props)
    expect(result).toEqual({ top: 5, right: 10, bottom: 15, left: 20 })
  })

  test('extracts individual margin properties', () => {
    const props: LayoutProperties = {
      marginTop: 5,
      marginRight: 10,
      marginBottom: 15,
      marginLeft: 20,
    }
    const result = getMargin(props)
    expect(result).toEqual({ top: 5, right: 10, bottom: 15, left: 20 })
  })

  test('defaults to zero when no margin specified', () => {
    const props: LayoutProperties = {}
    const result = getMargin(props)
    expect(result).toEqual({ top: 0, right: 0, bottom: 0, left: 0 })
  })
})

describe('getBorder', () => {
  test('extracts border from BorderStyle object', () => {
    const props: LayoutProperties = {
      border: { width: 1, fg: 'white', type: 'line' }
    }
    const result = getBorder(props)
    expect(result).toEqual({ width: 1, fg: 'white', type: 'line' })
  })

  test('extracts individual border properties', () => {
    const props: LayoutProperties = {
      borderWidth: 1,
      borderFg: 'blue',
      borderType: 'heavy',
    }
    const result = getBorder(props)
    expect(result).toEqual({ width: 1, fg: 'blue', type: 'heavy' })
  })

  test('defaults to zero width when no border specified', () => {
    const props: LayoutProperties = {}
    const result = getBorder(props)
    expect(result).toEqual({ width: 0, fg: undefined, type: 'line' })
  })

  test('defaults type to line', () => {
    const props: LayoutProperties = { borderWidth: 1 }
    const result = getBorder(props)
    expect(result.type).toBe('line')
  })
})

describe('spacing calculations', () => {
  test('getHorizontalSpacing with padding only', () => {
    const padding: Spacing = { top: 0, right: 10, bottom: 0, left: 5 }
    const border = { width: 0, type: 'line' as const }
    const result = getHorizontalSpacing(padding, border)
    expect(result).toBe(15) // left(5) + right(10)
  })

  test('getHorizontalSpacing with padding and border', () => {
    const padding: Spacing = { top: 0, right: 10, bottom: 0, left: 5 }
    const border = { width: 1, type: 'line' as const }
    const result = getHorizontalSpacing(padding, border)
    expect(result).toBe(17) // left(5) + right(10) + border(2)
  })

  test('getVerticalSpacing with padding only', () => {
    const padding: Spacing = { top: 5, right: 0, bottom: 10, left: 0 }
    const border = { width: 0, type: 'line' as const }
    const result = getVerticalSpacing(padding, border)
    expect(result).toBe(15) // top(5) + bottom(10)
  })

  test('getVerticalSpacing with padding and border', () => {
    const padding: Spacing = { top: 5, right: 0, bottom: 10, left: 0 }
    const border = { width: 1, type: 'line' as const }
    const result = getVerticalSpacing(padding, border)
    expect(result).toBe(17) // top(5) + bottom(10) + border(2)
  })
})

describe('content size calculations', () => {
  test('getContentWidth subtracts padding and border', () => {
    const padding: Spacing = { top: 0, right: 10, bottom: 0, left: 5 }
    const border = { width: 1, type: 'line' as const }
    const result = getContentWidth(100, padding, border)
    expect(result).toBe(83) // 100 - left(5) - right(10) - border(2)
  })

  test('getContentWidth returns zero when total width is too small', () => {
    const padding: Spacing = { top: 0, right: 50, bottom: 0, left: 50 }
    const border = { width: 1, type: 'line' as const }
    const result = getContentWidth(50, padding, border)
    expect(result).toBe(0) // Can't be negative
  })

  test('getContentHeight subtracts padding and border', () => {
    const padding: Spacing = { top: 5, right: 0, bottom: 10, left: 0 }
    const border = { width: 1, type: 'line' as const }
    const result = getContentHeight(100, padding, border)
    expect(result).toBe(83) // 100 - top(5) - bottom(10) - border(2)
  })

  test('getContentHeight returns zero when total height is too small', () => {
    const padding: Spacing = { top: 50, right: 0, bottom: 50, left: 0 }
    const border = { width: 1, type: 'line' as const }
    const result = getContentHeight(50, padding, border)
    expect(result).toBe(0) // Can't be negative
  })
})

describe('outer size calculations', () => {
  test('getOuterWidth adds padding and border', () => {
    const padding: Spacing = { top: 0, right: 10, bottom: 0, left: 5 }
    const border = { width: 1, type: 'line' as const }
    const result = getOuterWidth(100, padding, border)
    expect(result).toBe(117) // 100 + left(5) + right(10) + border(2)
  })

  test('getOuterHeight adds padding and border', () => {
    const padding: Spacing = { top: 5, right: 0, bottom: 10, left: 0 }
    const border = { width: 1, type: 'line' as const }
    const result = getOuterHeight(100, padding, border)
    expect(result).toBe(117) // 100 + top(5) + bottom(10) + border(2)
  })
})

describe('getInnerPosition', () => {
  test('calculates inner position with padding only', () => {
    const padding: Spacing = { top: 5, right: 10, bottom: 15, left: 20 }
    const border = { width: 0, type: 'line' as const }
    const result = getInnerPosition(padding, border)
    expect(result).toEqual({ x: 20, y: 5 })
  })

  test('calculates inner position with padding and border', () => {
    const padding: Spacing = { top: 5, right: 10, bottom: 15, left: 20 }
    const border = { width: 1, type: 'line' as const }
    const result = getInnerPosition(padding, border)
    expect(result).toEqual({ x: 21, y: 6 }) // padding + border offset
  })

  test('handles zero padding and no border', () => {
    const padding: Spacing = { top: 0, right: 0, bottom: 0, left: 0 }
    const border = { width: 0, type: 'line' as const }
    const result = getInnerPosition(padding, border)
    expect(result).toEqual({ x: 0, y: 0 })
  })
})

describe('clamp', () => {
  test('clamps value to minimum', () => {
    expect(clamp(5, 10, 20)).toBe(10)
  })

  test('clamps value to maximum', () => {
    expect(clamp(25, 10, 20)).toBe(20)
  })

  test('returns value when within range', () => {
    expect(clamp(15, 10, 20)).toBe(15)
  })

  test('handles undefined min', () => {
    expect(clamp(5, undefined, 20)).toBe(5)
  })

  test('handles undefined max', () => {
    expect(clamp(25, 10, undefined)).toBe(25)
  })

  test('handles both undefined', () => {
    expect(clamp(15, undefined, undefined)).toBe(15)
  })

  test('handles min === max', () => {
    expect(clamp(15, 10, 10)).toBe(10)
  })
})

describe('applyConstraints', () => {
  test('applies min/max width constraints', () => {
    const props: LayoutProperties = {
      minWidth: 50,
      maxWidth: 150,
    }
    expect(applyConstraints(30, 100, props)).toEqual({ width: 50, height: 100 })
    expect(applyConstraints(100, 100, props)).toEqual({ width: 100, height: 100 })
    expect(applyConstraints(200, 100, props)).toEqual({ width: 150, height: 100 })
  })

  test('applies min/max height constraints', () => {
    const props: LayoutProperties = {
      minHeight: 50,
      maxHeight: 150,
    }
    expect(applyConstraints(100, 30, props)).toEqual({ width: 100, height: 50 })
    expect(applyConstraints(100, 100, props)).toEqual({ width: 100, height: 100 })
    expect(applyConstraints(100, 200, props)).toEqual({ width: 100, height: 150 })
  })

  test('applies both width and height constraints', () => {
    const props: LayoutProperties = {
      minWidth: 50,
      maxWidth: 150,
      minHeight: 40,
      maxHeight: 120,
    }
    expect(applyConstraints(30, 30, props)).toEqual({ width: 50, height: 40 })
    expect(applyConstraints(200, 200, props)).toEqual({ width: 150, height: 120 })
  })

  test('handles no constraints', () => {
    const props: LayoutProperties = {}
    expect(applyConstraints(100, 200, props)).toEqual({ width: 100, height: 200 })
  })
})
