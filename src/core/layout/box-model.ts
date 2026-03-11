/**
 * Platform-agnostic box model calculations
 *
 * Handles padding, margin, border, and dimension calculations for layout nodes
 */

import type { Spacing, BorderStyle, LayoutProperties } from './types'

/**
 * Normalize spacing value (can be number or Spacing object)
 */
export function normalizeSpacing(value: number | Spacing | undefined): Spacing {
  if (value === undefined) {
    return { top: 0, right: 0, bottom: 0, left: 0 }
  }

  if (typeof value === 'number') {
    return { top: value, right: value, bottom: value, left: value }
  }

  return value
}

/**
 * Extract padding from layout properties
 */
export function getPadding(props: LayoutProperties): Spacing {
  if (props.padding !== undefined) {
    return normalizeSpacing(props.padding)
  }

  return {
    top: props.paddingTop ?? 0,
    right: props.paddingRight ?? 0,
    bottom: props.paddingBottom ?? 0,
    left: props.paddingLeft ?? 0,
  }
}

/**
 * Extract margin from layout properties
 */
export function getMargin(props: LayoutProperties): Spacing {
  if (props.margin !== undefined) {
    return normalizeSpacing(props.margin)
  }

  return {
    top: props.marginTop ?? 0,
    right: props.marginRight ?? 0,
    bottom: props.marginBottom ?? 0,
    left: props.marginLeft ?? 0,
  }
}

/**
 * Extract border from layout properties, merging shorthand and per-side overrides.
 */
export function getBorder(props: LayoutProperties): BorderStyle {
  let base: BorderStyle
  if (props.border !== undefined) {
    base = {
      ...props.border,
      type: props.borderType ?? props.border.type,
      width: props.border.width,
    }
  } else {
    base = {
      width: props.borderWidth ?? 0,
      fg: props.borderFg,
      type: props.borderType ?? 'line',
    }
  }

  // Per-side overrides
  if (props.borderTopWidth !== undefined) base.top = props.borderTopWidth
  if (props.borderRightWidth !== undefined) base.right = props.borderRightWidth
  if (props.borderBottomWidth !== undefined) base.bottom = props.borderBottomWidth
  if (props.borderLeftWidth !== undefined) base.left = props.borderLeftWidth
  if (props.borderTopColor !== undefined) base.topFg = props.borderTopColor
  if (props.borderRightColor !== undefined) base.rightFg = props.borderRightColor
  if (props.borderBottomColor !== undefined) base.bottomFg = props.borderBottomColor
  if (props.borderLeftColor !== undefined) base.leftFg = props.borderLeftColor

  // If any per-side width is set and no base fg/type, apply defaults
  const hasAnySide = base.top !== undefined || base.right !== undefined ||
                     base.bottom !== undefined || base.left !== undefined
  if (hasAnySide && !base.fg) {
    base.fg = base.topFg ?? base.bottomFg ?? base.leftFg ?? base.rightFg
  }
  if (hasAnySide && !base.type) {
    base.type = 'line'
  }

  return base
}

/**
 * Get the effective width (0 or 1) for a specific border side.
 * Per-side values override the uniform shorthand width.
 */
export function getBorderSide(border: BorderStyle, side: 'top' | 'right' | 'bottom' | 'left'): number {
  const sideVal = border[side]
  return sideVal !== undefined ? (sideVal > 0 ? 1 : 0) : (border.width > 0 ? 1 : 0)
}

/**
 * Get the effective fg color for a specific border side.
 */
export function getBorderSideFg(border: BorderStyle, side: 'top' | 'right' | 'bottom' | 'left'): string | undefined {
  const map = { top: border.topFg, right: border.rightFg, bottom: border.bottomFg, left: border.leftFg }
  return map[side] ?? border.fg
}

/**
 * Calculate total horizontal spacing (padding + border)
 */
export function getHorizontalSpacing(padding: Spacing, border: BorderStyle): number {
  return padding.left + padding.right + getBorderSide(border, 'left') + getBorderSide(border, 'right')
}

/**
 * Calculate total vertical spacing (padding + border)
 */
export function getVerticalSpacing(padding: Spacing, border: BorderStyle): number {
  return padding.top + padding.bottom + getBorderSide(border, 'top') + getBorderSide(border, 'bottom')
}

/**
 * Calculate content width (subtracting padding and border)
 */
export function getContentWidth(totalWidth: number, padding: Spacing, border: BorderStyle): number {
  const spacing = getHorizontalSpacing(padding, border)
  return Math.max(0, totalWidth - spacing)
}

/**
 * Calculate content height (subtracting padding and border)
 */
export function getContentHeight(totalHeight: number, padding: Spacing, border: BorderStyle): number {
  const spacing = getVerticalSpacing(padding, border)
  return Math.max(0, totalHeight - spacing)
}

/**
 * Calculate outer width (adding padding and border)
 */
export function getOuterWidth(contentWidth: number, padding: Spacing, border: BorderStyle): number {
  const spacing = getHorizontalSpacing(padding, border)
  return contentWidth + spacing
}

/**
 * Calculate outer height (adding padding and border)
 */
export function getOuterHeight(contentHeight: number, padding: Spacing, border: BorderStyle): number {
  const spacing = getVerticalSpacing(padding, border)
  return contentHeight + spacing
}

/**
 * Calculate the inner position (accounting for padding and border)
 */
export function getInnerPosition(padding: Spacing, border: BorderStyle): { x: number; y: number } {
  return {
    x: padding.left + getBorderSide(border, 'left'),
    y: padding.top + getBorderSide(border, 'top'),
  }
}

/**
 * Clamp value between min and max
 */
export function clamp(value: number, min: number | undefined, max: number | undefined): number {
  if (min !== undefined && value < min) return min
  if (max !== undefined && value > max) return max
  return value
}

/**
 * Apply min/max constraints to dimensions
 */
export function applyConstraints(
  width: number,
  height: number,
  props: LayoutProperties
): { width: number; height: number } {
  return {
    width: clamp(width, props.minWidth, props.maxWidth),
    height: clamp(height, props.minHeight, props.maxHeight),
  }
}
