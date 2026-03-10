/**
 * Layout tree builder and layout engine
 *
 * Converts Vue VNodes to LayoutNodes and computes layout
 */

import type { VNode } from "vue"
import type {
    LayoutNode,
    LayoutProperties,
    ElementType,
    VisualStyle,
    CreateLayoutNodeOptions,
    LayoutEngineConfig,
    BorderStyle,
    Spacing,
} from "./types"
import { computeFlexLayout, getFlexConfig, isFlexContainer, resolveDimension } from "./flexbox"
import { getPadding, getMargin, getBorder, applyConstraints } from "./box-model"
import { isScrollableNode } from "./utils"
import { wrapText, enableWrapCache, clearWrapCache } from "./text-wrapper"

/**
 * Counter for generating unique node IDs
 */
let nodeIdCounter = 0

/**
 * Create a layout node
 */
export function createLayoutNode(options: CreateLayoutNodeOptions): LayoutNode {
    return {
        id: `node-${nodeIdCounter++}`,
        type: options.type,
        layoutProps: {},
        props: options.props || {},
        content: options.content || null,
        style: options.style || {},
        events: new Map(),
        children: options.children || [],
        parent: null,
        layout: null,
        scrollX: 0,
        scrollY: 0,
        zIndex: 0,
        createsStackingContext: false,
    }
}

/**
 * Index of compound selectors by their target class (for fast lookup)
 */
interface CompoundSelectorIndex {
    [className: string]: Array<{ selector: string; parts: string[]; style: LayoutProperties }>
}

/**
 * Layout Engine - computes layout for a tree of layout nodes
 */
export class LayoutEngine {
    private config: LayoutEngineConfig
    private compoundSelectorIndex: CompoundSelectorIndex = {}
    private styleCache: Map<string, LayoutProperties> = new Map()  // Cache by class string

    constructor(config: LayoutEngineConfig) {
        this.config = config
    }

    /**
     * Update container dimensions (e.g., on screen resize)
     */
    updateContainerSize(width: number, height: number): void {
        this.config.containerWidth = width
        this.config.containerHeight = height
    }

    /**
     * Get current container dimensions
     */
    getContainerSize(): { width: number; height: number } {
        return {
            width: this.config.containerWidth,
            height: this.config.containerHeight,
        }
    }

    /**
     * Generate a cache key for class name caching
     */
    private getClassCacheKey(classValue: any, ancestorClasses: string[]): string {
        // Normalize class names to a consistent string key
        const classNames = classValue
            ? Array.isArray(classValue)
                ? classValue.sort().join(',')
                : String(classValue).split(' ').sort().join(',')
            : ''
        const ancestorKey = ancestorClasses.length > 0 ? ':' + ancestorClasses.sort().join(',') : ''
        return classNames + ancestorKey
    }

    /**
     * Build compound selector index for fast O(1) lookups
     */
    private buildCompoundSelectorIndex(styles: Map<string, LayoutProperties>): void {
        this.compoundSelectorIndex = {}
        for (const [selector, style] of styles) {
            // Only index compound selectors (contain spaces)
            if (!selector.includes(" ")) continue
            const parts = selector.split(/\s+/)
            const lastPart = parts[parts.length - 1]!
            const className = lastPart.startsWith(".") ? lastPart.slice(1) : lastPart
            if (!this.compoundSelectorIndex[className]) {
                this.compoundSelectorIndex[className] = []
            }
            this.compoundSelectorIndex[className]!.push({ selector, parts, style })
        }
    }

    /**
     * Build a layout tree from a Vue VNode
     * Accepts styles as either a Map or a plain object (ParsedStyles)
     */
    buildLayoutTree(vnode: VNode, styles?: Map<string, LayoutProperties> | Record<string, LayoutProperties>): LayoutNode {
        // Convert plain object to Map if necessary
        let stylesMap: Map<string, LayoutProperties>
        if (!styles) {
            stylesMap = new Map()
        } else if (styles instanceof Map) {
            stylesMap = styles
        } else {
            stylesMap = new Map(Object.entries(styles))
        }

        // Clear caches for this build
        this.styleCache.clear()

        // Build compound selector index for O(1) lookups
        this.buildCompoundSelectorIndex(stylesMap)

        const node = this.vnodeToLayoutNode(vnode, stylesMap)
        this.linkParents(node)
        return node
    }

