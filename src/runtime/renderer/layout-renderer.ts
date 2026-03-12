/**
 * Layout Renderer - Vue Custom Renderer that outputs LayoutNodes
 *
 * This renderer creates a platform-agnostic layout tree from Vue VNodes.
 * The layout tree is then passed to the BufferRenderer for terminal output.
 *
 * Flow:
 * 1. Vue reactivity triggers renderer operations (createElement, patchProp, insert, etc.)
 * 2. Renderer builds/updates LayoutNode tree
 * 3. On each update, we notify the callback with the root LayoutNode
 * 4. Callback computes layout and renders via BlessedAdapter
 */

import { createRenderer, type VNode } from "vue"
import type { LayoutNode, LayoutProperties, VisualStyle } from "../../core/layout/types"
import type { ParsedStyles } from "../../core/css/types"
import { getCurrentScopeId } from "../../core/compiler/sfc-loader"
import { decodeScopedKey } from "../../core/css/transformer"
import { transformDeclaration } from "../../core/css/declaration-transformer"

/**
 * Convert camelCase to kebab-case for CSS property names
 */
function camelToKebab(str: string): string {
    return str.replace(/[A-Z]/g, c => `-${c.toLowerCase()}`)
}

/**
 * Apply style object properties to layout properties and visual styles
 */
function applyStyleObject(
    styleObj: Record<string, any>,
    layoutProps: LayoutProperties,
    visualStyle: VisualStyle
): void {
    for (const [key, val] of Object.entries(styleObj)) {
        if (val === null || val === undefined) continue
        const cssProp = camelToKebab(key)
        transformDeclaration(cssProp, String(val), layoutProps)
    }
    // Copy visualStyles from layoutProps to visualStyle
    if (layoutProps.visualStyles) {
        Object.assign(visualStyle, layoutProps.visualStyles)
        delete layoutProps.visualStyles
    }
}

/**
 * UA (user-agent) default styles — applied before user CSS, lowest priority.
 * These give form elements a visible default appearance so they work without
 * any user-authored CSS, matching baseline HTML behavior in browsers.
 */
const UA_LAYOUT_PROPS: Record<string, Partial<LayoutProperties>> = {
    input:    { border: { width: 0 } },
    textarea: { border: { width: 0 } },
    editor:   { border: { width: 0 }, scrollable: true, scrollableY: true, alwaysScroll: true } as any,
    button:   { border: { width: 0 } },
    select:   { border: { width: 0 } },
}

/**
 * Counter for generating unique node IDs
 */
let nodeIdCounter = 0

/**
 * Create a layout node from element type and props
 */
export function createLayoutNodeElement(type: string, styles: ParsedStyles = {}): LayoutNode {
    const scopeId = getCurrentScopeId() ?? undefined

    // Apply UA defaults first, then user CSS overrides
    const uaDefaults = UA_LAYOUT_PROPS[type]
    const { layoutProps: cssLayoutProps, visualStyle } = resolveNodeStyles(type, [], styles, scopeId)
    const layoutProps: LayoutProperties = uaDefaults
        ? { ...uaDefaults, ...cssLayoutProps }
        : cssLayoutProps

    const node: LayoutNode = {
        id: `node-${nodeIdCounter++}`,
        type,
        layoutProps,
        props: {},
        content: null,
        style: {},
        events: new Map(),
        children: [],
        parent: null,
        layout: null,
        scrollX: 0,
        scrollY: 0,
        _scopeId: scopeId,
    }

    Object.assign(node.style, visualStyle)

    return node
}

/**
 * Create a text layout node
 */
function createLayoutNodeText(text: string): LayoutNode {
    return {
        id: `text-${nodeIdCounter++}`,
        type: "text",
        layoutProps: {},
        props: {},
        content: text,
        style: {},
        events: new Map(),
        children: [],
        parent: null,
        layout: null,
        scrollX: 0,
        scrollY: 0,
    }
}

/**
 * Create a comment layout node (no-op in terminal)
 */
function createLayoutNodeComment(): LayoutNode {
    return {
        id: `comment-${nodeIdCounter++}`,
        type: "box",
        layoutProps: {},
        props: { _isComment: true },
        content: null,
        style: {},
        events: new Map(),
        children: [],
        parent: null,
        layout: null,
        scrollX: 0,
        scrollY: 0,
    }
}

/**
 * Apply a single LayoutProperties block onto the working layoutProps / visualStyle.
 */
