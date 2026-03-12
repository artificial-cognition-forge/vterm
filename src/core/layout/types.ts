/**
 * Platform-agnostic layout types for VTerm
 *
 * These types define the intermediate representation between Vue VNodes
 * and the terminal renderer.
 */

/**
 * Spacing values for box model properties (padding, margin)
 */
export interface Spacing {
    top: number
    right: number
    bottom: number
    left: number
}

/**
 * Border style properties
 */
export interface BorderStyle {
    width: number                                          // full-border shorthand (0 = no full border)
    top?: number                                           // per-side: undefined = inherit from width
    right?: number
    bottom?: number
    left?: number
    fg?: string
    topFg?: string
    rightFg?: string
    bottomFg?: string
    leftFg?: string
    type?: "line" | "bg" | "heavy" | "double" | "ascii"
}

/**
 * Visual style properties (colors, fonts, etc.)
 */
export interface VisualStyle {
    fg?: string
    bg?: string
    bold?: boolean
    underline?: boolean
    blink?: boolean
    inverse?: boolean
    invisible?: boolean
    transparent?: boolean
  italic?: boolean
  dim?: boolean
  opacity?: number

    // Border styling
    border?: {
        fg?: string
        bg?: string
    }

    // Pseudo-state styles
    hover?: VisualStyle
    focus?: VisualStyle
    active?: VisualStyle
}

/**
 * Computed layout properties after layout engine runs
 */
export interface ComputedLayout {
    // Absolute position (computed by layout engine)
    x: number
    y: number

    // Computed dimensions
    width: number
    height: number

    // Box model
    padding: Spacing
    margin: Spacing
    border: BorderStyle
}

/**
 * Layout properties from CSS transformation
 * Platform-agnostic representation of layout rules
 */
export interface LayoutProperties {
    // Layout mode
    display?: "block" | "flex" | "inline" | "none"

    // Flexbox properties
    flexDirection?: "row" | "column" | "row-reverse" | "column-reverse"
    justifyContent?:
        | "flex-start"
        | "flex-end"
        | "center"
        | "space-between"
        | "space-around"
        | "space-evenly"
    alignItems?: "flex-start" | "flex-end" | "center" | "stretch" | "baseline"
    alignSelf?: "auto" | "flex-start" | "flex-end" | "center" | "stretch" | "baseline"
    flexWrap?: "nowrap" | "wrap" | "wrap-reverse"
    flexGrow?: number
    flexShrink?: number
    flexBasis?: number | string
    gap?: number
    rowGap?: number
    columnGap?: number

    // Box model dimensions
    width?: number | string // e.g., 100 or '50%' or 'shrink'
    height?: number | string
    minWidth?: number
    minHeight?: number
    maxWidth?: number
    maxHeight?: number

    // Box model spacing
    padding?: Spacing | number // number = all sides
    paddingTop?: number
    paddingRight?: number
    paddingBottom?: number
    paddingLeft?: number
    margin?: Spacing | number
    marginTop?: number
    marginRight?: number
    marginBottom?: number
    marginLeft?: number

    // Border (shorthand)
    border?: BorderStyle
    borderWidth?: number
    borderFg?: string
    borderType?: "line" | "bg" | "heavy" | "double" | "ascii"

    // Per-side borders
    borderTopWidth?: number
    borderRightWidth?: number
    borderBottomWidth?: number
    borderLeftWidth?: number
    borderTopColor?: string
    borderRightColor?: string
    borderBottomColor?: string
    borderLeftColor?: string

    // Positioning
    position?: "relative" | "absolute"
    top?: number | string
    left?: number | string
    right?: number | string
    bottom?: number | string

    // Stacking context
    zIndex?: number | "auto"

    // Visual styles
    visualStyles?: VisualStyle

    // Text alignment and wrapping
    textAlign?: 'left' | 'center' | 'right'
    verticalAlign?: 'top' | 'middle' | 'bottom'
    whiteSpace?: 'normal' | 'nowrap' | 'pre' | 'pre-wrap' | 'pre-line'

    // Scroll support
    scrollable?: boolean
    alwaysScroll?: boolean
    scrollableX?: boolean
    scrollableY?: boolean

