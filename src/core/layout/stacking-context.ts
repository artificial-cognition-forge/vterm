/**
 * Stacking Context System
 *
 * Implements CSS stacking context hierarchy for proper z-index rendering.
 *
 * A stacking context is created by:
 * 1. Root element (html)
 * 2. Positioned element (position: absolute|relative|fixed|sticky) with explicit z-index
 * 3. Element with opacity < 1
 *
 * Within a stacking context, children are rendered in CSS stacking order:
 * 1. Negative z-index (back to front)
 * 2. Auto z-index (document order)
 * 3. Positive z-index (front to back)
 * 4. Text/content layer (on top)
 */

import type { LayoutNode } from "./types"

/**
 * Represents a single stacking context in the hierarchy
 *
 * A stacking context is a tree node that contains:
 * - The node that created this context (root)
 * - Direct descendants grouped by z-index level
 * - Nested stacking contexts (created by child nodes)
 * - Computed render order for painting
 */
export interface StackingContext {
  // The node that created this stacking context
  root: LayoutNode

  // Parent stacking context (null for root context)
  parent: StackingContext | null

  // Direct descendants grouped by z-index value
  // Keys: negative numbers, 'auto', positive numbers, 'nested', 'root-background'
  // 'nested' = nodes that create their own stacking contexts
  // 'root-background' = the stacking context root's own background/border
  childrenByZIndex: Map<number | "auto" | "nested" | "root-background", LayoutNode[]>

  // Nested stacking contexts created by children
  // These are rendered in order (respecting their root's z-index)
  nestedContexts: StackingContext[]

  // Computed rendering order (back to front)
  renderOrder: StackingContextLayer[]
}

/**
 * A layer in the stacking context's render order
 * Describes a group of nodes to paint in one pass
 */
export interface StackingContextLayer {
  // Layer type
  type: "negative-z" | "auto" | "positive-z"

  // z-index value (or 'auto')
  zIndex: number | "auto"

  // Nodes to render in this layer (excluding nested contexts)
  nodes: LayoutNode[]

  // Rendering pass this layer belongs to
  // 'background' = paint backgrounds and borders
  // 'text' = paint text content and overlays
  pass: "background" | "text"
}

/**
 * Detects if a node creates a stacking context
 *
 * CSS rules for stacking context creation:
 * - Root element (html)
 * - Positioned element with explicit z-index (not auto)
 * - Element with opacity < 1
 */
export function detectStackingContext(node: LayoutNode): boolean {
  // Root always creates stacking context
  if (node.parent === null) return true

  // Positioned element with explicit z-index (not 'auto')
  if (
    node.layoutProps.position &&
    typeof node.layoutProps.zIndex === "number"
  ) {
    return true
  }

  // Element with opacity < 1 (creates stacking context)
  if (node.style.opacity !== undefined && node.style.opacity < 1) {
    return true
  }

  return false
}

/**
 * Build stacking context tree from LayoutNode tree
 *
 * Must be called after layout engine computes positions (layout.x, layout.y, etc.)
 *
 * Returns the root stacking context containing the entire tree.
 *
 * The root of each stacking context (the node that created it) is rendered
 * as the first layer in its own stacking context (its background and border).
 */
export function buildStackingContextTree(root: LayoutNode): StackingContext {
  const context: StackingContext = {
    root,
    parent: null,
    childrenByZIndex: new Map(),
    nestedContexts: [],
    renderOrder: [],
  }

  // Mark the root as creating a stacking context (all roots create stacking contexts)
  root.createsStackingContext = true

  // Add the root node itself as the first layer (its background and border)
  // This represents the root stacking context's background/border layer
  context.childrenByZIndex.set("root-background", [root])

  // Recursively categorize children
  for (const child of root.children) {
    if (detectStackingContext(child)) {
      // Child creates a new stacking context
      const nestedContext = buildStackingContextTree(child)
      nestedContext.parent = context
      context.nestedContexts.push(nestedContext)

      // Also track the child node itself in 'nested' category
      if (!context.childrenByZIndex.has("nested")) {
        context.childrenByZIndex.set("nested", [])
      }
      context.childrenByZIndex.get("nested")!.push(child)

      // Mark it as creating a context
      child.createsStackingContext = true
    } else {
      // Child belongs to this context, group by z-index
      const zKey = child.layoutProps.zIndex ?? "auto"
      if (!context.childrenByZIndex.has(zKey)) {
        context.childrenByZIndex.set(zKey, [])
      }
      context.childrenByZIndex.get(zKey)!.push(child)
    }
  }

  // Compute rendering order
  context.renderOrder = computeRenderOrder(context)

  return context
}

