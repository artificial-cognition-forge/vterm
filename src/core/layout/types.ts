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
    width: number
    fg?: string
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

    // Border
    border?: BorderStyle
    borderWidth?: number
    borderFg?: string
    borderType?: "line" | "bg" | "heavy" | "double" | "ascii"

    // Positioning
    position?: "relative" | "absolute"
    top?: number | string
    left?: number | string
    right?: number | string
    bottom?: number | string

    // Visual styles
    visualStyles?: VisualStyle

    // Text alignment
    textAlign?: 'left' | 'center' | 'right'

    // Scroll support
    scrollable?: boolean
    alwaysScroll?: boolean
    scrollableX?: boolean
    scrollableY?: boolean

    // Pseudo-states (can override any layout property)
    hover?: Partial<LayoutProperties>
    focus?: Partial<LayoutProperties>
    active?: Partial<LayoutProperties>
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

    // Interactive element state (for input/textarea nodes)
    _inputValue?: string
    _cursorPos?: number

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
}