    /**
     * Compute layout for the entire tree
     */
    computeLayout(root: LayoutNode): void {
        // Enable text wrapping cache for this layout pass (OPT-13)
        enableWrapCache()
        try {
            this.computeNodeLayout(
                root,
                this.config.containerWidth,
                this.config.containerHeight,
                0,
                0,
                undefined
            )
        } finally {
            // Clear cache after layout is complete to free memory
            clearWrapCache()
        }
    }

    /**
     * Convert a VNode to a LayoutNode
     */
    private vnodeToLayoutNode(
        vnode: VNode,
        styles: Map<string, LayoutProperties>,
        ancestorClasses: string[] = []
    ): LayoutNode {
        // Extract type - handle string types and component types
        let type: ElementType = "box"
        if (typeof vnode.type === "string") {
            type = vnode.type as ElementType
        } else if (vnode.type && typeof vnode.type === "object") {
            // Component - use 'box' as default container
            type = "box"
        }

        // Extract props
        const props = (vnode.props as Record<string, any>) || {}

        // Extract content for text nodes
        let content: string | null = null
        if (typeof vnode.children === "string") {
            // Normalize whitespace like HTML: collapse leading/trailing whitespace and newlines
            content = vnode.children.trim() || null
        } else if (props.content) {
            content = String(props.content)
        }

        // Get styles for this node - use cache to avoid recomputing for duplicate classes
        let layoutProps: LayoutProperties
        const classKey = this.getClassCacheKey(props.class, ancestorClasses)
        const cached = this.styleCache.get(classKey)
        if (cached) {
            // Return a new object from the cache (don't share references)
            layoutProps = { ...cached }
        } else {
            layoutProps = this.resolveStyles(props, styles, ancestorClasses)
            this.styleCache.set(classKey, layoutProps)
        }

        // Extract visual styles
        const style: VisualStyle = this.extractVisualStyles(layoutProps, props)

        // Collect this node's classes to pass as ancestor context to children
        const ownClasses = props.class
            ? Array.isArray(props.class)
                ? props.class
                : String(props.class).split(" ")
            : []
        const childAncestorClasses = [...ancestorClasses, ...ownClasses]

        // Convert children
        const children: LayoutNode[] = []
        if (Array.isArray(vnode.children)) {
            for (const child of vnode.children) {
                if (child && typeof child === "object" && "type" in child) {
                    children.push(
                        this.vnodeToLayoutNode(child as VNode, styles, childAncestorClasses)
                    )
                }
            }
        }

        const node: LayoutNode = {
            id: `node-${nodeIdCounter++}`,
            type,
            layoutProps,
            props,
            content,
            style,
            events: new Map(),
            children,
            parent: null,
            layout: null,
            scrollX: 0,
            scrollY: 0,
            zIndex: 0,
            createsStackingContext: false,
            _vnode: vnode,
        }

        return node
    }

    /**
     * Link parent references in the tree
     */
    private linkParents(node: LayoutNode): void {
        for (const child of node.children) {
            child.parent = node
            this.linkParents(child)
        }
    }

    /**
     * Resolve styles for a node (from CSS and inline props)
     */
    private resolveStyles(
        props: Record<string, any>,
        styles: Map<string, LayoutProperties>,
        ancestorClasses: string[] = []
    ): LayoutProperties {
        let resolved: LayoutProperties = {}

        const applyStyle = (classStyle: LayoutProperties) => {
            const { visualStyles, ...otherStyles } = classStyle
            resolved = { ...resolved, ...otherStyles }
            if (visualStyles) {
                resolved.visualStyles = { ...resolved.visualStyles, ...visualStyles }
            }
        }

        // Apply class-based styles
        if (props.class) {
            const classNames = Array.isArray(props.class)
                ? props.class
                : String(props.class).split(" ")

            for (const className of classNames) {
                // Simple selector: .className
                const classStyle = styles.get(`.${className}`)
                if (classStyle) {
                    applyStyle(classStyle)
                }

                // Compound (descendant) selectors: use pre-built index for O(1) lookup
                const compoundSelectors = this.compoundSelectorIndex[className] || []
                for (const { parts, style: selectorStyle } of compoundSelectors) {
                    // All preceding parts must appear in ancestor class list
                    const precedingParts = parts.slice(0, -1)
                    const allMatch = precedingParts.every(part =>
                        ancestorClasses.includes(part.startsWith(".") ? part.slice(1) : part)
                    )
                    if (allMatch) {
                        applyStyle(selectorStyle)
                    }
                }
            }
        }

        // Inline props override class styles
        if (props.width !== undefined) resolved.width = props.width
        if (props.height !== undefined) resolved.height = props.height
        if (props.top !== undefined) resolved.top = props.top
        if (props.left !== undefined) resolved.left = props.left
        if (props.padding !== undefined) resolved.padding = props.padding
        if (props.margin !== undefined) resolved.margin = props.margin

        return resolved
    }