/**
 * Compute the rendering order for a stacking context
 *
 * CSS stacking order (§E.2):
 * 1. Negative z-index descendants (background pass, back to front)
 * 2. Auto z-index descendants (background pass, document order)
 * 3. Positive z-index descendants (background pass, front to back)
 * 4. Text layer (text pass, all content)
 *
 * We simplify to: negative → auto → nested (with their own z-index) → positive → text
 */
function computeRenderOrder(context: StackingContext): StackingContextLayer[] {
  const order: StackingContextLayer[] = []

  // CSS Stacking Order (merged, with auto z-index treated as 0):
  // 1. Root background (z = -∞)
  // 2. Negative z-index elements
  // 3. Auto z-index (z = 0) and nested contexts at z=0
  // 4. Positive z-index elements and nested contexts at those z-indices
  // 5. Text content pass

  const getZIndex = (zIdx: number | string | undefined): number => {
    return typeof zIdx === "number" ? zIdx : 0
  }

  // Background pass: root background (stacking context root's background/border)
  if (context.childrenByZIndex.has("root-background")) {
    order.push({
      type: "auto",
      zIndex: -Infinity,
      nodes: context.childrenByZIndex.get("root-background")!,
      pass: "background",
    })
  }

  // Build complete merged render order for all z-indices (negative, zero, positive)
  const allZIndices = new Map<number, { nodes: LayoutNode[], contexts: StackingContext[] }>()

  // Collect all numeric z-indices from regular children
  const zIndices = Array.from(context.childrenByZIndex.keys())
    .filter((z) => typeof z === "number") as number[]

  for (const z of zIndices) {
    if (!allZIndices.has(z)) allZIndices.set(z, { nodes: [], contexts: [] })
    allZIndices.get(z)!.nodes.push(...context.childrenByZIndex.get(z)!)
  }

  // Add auto z-index as z=0
  if (context.childrenByZIndex.has("auto")) {
    if (!allZIndices.has(0)) allZIndices.set(0, { nodes: [], contexts: [] })
    allZIndices.get(0)!.nodes.push(...context.childrenByZIndex.get("auto")!)
  }

  // Add all nested context z-indices
  for (const nestedContext of context.nestedContexts) {
    const zIdx = getZIndex(nestedContext.root.layoutProps.zIndex)
    if (!allZIndices.has(zIdx)) allZIndices.set(zIdx, { nodes: [], contexts: [] })
    allZIndices.get(zIdx)!.contexts.push(nestedContext)
  }

  // Render in sorted z-index order (negative → zero → positive)
  const sortedZIndices = Array.from(allZIndices.keys()).sort((a, b) => a - b)

  for (const z of sortedZIndices) {
    const { nodes, contexts } = allZIndices.get(z)!

    // Render regular nodes at this z-index
    if (nodes.length > 0) {
      order.push({
        type: z < 0 ? "negative-z" : z === 0 ? "auto" : "positive-z",
        zIndex: z === 0 ? "auto" : z,
        nodes: nodes,
        pass: "background",
      })
    }

    // Render nested contexts at this z-index
    for (const nestedContext of contexts) {
      order.push({
        type: z < 0 ? "negative-z" : "positive-z",
        zIndex: z,
        nodes: [], // Nested contexts render themselves recursively
        pass: "background",
      })
    }
  }

  // Text pass: all text content (on top of all backgrounds)
  // NOTE: renderStackingContextPass iterates this layer in text pass and renders all nodes' text
  order.push({
    type: "auto",
    zIndex: "auto",
    nodes: [],
    pass: "text",
  })

  return order
}