    // Pointer events
    pointerEvents?: "auto" | "none"

    // Pseudo-states (can override any layout property)
    hover?: Partial<LayoutProperties>
    focus?: Partial<LayoutProperties>
    active?: Partial<LayoutProperties>

    // CSS variables (--name: value pairs)
    cssVariables?: Record<string, string>
}

/**
 * Supported HTML element types.
 * The catch-all string allows custom/component elements.
 */
export type ElementType =
    // Container elements
    | "div"
    | "section"
    | "article"
    | "header"
    | "footer"
    | "main"
    | "nav"
    | "aside"
    // Heading elements
    | "h1"
    | "h2"
    | "h3"
    | "h4"
    | "h5"
    | "h6"
    // Text block elements
    | "p"
    | "pre"
    // Inline elements
    | "span"
    | "strong"
    | "em"
    | "code"
    // List elements
    | "ul"
    | "ol"
    | "li"
    // Link elements
    | "a"
    // Form elements
    | "form"
    | "button"
    | "input"
    | "textarea"
    | "select"
    | "label"
    // Internal types used by the layout engine
    | "box"   // generic container (default for component roots)
    | "text"  // raw text node
    // Custom / user-defined elements
    | string

/**
 * Event handler type
 */
export type EventHandler = (...args: any[]) => void

/**
 * Platform-agnostic layout node
 *
 * This is the core data structure that decouples layout computation
 * from the terminal renderer.
 */
export interface LayoutNode {
    // Identity
    id: string
    type: ElementType

    // Layout properties (from CSS transformation — display, flex, dimensions, etc.)
    layoutProps: LayoutProperties

    // Computed layout (set by layout engine)
    layout: ComputedLayout | null

    // Visual styles (from CSS or inline props)
    style: VisualStyle

    // Content & behavior
    content?: string | null
    props: Record<string, any>
    events: Map<string, EventHandler>

    // Tree structure
    children: LayoutNode[]
    parent: LayoutNode | null

    // Scroll state
    scrollX: number
    scrollY: number
    contentHeight?: number // Total height of scrollable content

    // Stacking context
    zIndex: number // Computed z-index (0 for auto, or numeric value)

    // Stacking context information (set by buildStackingContextTree)
    createsStackingContext: boolean // Does this node create a new stacking context?

    // Original content before text wrapping (used to re-wrap on resize)
    _originalContent?: string

    // Interactive element state (for input/textarea nodes)
    _inputValue?: string
    _cursorPos?: number
    _selectionStart?: number
    _selectionEnd?: number
    _prevCursorPos?: number

    // Editor element state
    _editorMode?: 'normal' | 'insert'
    _editorYankBuffer?: string    // line yank register for dd/yy/p
    _editorPendingKey?: string    // for two-key sequences like 'dd', 'gg'
    _editorStickyCol?: number     // remembered column for up/down navigation
    _editorDragActive?: boolean   // true while mouse button held for drag-select
    _editorSelAnchor?: number     // selection anchor for drag / shift-click
    _editorLastClickTime?: number // timestamp of last mousedown (double-click detection)
    _editorLastClickPos?: number  // cursor pos of last mousedown (double-click detection)

    // Style cache (for performance optimization)
    _cachedEffectiveStyle?: VisualStyle
    _cachedStyleState?: string  // Tracks hover|focus|active|none state

    // CSS scope ID (set when node belongs to a scoped SFC style block)
    _scopeId?: string

    // Original VNode data (for debugging)
    _vnode?: any
}

/**
 * Options for creating a layout node
 */
export interface CreateLayoutNodeOptions {
    type: ElementType
    props?: Record<string, any>
    content?: string
    style?: VisualStyle
    children?: LayoutNode[]
}

/**
 * Layout engine configuration
 */
export interface LayoutEngineConfig {
    // Container dimensions
    containerWidth: number
    containerHeight: number

    // Layout options
    defaultDisplay?: "block" | "flex"
    defaultFlexDirection?: "row" | "column"

    // CSS styles (optional, for CSS variable resolution)
    styles?: Record<string, LayoutProperties>
}
