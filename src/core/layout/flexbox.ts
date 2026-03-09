/**
 * Platform-agnostic flexbox layout algorithm
 *
 * This module implements flexbox layout computation independent of any
 * rendering backend (blessed, etc.). It operates on LayoutNodes and computes
 * their positions and dimensions.
 */

import type { LayoutNode, LayoutProperties } from './types'

/**
 * Flexbox layout configuration
 */
export interface FlexConfig {
  flexDirection: 'row' | 'column' | 'row-reverse' | 'column-reverse'
  justifyContent: 'flex-start' | 'flex-end' | 'center' | 'space-between' | 'space-around' | 'space-evenly'
  alignItems: 'flex-start' | 'flex-end' | 'center' | 'stretch' | 'baseline'
  flexWrap: 'nowrap' | 'wrap' | 'wrap-reverse'
  gap: number
  rowGap?: number
  columnGap?: number
}

/**
 * Compute flexbox layout for a container and its children.
 *
 * @param allowShrink - Pass false for scrollable containers so that children
 *   retain their natural size and overflow rather than being compressed to fit.
 */
export function computeFlexLayout(
  _container: LayoutNode,
  children: LayoutNode[],
  config: FlexConfig,
  containerWidth: number,
  containerHeight: number,
  allowShrink: boolean = true
): void {
  if (children.length === 0) return

  const {
    flexDirection,
    justifyContent,
    alignItems,
    flexWrap,
    gap,
  } = config

  // Determine if we're in row or column mode
  const isRow = flexDirection === 'row' || flexDirection === 'row-reverse'
  const isReverse = flexDirection === 'row-reverse' || flexDirection === 'column-reverse'

  // Get container size
  const containerMainSize = isRow ? containerWidth : containerHeight
  const containerCrossSize = isRow ? containerHeight : containerWidth

  // Effective gap depends on axis: columnGap for rows, rowGap for columns
  const effectiveGap = isRow
    ? (config.columnGap ?? gap)
    : (config.rowGap ?? gap)

  // If wrapping is disabled, use the original single-line algorithm
  if (flexWrap === 'nowrap') {
    layoutSingleLine(children, config, containerMainSize, containerCrossSize, isRow, isReverse, effectiveGap, justifyContent, alignItems, allowShrink)
    return
  }

  // Split children into lines based on wrapping
  const lines = splitIntoLines(children, containerMainSize, isRow, effectiveGap, flexWrap === 'wrap-reverse')

  if (lines.length === 0) return

  // Calculate cross-axis position for each line
  let crossOffset = 0

  for (const line of lines) {
    if (line.children.length === 0) continue

    // Layout this line
    layoutSingleLine(line.children, config, containerMainSize, line.crossSize, isRow, isReverse, effectiveGap, justifyContent, alignItems, allowShrink)

    // Offset all children in this line by the cross-axis position
    for (const child of line.children) {
      if (!child.layout) continue

      if (isRow) {
        child.layout.y += crossOffset
      } else {
        child.layout.x += crossOffset
      }
    }

    // Move to next line position
    crossOffset += line.crossSize + gap
  }
}

/**
 * Split children into lines based on wrapping
 */
function splitIntoLines(
  children: LayoutNode[],
  containerSize: number,
  isRow: boolean,
  gap: number,
  reverse: boolean
): Array<{ children: LayoutNode[]; crossSize: number }> {
  const lines: Array<{ children: LayoutNode[]; crossSize: number }> = []
  let currentLine: LayoutNode[] = []
  let currentLineSize = 0
  let currentLineCrossSize = 0

  for (const child of children) {
    if (!child.layout) continue

    const childMainSize = isRow ? child.layout.width : child.layout.height
    const childCrossSize = isRow ? child.layout.height : child.layout.width

    // Check if this child fits on the current line
    const spaceNeeded = currentLine.length === 0
      ? childMainSize
      : currentLineSize + gap + childMainSize

    if (currentLine.length > 0 && spaceNeeded > containerSize) {
      // Start a new line
      lines.push({ children: currentLine, crossSize: currentLineCrossSize })
      currentLine = [child]
      currentLineSize = childMainSize
      currentLineCrossSize = childCrossSize
    } else {
      // Add to current line
      currentLine.push(child)
      currentLineSize = spaceNeeded
      currentLineCrossSize = Math.max(currentLineCrossSize, childCrossSize)
    }
  }

  // Add the last line
  if (currentLine.length > 0) {
    lines.push({ children: currentLine, crossSize: currentLineCrossSize })
  }

  // Reverse lines if wrap-reverse
  return reverse ? lines.reverse() : lines
}

/**
 * Layout children in a single flex line.
 *
 * Implements the CSS flex free-space distribution algorithm:
 * 1. Use flexBasis as base size if specified, otherwise natural computed size
 * 2. Distribute positive free space via flex-grow
 * 3. Distribute negative free space (overflow) via flex-shrink
 * 4. Clamp each final size to min/max constraints
 * 5. Apply justify-content to any remaining free space
 * 6. Position children on the main axis (including per-child margins)
 * 7. Align children on the cross axis (respects per-child alignSelf)
 *
 * For row-reverse / column-reverse, items are placed from the main-end edge
 * toward main-start (first DOM item ends up at the far edge).
 */
