# Z-Index Stacking Contexts: Full CSS Parity Change Delta

## Executive Summary

Current vterm z-index handling is **flat**: siblings are sorted by z-index within their parent, but there's no concept of **stacking contexts**. This means CSS like `z-index: 9999` on a child still renders behind a sibling with `z-index: 2`, violating fundamental CSS stacking rules.

This delta redesigns the rendering pipeline for **full CSS z-index parity** with proper stacking contexts, two-pass rendering (backgrounds → text), and comprehensive edge case handling.

**Scope**: This is an "all or nothing" refactor affecting:
- Type system (LayoutNode augmentation)
- Stacking context detection and tree building
- Rendering algorithm (complete rewrite of renderNode)
- Test coverage (new comprehensive test suite)

---

## CSS Z-Index Specification (What We're Implementing)

### Stacking Context Creation Rules

A stacking context is created by:
1. Root element (`<html>`)
2. Positioned element (`position: absolute|relative|fixed|sticky`) with explicit `z-index` (not auto)
3. Element with `opacity < 1`
4. Element with `transform`, `filter`, `backdrop-filter` (not applicable to terminal)
5. Element with `mix-blend-mode` (not applicable to terminal)

**For terminal MVP, we support**:
- Root element (always creates stacking context)
- Positioned elements with explicit z-index
- Future: opacity < 1

### Stacking Order (CSS Spec §E.2)

Within a stacking context, elements are painted in this order:

1. **Background & borders of stacking context root** (z-index < 0)
2. **Descendants with negative z-index** (sorted: -∞ to -1)
3. **In-flow, non-positioned block descendants** (z-index: auto, document order)
4. **In-flow, floated descendants** (z-index: auto, left-to-right)
5. **In-flow, non-positioned inline/inline-block descendants** (z-index: auto, document order)
6. **Positioned descendants with z-index: auto** (document order)
7. **Descendants with positive z-index** (sorted: 0 to +∞)
8. **Text/content of this context**

**For terminal MVP, we simplify to**:

1. Background of stacking context root
2. Negative z-index descendants (sorted ascending)
3. Auto z-index descendants (document order)
4. Positive z-index descendants (sorted ascending)
5. Text/content overlay

---

## Architecture: Stacking Context Tree

### Current Pipeline (Flat)
```
LayoutNode tree (computed positions)
  → renderNode() sorts siblings by z-index
  → single-pass rendering (backgrounds + text + children)
  → ScreenBuffer
```

### New Pipeline (Hierarchical)
```
LayoutNode tree (computed positions)
  → detectStackingContexts() builds StackingContextTree
  → buildStackingContextTree() hierarchy
  → renderStackingContextTree() two-pass rendering
      Pass 1: Paint all backgrounds (respecting stacking order)
      Pass 2: Paint all text (respecting stacking order)
  → ScreenBuffer
```

---

## Phase 1: Type System Updates

### New Types: `src/core/layout/stacking-context.ts`

```typescript
/**
 * Represents a single stacking context
 */
export interface StackingContext {
  // The node that created this stacking context
  root: LayoutNode

  // Direct descendants of this context (not including nested contexts)
  // Grouped by z-index level for rendering order
  childrenByZIndex: Map<number | 'auto' | 'negative', LayoutNode[]>

  // Nested stacking contexts created by children
  nestedContexts: StackingContext[]

  // Computed stacking order for rendering
  renderOrder: StackingContextLayer[]
}

export interface StackingContextLayer {
  type: 'negative-z' | 'auto' | 'positive-z' | 'text'
  zIndex: number | 'auto'
  nodes: LayoutNode[]
  layer: 'background' | 'text'
}
```

### Augment LayoutNode: `src/core/layout/types.ts`

```typescript
export interface LayoutNode {
  // ... existing fields ...

  // NEW: Stacking context information
  createsStackingContext: boolean      // Does this node create a new stacking context?
  parentStackingContext: StackingContext | null  // Which stacking context contains this node
  stackingContextRoot: LayoutNode | null  // If this node creates a context, reference to self
}
```

---

## Phase 2: Stacking Context Detection

### New File: `src/core/layout/stacking-context-detector.ts`

