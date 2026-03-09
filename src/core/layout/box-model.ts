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
 * Extract border from layout properties
 */
export function getBorder(props: LayoutProperties): BorderStyle {
  if (props.border !== undefined) {
    return {
      ...props.border,
      // borderType overrides the type embedded in the border shorthand
      type: props.borderType ?? props.border.type,
      // border = undefined (from border-style: none) means width 0
      width: props.border.width,
    }
  }

  return {
    width: props.borderWidth ?? 0,
    fg: props.borderFg,
    type: props.borderType ?? 'line',
  }
}

/**
 * Calculate total horizontal spacing (padding + border)
 */
export function getHorizontalSpacing(padding: Spacing, border: BorderStyle): number {
  return padding.left + padding.right + (border.width > 0 ? 2 : 0)
}

/**
 * Calculate total vertical spacing (padding + border)
 */
export function getVerticalSpacing(padding: Spacing, border: BorderStyle): number {
  return padding.top + padding.bottom + (border.width > 0 ? 2 : 0)
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
  const borderOffset = border.width > 0 ? 1 : 0
  return {
    x: padding.left + borderOffset,
    y: padding.top + borderOffset,
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