function layoutSingleLine(
  children: LayoutNode[],
  _config: FlexConfig,
  containerMainSize: number,
  containerCrossSize: number,
  isRow: boolean,
  isReverse: boolean,
  gap: number,
  justifyContent: FlexConfig['justifyContent'],
  alignItems: FlexConfig['alignItems'],
  allowShrink: boolean = true
): void {
  // Resolve per-child margins on the main axis
  const childMargins = children.map(c => c.layout?.margin ?? { top: 0, right: 0, bottom: 0, left: 0 })
  const mainMargins = childMargins.map(m => ({
    start: isRow ? m.left : m.top,
    end: isRow ? m.right : m.bottom,
  }))
  const totalMainMargins = mainMargins.reduce((sum, m) => sum + m.start + m.end, 0)

  // --- Step 1: Determine base sizes (inner sizes, excluding margins) ---
  const baseSizes: number[] = []
  for (const child of children) {
    if (!child.layout) { baseSizes.push(0); continue }

    const basis = child.layoutProps.flexBasis
    if (basis !== undefined) {
      baseSizes.push(resolveDimension(basis, containerMainSize,
        isRow ? child.layout.width : child.layout.height))
    } else {
      baseSizes.push(isRow ? child.layout.width : child.layout.height)
    }
  }

  const totalGaps = gap * Math.max(0, children.length - 1)
  const totalBaseSize = baseSizes.reduce((a, b) => a + b, 0)
  const hypotheticalFree = containerMainSize - totalBaseSize - totalGaps - totalMainMargins

  // --- Step 2: Apply flex-grow / flex-shrink ---
  const adjustedSizes = [...baseSizes]

  if (hypotheticalFree > 0) {
    // Distribute extra space proportionally via flex-grow
    const totalGrow = children.reduce((sum, c) => sum + (c.layoutProps.flexGrow ?? 0), 0)
    if (totalGrow > 0) {
      for (let i = 0; i < children.length; i++) {
        const grow = children[i]!.layoutProps.flexGrow ?? 0
        if (grow > 0) {
          adjustedSizes[i]! += (grow / totalGrow) * hypotheticalFree
        }
      }
    }
  } else if (hypotheticalFree < 0 && allowShrink) {
    // Absorb overflow proportionally via flex-shrink (weighted by base size).
    // Skipped for scrollable containers — items should overflow, not compress.
    const deficit = -hypotheticalFree
    const weightedShrinks = children.map((c, i) =>
      (c.layoutProps.flexShrink ?? 1) * (baseSizes[i] ?? 0)
    )
    const totalWeightedShrink = weightedShrinks.reduce((a, b) => a + b, 0)
    if (totalWeightedShrink > 0) {
      for (let i = 0; i < children.length; i++) {
        const weight = weightedShrinks[i] ?? 0
        if (weight > 0) {
          adjustedSizes[i] = Math.max(0, (adjustedSizes[i] ?? 0) - (weight / totalWeightedShrink) * deficit)
        }
      }
    }
  }

  // --- Step 2b: Clamp each size to min/max constraints ---
  for (let i = 0; i < adjustedSizes.length; i++) {
    const child = children[i]!
    const minSize = isRow ? (child.layoutProps.minWidth ?? 0) : (child.layoutProps.minHeight ?? 0)
    const maxSize = isRow ? (child.layoutProps.maxWidth ?? Infinity) : (child.layoutProps.maxHeight ?? Infinity)
    adjustedSizes[i] = Math.max(minSize, Math.min(maxSize, adjustedSizes[i]!))
  }

  // Round to integer sizes and apply to child layouts
  const finalSizes = adjustedSizes.map(s => Math.round(s))
  for (let i = 0; i < children.length; i++) {
    const child = children[i]!
    if (!child.layout) continue
    if (isRow) {
      child.layout.width = finalSizes[i]!
    } else {
      child.layout.height = finalSizes[i]!
    }
  }

  // --- Step 3: Compute remaining free space for justify-content ---
  const totalFinal = finalSizes.reduce((a, b) => a + b, 0)
  const freeSpace = Math.max(0, containerMainSize - totalFinal - totalGaps - totalMainMargins)

  // Calculate starting offset and inter-item spacing based on justify-content
  let offset = 0
  let spaceBetween = gap

  switch (justifyContent) {
    case 'flex-start':
      offset = 0
      break
    case 'flex-end':
      offset = freeSpace
      break
    case 'center':
      offset = Math.floor(freeSpace / 2)
      break
    case 'space-between':
      offset = 0
      spaceBetween = children.length > 1
        ? gap + freeSpace / (children.length - 1)
        : gap
      break
    case 'space-around': {
      const spaceAround = freeSpace / children.length
      offset = spaceAround / 2
      spaceBetween = gap + spaceAround
      break
    }
    case 'space-evenly': {
      const spaceEvenly = freeSpace / (children.length + 1)
      offset = spaceEvenly
      spaceBetween = gap + spaceEvenly
      break
    }
  }

  // --- Step 4: Position children ---
  // Helper to compute cross-axis position and apply stretch
  function placeCrossAxis(child: LayoutNode): number {
    if (!child.layout) return 0
    const selfAlign = child.layoutProps.alignSelf
    const effectiveAlign = (selfAlign && selfAlign !== 'auto') ? selfAlign : alignItems
    const childCrossSize = isRow ? child.layout.height : child.layout.width

    switch (effectiveAlign) {
      case 'flex-end':
        return containerCrossSize - childCrossSize
      case 'center':
        return Math.floor((containerCrossSize - childCrossSize) / 2)
      case 'stretch':
        if (isRow) {
          // Only stretch if no explicit height was declared
          if (child.layoutProps.height === undefined) {
            child.layout.height = containerCrossSize
          }
        } else {
          if (child.layoutProps.width === undefined) {
            child.layout.width = containerCrossSize
          }
        }
        return 0
      case 'flex-start':
      case 'baseline':
      default:
        return 0
    }
  }

  if (!isReverse) {
    // Forward: start at offset, advance right/down
    let currentPos = offset
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!
      if (!child.layout) continue

      const marginStart = mainMargins[i]!.start
      const marginEnd = mainMargins[i]!.end
      const crossPos = placeCrossAxis(child)

      // Advance past the start margin before placing
      currentPos += marginStart
      if (isRow) {
        child.layout.x = Math.round(currentPos)
        child.layout.y = Math.round(crossPos)
      } else {
        child.layout.y = Math.round(currentPos)
        child.layout.x = Math.round(crossPos)
      }
      currentPos += finalSizes[i]! + marginEnd + spaceBetween
    }
  } else {
    // Reverse: start from main-end, advance left/up
    // First DOM item ends up at the far (main-end) edge (CSS row-reverse / column-reverse behaviour)
    let currentPos = containerMainSize - offset
    for (let i = 0; i < children.length; i++) {
      const child = children[i]!
      if (!child.layout) continue

      const marginStart = mainMargins[i]!.start
      const marginEnd = mainMargins[i]!.end
      const crossPos = placeCrossAxis(child)

      // Retreat past end margin, then the item itself, then place
      currentPos -= marginEnd + finalSizes[i]!
      if (isRow) {
        child.layout.x = Math.round(currentPos)
        child.layout.y = Math.round(crossPos)
      } else {
        child.layout.y = Math.round(currentPos)
        child.layout.x = Math.round(crossPos)
      }
      currentPos -= marginStart + spaceBetween
    }
  }
}