function applyStyleBlock(
    source: LayoutProperties,
    layoutProps: LayoutProperties,
    visualStyle: VisualStyle
): { layoutProps: LayoutProperties; visualStyle: VisualStyle } {
    const { visualStyles, hover, focus, active, ...otherProps } = source
    const merged: LayoutProperties = { ...layoutProps, ...otherProps }
    const mergedVisual: VisualStyle = visualStyles
        ? { ...visualStyle, ...visualStyles }
        : { ...visualStyle }

    if (hover) {
        const hoverVisual = (hover as any).visualStyles || hover
        mergedVisual.hover = { ...(mergedVisual.hover || {}), ...hoverVisual }
    }
    if (focus) {
        const focusVisual = (focus as any).visualStyles || focus
        mergedVisual.focus = { ...(mergedVisual.focus || {}), ...focusVisual }
    }
    if (active) {
        const activeVisual = (active as any).visualStyles || active
        mergedVisual.active = { ...(mergedVisual.active || {}), ...activeVisual }
    }

    return { layoutProps: merged, visualStyle: mergedVisual }
}

/**
 * Resolve styles for a node based on type, class names, and optional scope ID.
 *
 * Resolution order (later entries win):
 *   1. Global element-type styles  (e.g. `button { }`)
 *   2. Scoped element-type styles  (e.g. `button { }` from owning component)
 *   3. Global class styles         (e.g. `.btn { }`)
 *   4. Scoped class styles         (e.g. `.btn { }` from owning component)
 */
function resolveNodeStyles(
    nodeType: string,
    classNames: string[],
    styles: ParsedStyles,
    scopeId?: string
): { layoutProps: LayoutProperties; visualStyle: VisualStyle } {
    let layoutProps: LayoutProperties = {}
    let visualStyle: VisualStyle = {}

    // 1. Global element-type styles
    const typeStyle = styles[nodeType]
    if (typeStyle) {
        ;({ layoutProps, visualStyle } = applyStyleBlock(typeStyle, layoutProps, visualStyle))
    }

    // 2. Scoped element-type styles (only if this node belongs to a scoped component)
    if (scopeId) {
        const scopedTypeStyle = styles[`${scopeId}\x00${nodeType}`]
        if (scopedTypeStyle) {
            ;({ layoutProps, visualStyle } = applyStyleBlock(scopedTypeStyle, layoutProps, visualStyle))
        }
    }

    // 3 & 4. Class-based styles (global then scoped)
    for (const className of classNames) {
        // Global class
        const classStyle = styles[`.${className}`]
        if (classStyle) {
            ;({ layoutProps, visualStyle } = applyStyleBlock(classStyle, layoutProps, visualStyle))
        }

        // Scoped class (only for nodes that carry a scope ID)
        if (scopeId) {
            const scopedClassStyle = styles[`${scopeId}\x00.${className}`]
            if (scopedClassStyle) {
                ;({ layoutProps, visualStyle } = applyStyleBlock(scopedClassStyle, layoutProps, visualStyle))
            }
        }
    }

    return { layoutProps, visualStyle }
}

/**
 * Apply inline props to layout properties and visual styles
 */
function applyInlineProps(
    node: LayoutNode,
    layoutProps: LayoutProperties,
    visualStyle: VisualStyle
): void {
    const { props } = node

    // Layout properties from inline props
    if (props.width !== undefined) layoutProps.width = props.width
    if (props.height !== undefined) layoutProps.height = props.height
    if (props.top !== undefined) layoutProps.top = props.top
    if (props.left !== undefined) layoutProps.left = props.left
    if (props.right !== undefined) layoutProps.right = props.right
    if (props.bottom !== undefined) layoutProps.bottom = props.bottom
    if (props.padding !== undefined) layoutProps.padding = props.padding
    if (props.margin !== undefined) layoutProps.margin = props.margin
    if (props.position !== undefined) layoutProps.position = props.position

    // Visual styles from inline props
    if (props.fg) visualStyle.fg = props.fg
    if (props.bg) visualStyle.bg = props.bg
    if (props.bold !== undefined) visualStyle.bold = props.bold
    if (props.underline !== undefined) visualStyle.underline = props.underline
    if (props.blink !== undefined) visualStyle.blink = props.blink
    if (props.inverse !== undefined) visualStyle.inverse = props.inverse
    if (props.invisible !== undefined) visualStyle.invisible = props.invisible
    if (props.transparent !== undefined) visualStyle.transparent = props.transparent

    // Border
    if (props.border) {
        if (!layoutProps.border) layoutProps.border = { width: 0 }
        if (typeof props.border === "object") {
            Object.assign(layoutProps.border, props.border)
        }
    }

    // Store layout props on node for later use by layout engine
    node.layoutProps = layoutProps

    // Apply visual styles to node
    Object.assign(node.style, visualStyle)
}