```typescript
/**
 * Detects which nodes create stacking contexts and builds the hierarchy
 */
export function detectStackingContext(node: LayoutNode): boolean {
  // Root always creates stacking context
  if (node.parent === null) return true

  // Positioned element with explicit z-index
  if (node.layoutProps.position &&
      node.layoutProps.position !== 'static' &&
      node.layoutProps.zIndex !== 'auto') {
    return true
  }

  // opacity < 1 (future)
  if (node.style.opacity !== undefined && node.style.opacity < 1) {
    return true
  }

  return false
}

/**
 * Build stacking context tree from LayoutNode tree
 * Must be called after layout engine computes positions
 */
export function buildStackingContextTree(root: LayoutNode): StackingContext {
  const context: StackingContext = {
    root,
    childrenByZIndex: new Map(),
    nestedContexts: [],
    renderOrder: [],
  }

  // Recursively process children
  for (const child of root.children) {
    if (detectStackingContext(child)) {
      // Child creates new stacking context
      const nestedContext = buildStackingContextTree(child)
      context.nestedContexts.push(nestedContext)
      child.createsStackingContext = true
    } else {
      // Child belongs to this context
      const zKey = child.layoutProps.zIndex ?? 'auto'
      if (!context.childrenByZIndex.has(zKey)) {
        context.childrenByZIndex.set(zKey, [])
      }
      context.childrenByZIndex.get(zKey)!.push(child)
    }
  }

  // Compute render order
  context.renderOrder = computeRenderOrder(context)

  return context
}

function computeRenderOrder(context: StackingContext): StackingContextLayer[] {
  const order: StackingContextLayer[] = []

  // Collect all z-index values and sort
  const zIndices = Array.from(context.childrenByZIndex.keys())
  const negativeZ: number[] = []
  const positiveZ: number[] = []

  for (const z of zIndices) {
    if (typeof z === 'number' && z < 0) negativeZ.push(z)
    if (typeof z === 'number' && z > 0) positiveZ.push(z)
  }

  negativeZ.sort((a, b) => a - b)  // -∞ to -1
  positiveZ.sort((a, b) => a - b)  // 0 to +∞

  // 1. Background pass: negative z-index (back to front)
  for (const z of negativeZ) {
    order.push({
      type: 'negative-z',
      zIndex: z,
      nodes: context.childrenByZIndex.get(z)!,
      layer: 'background',
    })
  }

  // 2. Auto z-index (document order)
  if (context.childrenByZIndex.has('auto')) {
    order.push({
      type: 'auto',
      zIndex: 'auto',
      nodes: context.childrenByZIndex.get('auto')!,
      layer: 'background',
    })
  }

  // 3. Positive z-index (front to back)
  for (const z of positiveZ) {
    order.push({
      type: 'positive-z',
      zIndex: z,
      nodes: context.childrenByZIndex.get(z)!,
      layer: 'background',
    })
  }

  // 4. Text layer (all content on top)
  order.push({
    type: 'text',
    zIndex: 'auto',
    nodes: [],  // Painted separately
    layer: 'text',
  })

  return order
}
```

---

## Phase 3: Two-Pass Rendering Algorithm

### New File: `src/runtime/renderer/rendering-pass.ts`