    /**
     * Extract visual styles from layout properties and props
     */
    private extractVisualStyles(
        layoutProps: LayoutProperties,
        props: Record<string, any>
    ): VisualStyle {
        const style: VisualStyle = {}

        // From layout properties
        if (layoutProps.visualStyles) {
            Object.assign(style, layoutProps.visualStyles)
        }

        // Pseudo-state visual styles (:hover, :focus, :active)
        // These are stored as Partial<LayoutProperties> on layoutProps.hover/focus/active.
        // Copy their visualStyles into node.style.hover/focus/active so that
        // getEffectiveStyle() in the buffer renderer can merge them.
        if (layoutProps.hover?.visualStyles) {
            style.hover = layoutProps.hover.visualStyles
        }
        if (layoutProps.focus?.visualStyles) {
            style.focus = layoutProps.focus.visualStyles
        }
        if (layoutProps.active?.visualStyles) {
            style.active = layoutProps.active.visualStyles
        }

        // From inline props
        if (props.fg) style.fg = props.fg
        if (props.bg) style.bg = props.bg
        if (props.bold !== undefined) style.bold = props.bold
        if (props.underline !== undefined) style.underline = props.underline
        if (props.border) style.border = props.border

        return style
    }

    /**
     * Recursively shift all descendants by (deltaX, deltaY).
     *
     * Called after a flex child's absolute position changes so that
     * grandchildren (already computed with the old position) stay in sync.
     */
    private shiftSubtree(node: LayoutNode, deltaX: number, deltaY: number): void {
        for (const child of node.children) {
            if (child.layout) {
                child.layout.x += deltaX
                child.layout.y += deltaY
                this.shiftSubtree(child, deltaX, deltaY)
            }
        }
    }