/**
 * Extract flexbox configuration from layout properties
 */
export function getFlexConfig(props: LayoutProperties): FlexConfig {
  return {
    flexDirection: props.flexDirection || 'row',
    justifyContent: props.justifyContent || 'flex-start',
    alignItems: props.alignItems || 'stretch',
    flexWrap: props.flexWrap || 'nowrap',
    gap: props.gap || 0,
    rowGap: props.rowGap,
    columnGap: props.columnGap,
  }
}

/**
 * Check if a node is a flex container
 */
export function isFlexContainer(props: LayoutProperties): boolean {
  return props.display === 'flex'
}

/**
 * Resolve a calc() expression against a container size.
 * Supports basic arithmetic: +, -, *, / and percentage values.
 */
function resolveCalc(value: string, containerSize: number): number {
  const inner = value.slice(5, -1).trim()
  // Replace percentages with resolved pixel values
  const resolved = inner.replace(/(\d+(?:\.\d+)?)%/g, (_, n) =>
    String((parseFloat(n) / 100) * containerSize)
  )
  // Only evaluate if the expression contains safe characters
  if (/^[\d\s+\-*/().]+$/.test(resolved)) {
    try {
      // eslint-disable-next-line no-new-func
      return Math.round(Function(`"use strict"; return (${resolved})`)() as number)
    } catch {
      return 0
    }
  }
  return 0
}

/**
 * Resolve dimension (handles percentages, calc(), and special values)
 */
export function resolveDimension(
  value: number | string | undefined,
  containerSize: number,
  defaultValue: number
): number {
  if (value === undefined) return defaultValue

  if (typeof value === 'number') return value

  if (typeof value === 'string') {
    // Handle calc()
    if (value.startsWith('calc(') && value.endsWith(')')) {
      return resolveCalc(value, containerSize)
    }

    // Handle percentage
    if (value.includes('%')) {
      const percent = parseInt(value) / 100
      return Math.floor(containerSize * percent)
    }

    // Handle 'shrink' - content-based sizing (return default for now)
    if (value === 'shrink') {
      return defaultValue
    }

    // Try to parse as number
    const parsed = parseInt(value)
    if (!isNaN(parsed)) return parsed
  }

  return defaultValue
}