/**
 * Create a Vue renderer that outputs layout nodes
 */
export function createLayoutRenderer(
    styles: ParsedStyles = {},
    onUpdate?: (root: LayoutNode | null) => void
) {
    // Track the root container element
    let rootContainer: LayoutNode | null = null

    // Helper to trigger updates
    const notifyUpdate = () => {
        if (onUpdate && rootContainer) {
            onUpdate(rootContainer)
        }
    }

    const renderer = createRenderer<LayoutNode, LayoutNode>({
        createElement(type: string) {
            return createLayoutNodeElement(type, styles)
        },

        insert(child, parent, anchor) {
            if (!parent) return

            // Track root container
            if (!rootContainer) {
                rootContainer = parent
            }

            // Remove child from current parent if it has one
            if (child.parent && child.parent !== parent) {
                const idx = child.parent.children.indexOf(child)
                if (idx !== -1) {
                    child.parent.children.splice(idx, 1)
                }
            }

            // Insert child into parent
            if (anchor) {
                const anchorIndex = parent.children.indexOf(anchor)
                if (anchorIndex !== -1) {
                    parent.children.splice(anchorIndex, 0, child)
                } else {
                    parent.children.push(child)
                }
            } else {
                parent.children.push(child)
            }

            child.parent = parent

            // Notify that tree structure changed
            notifyUpdate()
        },

        remove(child) {
            if (child.parent) {
                const idx = child.parent.children.indexOf(child)
                if (idx !== -1) {
                    child.parent.children.splice(idx, 1)
                }
                child.parent = null
            }

            // Notify that tree structure changed
            notifyUpdate()
        },

        setElementText(node, text) {
            // Set text content on the node
            node.content = text
            node._originalContent = undefined
            notifyUpdate()
        },

        patchProp(node, key, prevValue, nextValue) {
            // Handle event listeners
            if (key.startsWith("on")) {
                const eventName = key.slice(2).toLowerCase()
                if (nextValue) {
                    node.events.set(eventName, nextValue)
                } else {
                    node.events.delete(eventName)
                }
                return
            }

            // Handle class attribute - resolve styles
            if (key === "class") {
                const classNames = Array.isArray(nextValue)
                    ? nextValue
                    : String(nextValue || "")
                          .split(" ")
                          .filter(Boolean)

                const uaDefaults = UA_LAYOUT_PROPS[node.type]
                const { layoutProps: cssLayoutProps, visualStyle } = resolveNodeStyles(
                    node.type,
                    classNames,
                    styles,
                    node._scopeId
                )
                const layoutProps: LayoutProperties = uaDefaults
                    ? { ...uaDefaults, ...cssLayoutProps }
                    : cssLayoutProps

                // Apply to node
                node.layoutProps = layoutProps
                Object.assign(node.style, visualStyle)

                // Store class on props for later reference
                node.props.class = classNames
                return
            }

            // Handle style attribute - apply inline CSS styles
            if (key === "style") {
                const uaDefaults = UA_LAYOUT_PROPS[node.type]
                const { layoutProps: cssLayoutProps, visualStyle } = resolveNodeStyles(
                    node.type,
                    node.props.class ?? [],
                    styles,
                    node._scopeId
                )
                const layoutProps: LayoutProperties = uaDefaults
                    ? { ...uaDefaults, ...cssLayoutProps }
                    : cssLayoutProps

                const styleObjs = Array.isArray(nextValue) ? nextValue : [nextValue]
                for (const styleObj of styleObjs) {
                    if (styleObj && typeof styleObj === 'object') {
                        applyStyleObject(styleObj, layoutProps, visualStyle)
                    }
                }

                node.layoutProps = { ...node.layoutProps, ...layoutProps }
                Object.assign(node.style, visualStyle)
                node.props.style = nextValue
                notifyUpdate()
                return
            }

            // Handle content attribute
            if (key === "content") {
                node.content =
                    nextValue !== null && nextValue !== undefined ? String(nextValue) : null
                node._originalContent = undefined
                return
            }

            // Sync value/modelValue prop to internal input state
            if (
                (key === "value" || key === "modelValue") &&
                (node.type === "input" || node.type === "textarea")
            ) {
                const strVal = String(nextValue ?? "")
                node._inputValue = strVal
                if (node._cursorPos === undefined) {
                    node._cursorPos = strVal.length
                }
            }

            // Store all other props
            if (nextValue !== null && nextValue !== undefined) {
                node.props[key] = nextValue

                // If this is a layout property, update layoutProps
                const layoutProps: LayoutProperties = { ...node.layoutProps }
                const visualStyle: VisualStyle = { ...node.style }

                applyInlineProps(node, layoutProps, visualStyle)
            } else {
                delete node.props[key]
            }

            // Notify update for property changes
            notifyUpdate()
        },

        createText(text) {
            return createLayoutNodeText(text)
        },

        createComment() {
            return createLayoutNodeComment()
        },

        setText(node, text) {
            node.content = text
            node._originalContent = undefined
            notifyUpdate()
        },

        parentNode(node) {
            return node.parent
        },

        nextSibling(node: LayoutNode): LayoutNode | null {
            if (!node.parent) return null
            const siblings = node.parent.children
            const idx = siblings.indexOf(node)
            if (idx === -1 || idx === siblings.length - 1) return null
            return siblings[idx + 1] || null
        },

        // Support for inserting static content (used by _createStaticVNode)
        insertStaticContent(
            content: string,
            parent: LayoutNode | null,
            _anchor: LayoutNode | null,
            _namespace: string | undefined
        ): [LayoutNode, LayoutNode] {
            // For terminal rendering, we treat static content as regular text nodes
            const textNode = createLayoutNodeText(content)

            if (parent) {
                parent.children.push(textNode)
                textNode.parent = parent
            }

            // Return [element, anchor] for Vue runtime
            // The anchor is used for tracking where to insert next elements
            return [textNode, textNode]
        },
    })

    return renderer
}