    /**
     * Re-compute a node's children layout using the node's current (post-flex) dimensions.
     *
     * Called when flex stretch (or other flex sizing) changes a child's width/height
     * AFTER its children were already computed. Without this, nested flex containers
     * would lay out their own children using the pre-stretch size (often 0), making
     * grandchildren invisible.
     *
     * Example: .container(flex-col) → nav(flex-row) → a, a, a
     *   1. nav starts with width=0 (cross-axis in flex-col, shrink-to-content default)
     *   2. nav's <a> children computed with containerWidth=0 → crushed to width=0
     *   3. flex stretch sets nav.width = containerWidth (80)
     *   4. THIS method re-runs nav's children with containerWidth=80 → a's get correct sizes
     */
    private relayoutSubtreeChildren(node: LayoutNode): void {
        if (!node.layout || node.children.length === 0) return

        const { x, y, width, height, padding, border } = node.layout
        const borderOffset = border.width > 0 ? 1 : 0
        const contentX = x + padding.left + borderOffset
        const contentY = y + padding.top + borderOffset
        const contentWidth = Math.max(0, width - padding.left - padding.right - borderOffset * 2)
        const contentHeight = Math.max(0, height - padding.top - padding.bottom - borderOffset * 2)

        if (isFlexContainer(node.layoutProps)) {
            const flexConfig = getFlexConfig(node.layoutProps)
            const childFlexDir =
                flexConfig.flexDirection === "column" ||
                flexConfig.flexDirection === "column-reverse"
                    ? "column"
                    : "row"

            for (const child of node.children) {
                this.computeNodeLayout(child, contentWidth, contentHeight, contentX, contentY, childFlexDir)
            }

            const preFlex = node.children.map(c => ({
                x: c.layout?.x ?? 0,
                y: c.layout?.y ?? 0,
                width: c.layout?.width ?? 0,
                height: c.layout?.height ?? 0,
            }))

            const flexChildren = node.children.filter(
                c => c.layoutProps.display !== "none" && c.layoutProps.position !== "absolute" && !c.props._isComment
            )

            let flexContentHeight = contentHeight
            if (node.layout.height === 0 && flexChildren.length > 0 && !isScrollableNode(node)) {
                const isRowContainer = childFlexDir === "row"
                const effectiveGap = isRowContainer
                    ? (flexConfig.columnGap ?? flexConfig.gap)
                    : (flexConfig.rowGap ?? flexConfig.gap)
                let autoHeight = 0
                if (isRowContainer) {
                    for (const child of flexChildren) {
                        if (child.layout) autoHeight = Math.max(autoHeight, child.layout.height)
                    }
                } else {
                    for (const child of flexChildren) {
                        if (child.layout) autoHeight += child.layout.height
                    }
                    autoHeight += effectiveGap * Math.max(0, flexChildren.length - 1)
                }
                autoHeight += padding.top + padding.bottom + borderOffset * 2
                if (node.layoutProps.maxHeight !== undefined && autoHeight > node.layoutProps.maxHeight) {
                    autoHeight = node.layoutProps.maxHeight
                }
                node.layout.height = autoHeight
                flexContentHeight = autoHeight - padding.top - padding.bottom - borderOffset * 2
            }

            computeFlexLayout(node, flexChildren, flexConfig, contentWidth, flexContentHeight, !isScrollableNode(node))

            for (let i = 0; i < node.children.length; i++) {
                const child = node.children[i]!
                if (
                    child.layout &&
                    child.layoutProps.display !== "none" &&
                    child.layoutProps.position !== "absolute" &&
                    !child.props._isComment
                ) {
                    child.layout.x += contentX
                    child.layout.y += contentY
                    const deltaX = child.layout.x - (preFlex[i]?.x ?? 0)
                    const deltaY = child.layout.y - (preFlex[i]?.y ?? 0)
                    if (deltaX !== 0 || deltaY !== 0) {
                        this.shiftSubtree(child, deltaX, deltaY)
                    }
                    // Recurse if flex changed this child's dimensions (e.g. flex-grow or stretch)
                    const widthChanged = child.layout.width !== preFlex[i]!.width
                    const heightChanged = child.layout.height !== preFlex[i]!.height
                    if ((widthChanged || heightChanged) && child.children.length > 0) {
                        this.relayoutSubtreeChildren(child)
                    }
                }
            }
        } else {
            // Block layout: re-stack children vertically
            let currentY = contentY
            for (const child of node.children) {
                const isAbsolute = child.layoutProps.position === "absolute"
                const childParentY = isAbsolute ? contentY : currentY
                this.computeNodeLayout(child, contentWidth, contentHeight, contentX, childParentY, undefined)
                if (child.layout && !isAbsolute) {
                    currentY += child.layout.height + child.layout.margin.bottom
                }
            }
        }

        // Update scroll metrics if needed
        if (isScrollableNode(node) && node.children.length > 0) {
            let maxChildBottom = 0
            for (const child of node.children) {
                if (child.layout && child.layoutProps.display !== "none") {
                    const childBottom = child.layout.y - contentY + child.layout.height + child.layout.margin.bottom
                    maxChildBottom = Math.max(maxChildBottom, childBottom)
                }
            }
            node.contentHeight = maxChildBottom
        }
    }

    private getNodeTextContent(node: LayoutNode): string | null {
        if (typeof node.content === "string" && node.content.length > 0) {
            return node.content
        }

        if (!node.children || node.children.length === 0) {
            return null
        }

        let text = ""
        for (const child of node.children) {
            if (child.type === "text" && typeof child.content === "string") {
                text += child.content
            }
        }

        return text.length > 0 ? text : null
    }

    private getCodeMetrics(node: LayoutNode): { maxLineLength: number; lineCount: number } {
        const text = this.getNodeTextContent(node)
        if (!text) {
            return { maxLineLength: 0, lineCount: 0 }
        }

        const lines = text.split("\n")
        let maxLineLength = 0
        for (const line of lines) {
            if (line.length > maxLineLength) {
                maxLineLength = line.length
            }
        }
        return { maxLineLength, lineCount: lines.length }
    }