```typescript
/**
 * Two-pass rendering respecting stacking contexts
 * Pass 1: Backgrounds (below text layer)
 * Pass 2: Text (above backgrounds)
 */
export class RenderingPass {
  private buffer: ScreenBuffer
  private isTextPass: boolean = false

  constructor(buffer: ScreenBuffer) {
    this.buffer = buffer
  }

  /**
   * Execute both rendering passes
   */
  executeRenderingPasses(
    root: LayoutNode,
    context: StackingContext,
    parentScrollY: number = 0,
    clipBox?: ClipBox
  ): void {
    // Pass 1: Render all backgrounds
    this.isTextPass = false
    this.renderStackingContext(context, parentScrollY, clipBox)

    // Pass 2: Render all text
    this.isTextPass = true
    this.renderStackingContext(context, parentScrollY, clipBox)
  }

  private renderStackingContext(
    context: StackingContext,
    parentScrollY: number,
    clipBox?: ClipBox
  ): void {
    // Render in stacking order
    for (const layer of context.renderOrder) {
      if (this.isTextPass && layer.layer !== 'text') continue
      if (!this.isTextPass && layer.layer === 'text') continue

      for (const node of layer.nodes) {
        this.renderNodeInContext(node, context, parentScrollY, clipBox)
      }
    }

    // Render nested stacking contexts (always in order they were created)
    for (const nestedContext of context.nestedContexts) {
      this.renderStackingContext(nestedContext, parentScrollY, clipBox)
    }
  }

  private renderNodeInContext(
    node: LayoutNode,
    parentContext: StackingContext,
    parentScrollY: number,
    clipBox?: ClipBox
  ): void {
    if (!node.layout) return
    if (node.style.invisible || node.layoutProps.display === 'none') return

    const effectiveScrollY = parentScrollY + node.scrollY
    const effectiveStyle = this.getEffectiveStyle(node)

    if (!this.isTextPass) {
      // Pass 1: Render backgrounds only
      if (node.type === 'text') return  // Skip text nodes in background pass
      this.renderBackground(node, effectiveStyle, parentScrollY, clipBox)
      this.renderBorder(node, effectiveStyle, parentScrollY, clipBox)
    } else {
      // Pass 2: Render text only
      if (node.type === 'text') {
        this.renderText(node, effectiveStyle, parentScrollY, clipBox)
      }
      // Render element-specific content (input, textarea, button text)
      this.renderElementContent(node, effectiveStyle, parentScrollY, clipBox)
    }

    // Render children if this node doesn't create a new stacking context
    if (!node.createsStackingContext) {
      const childClipBox = this.computeChildClipBox(node, parentScrollY, clipBox)
      for (const child of node.children) {
        this.renderNodeInContext(child, parentContext, effectiveScrollY, childClipBox)
      }
    }
  }
}
```

---

## Phase 4: BufferRenderer Integration

### Refactor: `src/runtime/renderer/buffer-renderer.ts`

**Old approach** (removed):
```typescript
// ❌ OLD: Single-pass flat z-index sort
private renderNode(node: LayoutNode, buffer: ScreenBuffer, parentScrollY: number): void {
  // Render node background + content
  // Sort children by z-index
  const sortedChildren = node.children.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
  // Render children
}
```

**New approach**:
```typescript
// ✓ NEW: Two-pass hierarchical rendering
render(root: LayoutNode, buffer: ScreenBuffer): void {
  buffer.clear()

  // Build stacking context tree
  const rootContext = buildStackingContextTree(root)

  // Execute two-pass rendering
  const renderPass = new RenderingPass(buffer)
  renderPass.executeRenderingPasses(root, rootContext, 0)

  // Overlay selection on top
  this.selectionManager?.applyHighlight(buffer)
}
```

---

## Phase 5: Test Suite Strategy

### Test Files to Create/Update

```
tests/z-index/
├── stacking-context-detection.test.ts   # detectStackingContext()
├── stacking-context-tree.test.ts        # buildStackingContextTree()
├── render-order.test.ts                 # computeRenderOrder()
├── two-pass-rendering.test.ts           # Background vs text pass ordering
├── negative-z-index.test.ts             # z-index: -1, -999, etc.
├── nested-stacking-contexts.test.ts     # Hierarchical z-index (parent z-index doesn't bound children)
├── text-bleed-through.test.ts           # Higher z-index element text covers lower element text
├── stacking-edge-cases.test.ts          # Complex real-world scenarios
└── css-compliance-z-index.test.ts       # Full CSS compliance
```

### Test Example Pattern

```typescript
// tests/z-index/nested-stacking-contexts.test.ts
import { describe, it, expect } from "bun:test"
import { LayoutNode } from "../../src/core/layout/types"
import { buildStackingContextTree } from "../../src/core/layout/stacking-context-detector"

describe("Nested stacking contexts", () => {
  it("child z-index: 9999 should render above sibling z-index: 2", () => {
    // Create layout:
    //   <div>
    //     <div class="parent" style="z-index: 1">
    //       <div style="z-index: 9999">Child A (should be on top)</div>
    //     </div>
    //     <div class="sibling" style="z-index: 2">
    //       Sibling (should be behind child A)
    //     </div>
    //   </div>

    const context = buildStackingContextTree(root)

    // Verify: parent creates stacking context
    // Verify: child A is constrained to parent context (can't escape)
    // Verify: parent context renders before sibling (z-index: 1 < 2)

    // When rendered, child A (z: 9999) is highest within parent context (z: 1)
    // But parent context (z: 1) renders before sibling (z: 2)
    // Result: Sibling is on top

    expect(context.nestedContexts).toHaveLength(1)  // parent creates context
    expect(context.nestedContexts[0].root).toBe(parent)
  })
})
```

---

## Implementation Checklist