/**
 * Apply compound (descendant) selector styles to the assembled layout tree.
 *
 * `patchProp` runs before a node is inserted, so it has no ancestor context and
 * cannot match selectors like `.parent .child`. This function does a top-down
 * walk after the tree is fully assembled, collecting ancestor classes and
 * applying any matching compound selectors. Call it once per frame just before
 * layout computation.
 */
export function applyCompoundStyles(root: LayoutNode, styles: ParsedStyles): void {
    // Build an index: last-class → [{parts, style, scopeId?}] for compound selectors.
    // Keys in `styles` may be plain selectors (".parent .child") or scoped ones
    // encoded as "${scopeId}\x00.parent .child". We decode and index both.
    const index = new Map<string, Array<{ parts: string[]; style: LayoutProperties; scopeId?: string }>>()
    for (const [key, style] of Object.entries(styles)) {
        const decoded = decodeScopedKey(key)
        const selector = decoded ? decoded.selector : key
        const scopeId = decoded ? decoded.scopeId : undefined

        if (!selector.includes(" ")) continue

        const parts = selector.split(/\s+/)
        const lastPart = parts[parts.length - 1]!
        const className = lastPart.startsWith(".") ? lastPart.slice(1) : lastPart
        if (!index.has(className)) index.set(className, [])
        index.get(className)!.push({ parts, style, scopeId })
    }
    if (index.size === 0) return

    function walk(node: LayoutNode, ancestorClasses: string[]): void {
        const classNames: string[] = node.props.class
            ? Array.isArray(node.props.class)
                ? node.props.class
                : String(node.props.class).split(" ").filter(Boolean)
            : []

        for (const className of classNames) {
            const candidates = index.get(className)
            if (!candidates) continue
            for (const { parts, style, scopeId } of candidates) {
                // Scoped rule: only apply if this node's scope matches
                if (scopeId && node._scopeId !== scopeId) continue

                const precedingParts = parts.slice(0, -1)
                const allMatch = precedingParts.every(part => {
                    const partClass = part.startsWith(".") ? part.slice(1) : part
                    return ancestorClasses.includes(partClass)
                })
                if (!allMatch) continue
                const { visualStyles, hover, focus, active, ...otherProps } = style as any
                Object.assign(node.layoutProps, otherProps)
                if (visualStyles) Object.assign(node.style, visualStyles)
                if (hover) node.style.hover = { ...(node.style.hover || {}), ...(hover.visualStyles || hover) }
                if (focus) node.style.focus = { ...(node.style.focus || {}), ...(focus.visualStyles || focus) }
                if (active) node.style.active = { ...(node.style.active || {}), ...(active.visualStyles || active) }
            }
        }

        const childAncestors = classNames.length > 0 ? [...ancestorClasses, ...classNames] : ancestorClasses
        for (const child of node.children) {
            walk(child, childAncestors)
        }
    }

    walk(root, [])
}