    /**
     * Get default width for an element based on its type and flex context.
     *
     * In a flex-column parent, width is the cross axis. With alignItems other
     * than stretch, container elements should shrink to their content (0) rather
     * than fill the full container width. Text/heading elements still need a
     * concrete width so their content renders correctly.
     */
    private getDefaultWidth(
        node: LayoutNode,
        containerWidth: number,
        parentFlexDir?: "row" | "column"
    ): number {
        if (node.type === "code") {
            const metrics = this.getCodeMetrics(node)
            return metrics.maxLineLength
        }

        // Inline elements always shrink to content width
        if (["span", "strong", "em"].includes(node.type)) {
            return 0
        }

        // Text nodes size to their content length (intrinsic width)
        if (node.type === "text") {
            return node.content ? node.content.length : 0
        }

        // In a flex-column parent, width is the cross axis.
        // Container elements shrink to content; text elements still fill for rendering.
        if (parentFlexDir === "column") {
            if (["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "label"].includes(node.type)) {
                return containerWidth
            }
            return 0
        }

        // In a flex-row parent, width is the main axis.
        // Container elements shrink to content width (native CSS behavior: width:auto).
        // Text/heading elements still need a concrete width so their content renders correctly.
        // Form elements retain their block default (containerWidth) since they have browser-
        // defined intrinsic sizes — users set explicit widths or flex:1 to constrain them.
        if (parentFlexDir === "row") {
            if (
                [
                    "p",
                    "h1",
                    "h2",
                    "h3",
                    "h4",
                    "h5",
                    "h6",
                    "li",
                    "label",
                    "input",
                    "textarea",
                    "button",
                    "select",
                ].includes(node.type)
            ) {
                return containerWidth
            }
            // Node with direct inline text content: use text length as intrinsic width
            if (node.content) {
                return node.content.length
            }
            return 0
        }

        // Block layout: fill available container width
        return containerWidth
    }

    /**
     * Get default height for an element based on its type.
     *
     * For form elements (input, textarea, button) we factor in border and
     * padding so the default height guarantees at least 1 row of usable
     * content area. Without this, an input with border:1 gets height=1
     * meaning content area = 1 - 2 = -1 (content rendered outside the box).
     */
    private getDefaultHeight(
        node: LayoutNode,
        _containerHeight: number,
        border: BorderStyle,
        padding: Spacing
    ): number {
        const borderH = border.width > 0 ? 2 : 0
        const paddingH = padding.top + padding.bottom

        // Single-line text and heading elements
        if (["p", "h1", "h2", "h3", "h4", "h5", "h6", "li", "label"].includes(node.type)) {
            return 1
        }

        // Text nodes: use the actual line count so multiline content gets enough height
        if (node.type === "text") {
            return node.content ? node.content.split("\n").length : 0
        }

        // Inline elements: always 1 line tall
        if (["span", "strong", "em"].includes(node.type)) {
            return 1
        }

        if (node.type === "code") {
            const metrics = this.getCodeMetrics(node)
            return Math.max(1, metrics.lineCount)
        }

        // Single-line form elements — outer height = 1 content row + border + padding
        if (["button", "input", "select"].includes(node.type)) {
            return 1 + borderH + paddingH
        }

        // textarea defaults to 3 content rows + border + padding
        if (node.type === "textarea") {
            return 3 + borderH + paddingH
        }

        // Elements with direct text content expand to fit it
        if (node.content) {
            return node.content.split("\n").length
        }

        // Scrollable containers fill available height to create a fixed viewport.
        // Without an explicit height, a scrollable element must be bounded so
        // content can overflow and be scrolled — otherwise it auto-expands to
        // fit all children and maxScroll is always 0.
        if (isScrollableNode(node)) {
            return _containerHeight
        }

        // Container elements (div, section, ul, etc.) shrink to fit children
        return 0
    }

    /**
     * Apply text wrapping to a node's content based on CSS white-space rules
     * Updates node.content with wrapped text and returns the number of lines
     */
    private applyTextWrapping(node: LayoutNode, contentWidth: number): number {
        // Only wrap if there's actual content and positive width
        if (!node.content || contentWidth <= 0) {
            return 0
        }

        const whiteSpace = node.layoutProps.whiteSpace ?? 'normal'

        // For terminal rendering, if content already has explicit newlines,
        // preserve them and only wrap each line individually (don't collapse them)
        if (node.content.includes('\n')) {
            // Split by newlines, wrap each line separately, rejoin
            const lines = node.content.split('\n')
            const wrappedAll: string[] = []
            for (const line of lines) {
                const wrappedLines = wrapText(line, contentWidth, 'pre-line')
                wrappedAll.push(...wrappedLines)
            }
            node.content = wrappedAll.join('\n')
            return wrappedAll.length
        }

        // No explicit newlines: apply full text wrapping with white-space semantics
        const wrappedLines = wrapText(node.content, contentWidth, whiteSpace)
        node.content = wrappedLines.join('\n')
        return wrappedLines.length
    }

    /**
     * Compute layout for a single node and its children
     */
    private computeNodeLayout(
        node: LayoutNode,
        containerWidth: number,
        containerHeight: number,
        parentX: number,
        parentY: number,
        parentFlexDir?: "row" | "column"
    ): void {
        const layoutProps: LayoutProperties = node.layoutProps

        // display: none — give the node zero dimensions and skip children
        if (layoutProps.display === "none") {
            node.layout = {
                x: parentX,
                y: parentY,
                width: 0,
                height: 0,
                padding: { top: 0, right: 0, bottom: 0, left: 0 },
                margin: { top: 0, right: 0, bottom: 0, left: 0 },
                border: { width: 0, type: "line" },
            }
            return
        }

        // Get box model properties
        const padding = getPadding(layoutProps)
        const margin = getMargin(layoutProps)
        const border = getBorder(layoutProps)

        // Determine default dimensions based on element type
        // For block layout, elements should shrink-to-fit by default, not fill container
        const defaultWidth = this.getDefaultWidth(node, containerWidth, parentFlexDir)
        const defaultHeight = this.getDefaultHeight(node, containerHeight, border, padding)

        // Resolve dimensions
        let width = resolveDimension(layoutProps.width, containerWidth, defaultWidth)
        let height = resolveDimension(layoutProps.height, containerHeight, defaultHeight)

        // Apply text wrapping if this node has content that needs wrapping
        // Skip wrapping for elements that preserve whitespace (pre, pre-wrap, pre-line, nowrap)
        // or for code elements (which default to pre)
        const whiteSpace = layoutProps.whiteSpace ?? (node.type === 'code' ? 'pre' : 'normal')
        const shouldWrap = node.content &&
            whiteSpace === 'normal' &&
            node.type !== 'code' &&
            node.type !== 'pre'

        if (shouldWrap) {
            const contentWidth = width - border.width * 2
            const wrappedLineCount = this.applyTextWrapping(node, contentWidth)
            // If height was not explicitly set, update it based on wrapped content
            if (!layoutProps.height && wrappedLineCount > 0) {
                height = wrappedLineCount
            }
        }

        // Apply constraints
        const constrained = applyConstraints(width, height, layoutProps)
        width = constrained.width
        height = constrained.height

        // Calculate position
        let x = parentX
        let y = parentY

        // Handle explicit positioning
        if (layoutProps.position === "absolute") {
            // right/bottom are resolved relative to container, then used to derive x/y
            if (layoutProps.right !== undefined) {
                const rightVal = resolveDimension(layoutProps.right, containerWidth, 0)
                x = parentX + containerWidth - width - rightVal
            } else {
                x = parentX + resolveDimension(layoutProps.left, containerWidth, 0)
            }
            if (layoutProps.bottom !== undefined) {
                const bottomVal = resolveDimension(layoutProps.bottom, containerHeight, 0)
                y = parentY + containerHeight - height - bottomVal
            } else {
                y = parentY + resolveDimension(layoutProps.top, containerHeight, 0)
            }
        } else if (layoutProps.position === "relative") {
            const offsetX = resolveDimension(layoutProps.left, containerWidth, 0)
            const offsetY = resolveDimension(layoutProps.top, containerHeight, 0)
            x += offsetX
            y += offsetY
        }

        // Apply margin
        x += margin.left
        y += margin.top

        // Set computed layout
        node.layout = {
            x,
            y,
            width,
            height,
            padding,
            margin,
            border,
        }

        // Compute z-index: 'auto' or undefined → 0, numeric value → number
        const zIndexValue = layoutProps.zIndex
        node.zIndex = typeof zIndexValue === 'number' ? zIndexValue : 0

        // Compute children layout
        if (node.children.length > 0) {
            // Calculate content area (inside padding and border)
            const borderOffset = border.width > 0 ? 1 : 0
            const contentX = x + padding.left + borderOffset
            const contentY = y + padding.top + borderOffset
            const contentWidth = width - padding.left - padding.right - borderOffset * 2
            const contentHeight = height - padding.top - padding.bottom - borderOffset * 2

            // Check if this is a flex container
            if (isFlexContainer(layoutProps)) {
                // Compute layout for all children first (hidden ones get zero-size layout)
                const flexConfig = getFlexConfig(layoutProps)
                const childFlexDir =
                    flexConfig.flexDirection === "column" ||
                    flexConfig.flexDirection === "column-reverse"
                        ? "column"
                        : "row"
                for (const child of node.children) {
                    this.computeNodeLayout(
                        child,
                        contentWidth,
                        contentHeight,
                        contentX,
                        contentY,
                        childFlexDir
                    )
                }

                // Capture pre-flex absolute positions AND sizes so we can detect
                // which children had their dimensions changed by flex (e.g. stretch).
                // computeFlexLayout overwrites child x/y with content-area-relative offsets,
                // so grandchildren (already laid out with the old absolute positions) need
                // to be shifted by the same delta.
                // Store in object with numeric indices for O(1) access instead of allocating array of objects
                const preFlex: Record<number, { x: number; y: number; width: number; height: number }> = {}
                for (let i = 0; i < node.children.length; i++) {
                    const c = node.children[i]!
                    preFlex[i] = {
                        x: c.layout?.x ?? 0,
                        y: c.layout?.y ?? 0,
                        width: c.layout?.width ?? 0,
                        height: c.layout?.height ?? 0,
                    }
                }

                // Apply flexbox positioning only to visible, in-flow children.
                // Absolutely positioned children are taken out of the normal flow
                // (CSS spec) and scrollable containers must NOT shrink children.
                // Build flexChildren array inline instead of using filter() to avoid allocation
                const flexChildren: LayoutNode[] = []
                for (const c of node.children) {
                    if (c.layoutProps.display !== "none" && c.layoutProps.position !== "absolute" && !c.props._isComment) {
                        flexChildren.push(c)
                    }
                }

                // Auto-expand flex container height BEFORE calling computeFlexLayout.
                // This must happen early so that flex-shrink operates on the correct
                // (expanded) container size rather than crushing all children to 0.
                // Mirrors block-layout auto-expansion so flex containers without an
                // explicit height grow to wrap their children, like a real browser.
                let flexContentHeight = contentHeight
                if (height === 0 && flexChildren.length > 0 && !isScrollableNode(node)) {
                    const isRowContainer = childFlexDir === "row"
                    const effectiveGap = isRowContainer
                        ? (flexConfig.columnGap ?? flexConfig.gap)
                        : (flexConfig.rowGap ?? flexConfig.gap)

                    let autoHeight = 0
                    if (isRowContainer) {
                        // Row direction: cross-axis is height → tallest child's natural height
                        for (const child of flexChildren) {
                            if (child.layout) autoHeight = Math.max(autoHeight, child.layout.height)
                        }
                    } else {
                        // Column direction: main-axis is height → sum of natural heights + gaps
                        for (const child of flexChildren) {
                            if (child.layout) autoHeight += child.layout.height
                        }
                        autoHeight += effectiveGap * Math.max(0, flexChildren.length - 1)
                    }
                    autoHeight += padding.top + padding.bottom + borderOffset * 2
                    if (layoutProps.maxHeight !== undefined && autoHeight > layoutProps.maxHeight) {
                        autoHeight = layoutProps.maxHeight
                    }
                    node.layout.height = autoHeight
                    flexContentHeight = autoHeight - padding.top - padding.bottom - borderOffset * 2
                }

                const allowShrink = !isScrollableNode(node)
                computeFlexLayout(
                    node,
                    flexChildren,
                    flexConfig,
                    contentWidth,
                    flexContentHeight,
                    allowShrink
                )

                // Adjust positions to absolute coordinates and propagate any position
                // delta to the child's entire subtree so grandchildren stay in sync.
                // Absolutely positioned children keep their positions from computeNodeLayout.
                for (let i = 0; i < node.children.length; i++) {
                    const child = node.children[i]!
                    if (
                        child.layout &&
                        child.layoutProps.display !== "none" &&
                        child.layoutProps.position !== "absolute" &&
                        !child.props._isComment
                    ) {
                        child.layout.x += contentX
                        child.layout.y += contentY
                        const deltaX = child.layout.x - (preFlex[i]?.x ?? 0)
                        const deltaY = child.layout.y - (preFlex[i]?.y ?? 0)
                        if (deltaX !== 0 || deltaY !== 0) {
                            this.shiftSubtree(child, deltaX, deltaY)
                        }
                        // If flex changed this child's dimensions (e.g. stretch expanded width/height),
                        // its own children were computed with the old (wrong) size. Re-run their layout
                        // now that the final dimensions are known.
                        const widthChanged = child.layout.width !== preFlex[i]!.width
                        const heightChanged = child.layout.height !== preFlex[i]!.height
                        if ((widthChanged || heightChanged) && child.children.length > 0) {
                            this.relayoutSubtreeChildren(child)
                        }
                    }
                }
            } else {
                // Block layout - stack children vertically.
                // Absolutely positioned children are out-of-flow and must not advance currentY.
                let currentY = contentY
                for (const child of node.children) {
                    const isAbsolute = child.layoutProps.position === "absolute"
                    // Absolute children are positioned from the container's content origin
                    const childParentY = isAbsolute ? contentY : currentY
                    this.computeNodeLayout(
                        child,
                        contentWidth,
                        contentHeight,
                        contentX,
                        childParentY,
                        undefined
                    )
                    if (child.layout && !isAbsolute) {
                        // display: none children contribute zero height
                        currentY += child.layout.height + child.layout.margin.bottom
                    }
                }

                // If parent container's height was auto (0), update it to fit all children.
                // Scrollable nodes are exempt — they must keep a fixed viewport height.
                if (height === 0 && node.children.length > 0 && !isScrollableNode(node)) {
                    const totalChildrenHeight = currentY - contentY
                    let expandedHeight =
                        totalChildrenHeight + padding.top + padding.bottom + borderOffset * 2
                    // Reapply maxHeight — applyConstraints ran before children, so it missed auto-expansion
                    if (
                        layoutProps.maxHeight !== undefined &&
                        expandedHeight > layoutProps.maxHeight
                    ) {
                        expandedHeight = layoutProps.maxHeight
                    }
                    node.layout.height = expandedHeight
                }

                // If parent container's width was auto (0), expand to fit widest child.
                // This enables content-sized flex items: a div in a flex-row starts at
                // width=0, computes children, then expands to their intrinsic width.
                if (width === 0 && layoutProps.width === undefined && node.children.length > 0) {
                    let maxChildWidth = 0
                    for (const child of node.children) {
                        if (child.layout && child.layoutProps.display !== "none") {
                            maxChildWidth = Math.max(maxChildWidth, child.layout.width)
                        }
                    }
                    if (maxChildWidth > 0) {
                        node.layout.width =
                            maxChildWidth + padding.left + padding.right + borderOffset * 2
                    }
                }
            }

            // Calculate content height for scrollable nodes
            if (isScrollableNode(node) && node.children.length > 0) {
                let maxChildBottom = 0
                for (const child of node.children) {
                    if (child.layout && child.layoutProps.display !== "none") {
                        const childBottom =
                            child.layout.y -
                            contentY +
                            child.layout.height +
                            child.layout.margin.bottom
                        maxChildBottom = Math.max(maxChildBottom, childBottom)
                    }
                }
                node.contentHeight = maxChildBottom
            }
        }
    }
}

/**
 * Helper: Create a layout engine with default config
 */
export function createLayoutEngine(
    containerWidth: number = 100,
    containerHeight: number = 100
): LayoutEngine {
    return new LayoutEngine({
        containerWidth,
        containerHeight,
        defaultDisplay: "block",
        defaultFlexDirection: "row",
    })
}
