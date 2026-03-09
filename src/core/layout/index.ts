/**
 * Layout Engine - Platform-Agnostic Layout System
 *
 * This module provides a clean separation between layout computation
 * and the terminal renderer.
 *
 * @packageDocumentation
 */

// Types
export type {
  LayoutNode,
  LayoutProperties,
  ElementType,
  VisualStyle,
  Spacing,
  BorderStyle,
  ComputedLayout,
  CreateLayoutNodeOptions,
  LayoutEngineConfig,
  EventHandler,
} from './types'

// Tree & Engine
export {
  LayoutEngine,
  createLayoutEngine,
  createLayoutNode,
} from './tree'

// Flexbox
export {
  computeFlexLayout,
  getFlexConfig,
  isFlexContainer,
  resolveDimension,
} from './flexbox'

export type { FlexConfig } from './flexbox'

// Utilities
export { isScrollableNode } from './utils'

// Box Model
export {
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