### Phase 1: Types (PR 1)
- [ ] Create `src/core/layout/stacking-context.ts` with StackingContext types
- [ ] Augment LayoutNode with `createsStackingContext`, `parentStackingContext`
- [ ] Run existing tests (should still pass)

### Phase 2: Detection (PR 2)
- [ ] Create `src/core/layout/stacking-context-detector.ts`
- [ ] Implement `detectStackingContext()`
- [ ] Implement `buildStackingContextTree()`
- [ ] Implement `computeRenderOrder()`
- [ ] Add detection tests in `tests/z-index/stacking-context-detection.test.ts`
- [ ] Add tree-building tests in `tests/z-index/stacking-context-tree.test.ts`

### Phase 3: Rendering (PR 3)
- [ ] Create `src/runtime/renderer/rendering-pass.ts`
- [ ] Implement two-pass rendering algorithm
- [ ] Update BufferRenderer to use new algorithm
- [ ] Remove old flat z-index sort code
- [ ] Run existing tests (update assertions if needed)

### Phase 4: Testing (PR 4)
- [ ] Create comprehensive test suite covering:
  - Negative z-index
  - Stacking context creation rules
  - Nested contexts (parent z-index doesn't bound children)
  - Text rendering above backgrounds
  - Complex real-world scenarios
- [ ] Update CSS compliance tests to include z-index scenarios
- [ ] Ensure all 538+ tests pass

### Phase 5: Edge Cases (PR 5)
- [ ] Handle `position: fixed` (separate viewport stacking context)
- [ ] Handle `position: sticky` (constrained by ancestor scroll bounds)
- [ ] Handle opacity < 1 stacking contexts
- [ ] Add edge case tests
- [ ] Document CSS limitations in CLAUDE.md

---

## Known CSS Limitations (Terminal Fundamentals)

### We Cannot Support
1. **Semi-transparent overlays** - Terminal cells are atomic, no blending
2. **Text color composition** - Can't overlay colored text on colored background
3. **3D transforms** - No 3D coordinate system in terminal
4. **pointer-events** - Interaction not affected by z-index (separate input layer)
5. **will-change, contain** - Performance hints don't apply to terminal

### Simplified Rules for Terminal
- No composite text colors (opaque text only)
- No implicit stacking contexts (opacity, filter, etc.) — only explicit
- Stacking context tree is flatter (no complex nesting rules)

---

## File Diff Summary

```
NEW:
  src/core/layout/stacking-context.ts           (~200 lines, types + detection)
  src/runtime/renderer/rendering-pass.ts        (~300 lines, two-pass algorithm)
  tests/z-index/                                (~1000 lines, comprehensive suite)

MODIFIED:
  src/core/layout/types.ts                      (+5 lines, augment LayoutNode)
  src/runtime/renderer/buffer-renderer.ts       (-80 lines, remove old sort logic; +20 lines, new integration)
  src/runtime/renderer/index.ts                 (+1 import for RenderingPass)

DELETED:
  Old z-index test files (will be superseded)
```

**Total new code**: ~1500 lines
**Total changed code**: ~100 lines
**Total deleted code**: ~80 lines

---

## Why This Approach Is Robust

1. **Hierarchical tree** - Mirrors CSS spec exactly, not approximate
2. **Two-pass rendering** - Separates concerns (backgrounds vs text), eliminates text-bleed issues
3. **Type-safe** - StackingContext type ensures tree validity
4. **Testable** - Each layer independently tested (detection → tree → rendering)
5. **Extensible** - Future support for opacity, filters, etc. just needs new detection rule
6. **Spec-compliant** - Implements CSS z-index stacking order faithfully

---

## Risk Mitigation

**Risk**: Breaking existing z-index behavior during transition
**Mitigation**: Keep old renderNode() as fallback until all tests pass, then remove

**Risk**: Performance regression with tree building
**Mitigation**: Tree building is O(n) single pass, caching for stable layouts

**Risk**: Complex nested scenarios reveal bugs
**Mitigation**: Comprehensive test suite with edge cases caught early

---

## Success Criteria

✓ All 538+ existing tests pass
✓ New z-index compliance tests pass (100% coverage of stacking rules)
✓ Text doesn't bleed through higher z-index elements
✓ Nested stacking contexts work correctly (parent z-index doesn't bound children that create contexts)
✓ Negative z-index renders behind parent background
✓ No performance regression in normal layouts
