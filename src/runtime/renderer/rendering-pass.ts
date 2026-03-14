/**
 * Two-Pass Rendering System
 *
 * Renders a stacking context tree using two passes:
 * - Pass 1: Backgrounds - Paint all box backgrounds and borders
 * - Pass 2: Text - Paint all text content
 *
 * This separation ensures that higher z-index elements' text
 * renders above lower z-index elements' backgrounds.
 */

import type { LayoutNode, VisualStyle } from "../../core/layout/types"
import { getBorderSide, getBorderSideFg } from "../../core/layout/box-model"
import type { StackingContext, StackingContextLayer } from "../../core/layout/stacking-context"
import { ScreenBuffer, createStyledCell, type Cell } from "../terminal/buffer"
import { getElement } from "../elements/registry"
import { isScrollableNode } from "../../core/layout/utils"
import type { InteractionManager } from "./interaction"
import type { SelectionManager } from "./selection"
import type { UIConfig } from "../../types/types"

/** Pre-blend a selection color+opacity over a dark background to get a solid hex color. */
function resolveSelectionBg(config?: UIConfig['selection']): string {
    const hex = config?.color ?? '#4a7bc4'
    const opacity = config?.opacity ?? 0.4
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    if (!m) return '#264f78'
    const r = parseInt(m[1]!, 16), g = parseInt(m[2]!, 16), b = parseInt(m[3]!, 16)
    // Blend over a typical dark terminal background (#1e1e1e)
    const br = Math.round(0x1e * (1 - opacity) + r * opacity)
    const bg = Math.round(0x1e * (1 - opacity) + g * opacity)
    const bb = Math.round(0x1e * (1 - opacity) + b * opacity)
    return `#${br.toString(16).padStart(2,'0')}${bg.toString(16).padStart(2,'0')}${bb.toString(16).padStart(2,'0')}`
}

interface ClipBox {
  x: number
  y: number
  width: number
  height: number
}

// Inheritable CSS properties: values flow from ancestor to descendant
// unless the descendant's own style explicitly overrides them.
const INHERITABLE_STYLE_KEYS = ['fg', 'underline', 'bold', 'italic'] as const

function applyInheritedStyle(nodeStyle: VisualStyle, inherited: VisualStyle): VisualStyle {
  const result = { ...nodeStyle }
  for (const key of INHERITABLE_STYLE_KEYS) {
    if (result[key] === undefined && inherited[key] !== undefined) {
      (result as any)[key] = inherited[key]
    }
  }
  return result
}

const BOX_CHARS = {
  line: {
    topLeft: "┌",
    topRight: "┐",
    bottomLeft: "└",
    bottomRight: "┘",
    horizontal: "─",
    vertical: "│",
  },
  heavy: {
    topLeft: "┏",
    topRight: "┓",
    bottomLeft: "┗",
    bottomRight: "┛",
    horizontal: "━",
    vertical: "┃",
  },
  double: {
    topLeft: "╔",
    topRight: "╗",
    bottomLeft: "╚",
    bottomRight: "╝",
    horizontal: "═",
    vertical: "║",
  },
  ascii: {
    topLeft: "+",
    topRight: "+",
    bottomLeft: "+",
    bottomRight: "+",
    horizontal: "-",
    vertical: "|",
  },
}

/**
 * Two-pass renderer for stacking context trees
 */
export class RenderingPass {
  private buffer: ScreenBuffer
  private interactionManager?: InteractionManager
  private selectionManager?: SelectionManager
  private uiConfig?: UIConfig
  private isTextPass: boolean = false
  private borderStringCache = new Map<string, string>()
  private elementBehaviorCache = new Map<string, ReturnType<typeof getElement>>()

  constructor(
    buffer: ScreenBuffer,
    interactionManager?: InteractionManager,
    selectionManager?: SelectionManager,
    uiConfig?: UIConfig,
  ) {
    this.buffer = buffer
    this.interactionManager = interactionManager
    this.selectionManager = selectionManager
    this.uiConfig = uiConfig
  }

  /**
   * Get or create a repeated string from cache
   */
  private getRepeatedString(char: string, n: number): string {
    if (n <= 0) return ''
    const key = `${char}:${n}`
    const cached = this.borderStringCache.get(key)
    if (cached) return cached
    const s = char.repeat(n)
    this.borderStringCache.set(key, s)
    return s
  }

  /**
   * Get element behavior with caching (OPT-18)
   */
  private getCachedElementBehavior(nodeType: string) {
    let behavior = this.elementBehaviorCache.get(nodeType)
    if (!behavior) {
      behavior = getElement(nodeType)
      this.elementBehaviorCache.set(nodeType, behavior)
    }
    return behavior
  }

  /**
   * Execute rendering for a stacking context tree by z-index level
   *
   * Renders each z-index level completely (background + text) before moving to the next.
   * This ensures higher z-index elements completely obscure lower elements in both
   * backgrounds AND text.
   */
  executeRenderingPasses(
    stackingContext: StackingContext,
    parentScrollY: number = 0,
    clipBox?: ClipBox
  ): void {
    // Render by z-index level: for each level, render both background and text
    this.renderByZIndexLevels(stackingContext, parentScrollY, clipBox)
  }

  /**
   * Render stacking context by iterating through z-index levels
   * For each z-index: render backgrounds, then text, then nested contexts (fully)
   */
  private renderByZIndexLevels(
    context: StackingContext,
    parentScrollY: number,
    clipBox?: ClipBox
  ): void {
    // Calculate the effective scroll Y for children of this context
    // (the context root's scrollY is applied to all children in its layers)
    const contextScrollY = parentScrollY + context.root.scrollY

    // Compute clip box for this context's children (if the context root is scrollable)
    let contextClipBox = clipBox
    if (context.root.layout && isScrollableNode(context.root)) {
      const adjustedY = context.root.layout.y - parentScrollY
      contextClipBox = {
        x: context.root.layout.x,
        y: adjustedY,
        width: context.root.layout.width,
        height: context.root.layout.height,
      }
      // Intersect with parent clipBox if it exists
      if (clipBox) {
        const x = Math.max(clipBox.x, contextClipBox.x)
        const y = Math.max(clipBox.y, contextClipBox.y)
        const right = Math.min(clipBox.x + clipBox.width, contextClipBox.x + contextClipBox.width)
        const bottom = Math.min(clipBox.y + clipBox.height, contextClipBox.y + contextClipBox.height)
        contextClipBox = {
          x,
          y,
          width: Math.max(0, right - x),
          height: Math.max(0, bottom - y),
        }
      }
    }

    // Process each layer (z-index level) in order
    for (let layerIdx = 0; layerIdx < context.renderOrder.length; layerIdx++) {
      const layer = context.renderOrder[layerIdx]!

      const layerZIdx = typeof layer.zIndex === "number" ? layer.zIndex : 0

      // Determine which parentScrollY to use for this layer:
      // - For root-background: use parentScrollY (not context's own scrollY)
      // - For other layers: use contextScrollY (includes context's scrollY)
      const layerParentScrollY = layer.zIndex === -Infinity ? parentScrollY : contextScrollY

      // Pre-compute clip boxes and inherited styles once per node
      const nodeCount = layer.nodes.length
      const clipBoxes: Array<ClipBox | undefined> = new Array(nodeCount)
      const inheritedStyles: Array<VisualStyle | undefined> = new Array(nodeCount)
      for (let i = 0; i < nodeCount; i++) {
        clipBoxes[i] = this.computeClipBoxFromAncestors(layer.nodes[i]!, contextClipBox)
        inheritedStyles[i] = this.computeInheritedStyleFromAncestors(layer.nodes[i]!)
      }

      // First pass for this z-index: render backgrounds and borders
      this.isTextPass = false
      for (let i = 0; i < nodeCount; i++) {
        this.renderNode(layer.nodes[i]!, context, layerParentScrollY, clipBoxes[i], inheritedStyles[i])
      }

      // Second pass for this z-index: render text content
      this.isTextPass = true
      for (let i = 0; i < nodeCount; i++) {
        this.renderNode(layer.nodes[i]!, context, layerParentScrollY, clipBoxes[i], inheritedStyles[i])
      }

      // Render nested stacking contexts that are at this z-index level
      // Each nested context fully renders itself (all its internal z-index levels)
      // BUT: skip rendering nested contexts at the text pass layer (pass="text")
      // They should only render at their own z-index layers
      if (layer.pass === "background") {
        for (const nestedContext of context.nestedContexts) {
          const contextZIdx =
            typeof nestedContext.root.layoutProps.zIndex === "number"
              ? nestedContext.root.layoutProps.zIndex
              : 0

          if (contextZIdx === layerZIdx) {
            this.renderByZIndexLevels(nestedContext, parentScrollY, contextClipBox)
          }
        }
      }
    }

    // Render scrollbar for this context's root (if scrollable, on background pass)
    if (context.root.layout && isScrollableNode(context.root)) {
      this.renderScrollbar(context.root, parentScrollY, clipBox)
    }
  }

  /**
   * Render a single node in the current pass
   */
  private renderNode(
    node: LayoutNode,
    parentContext: StackingContext,
    parentScrollY: number,
    clipBox?: ClipBox,
    inheritedStyle?: VisualStyle
  ): void {
    if (!node.layout) return
    if (node.style.invisible || node.layoutProps.display === "none") return

    const effectiveScrollY = parentScrollY + node.scrollY
    const nodeStyle = this.getEffectiveStyle(node)
    const effectiveStyle = inheritedStyle ? applyInheritedStyle(nodeStyle, inheritedStyle) : nodeStyle

    if (!this.isTextPass) {
      // Pass 1: Render backgrounds and borders
      if (node.type === "text") return // Skip text nodes in background pass

      this.renderBackground(node, effectiveStyle, parentScrollY, clipBox)
      this.renderBorder(node, effectiveStyle, parentScrollY, clipBox)
    } else {
      // Pass 2: Render text content
      if (node.type === "text") {
        this.renderText(node, effectiveStyle, parentScrollY, clipBox)
      } else {
        // Render element-specific content (input, textarea, button text)
        this.renderElementContent(node, effectiveStyle, parentScrollY, clipBox)
      }
    }

    // Render children if this node doesn't create a new stacking context
    if (!node.createsStackingContext) {
      const childClipBox = this.computeChildClipBox(node, parentScrollY, clipBox)

      // Render children, passing down effective style for CSS inheritance
      for (const child of node.children) {
        this.renderNode(child, parentContext, effectiveScrollY, childClipBox, effectiveStyle)
      }

      // Render scrollbar on top of children (text pass, after content is rendered)
      if (this.isTextPass && (isScrollableNode(node) || node.type === 'textarea' || node.type === 'editor') && node.layout) {
        this.renderScrollbar(node, parentScrollY, clipBox)
      }
    }
  }

  /**
   * Compute the inherited CSS style for a node from its ancestor chain.
   * Walks up parent nodes collecting inheritable properties (fg, underline, bold, italic)
   * until reaching the tree root. Nearest ancestor wins (first set value wins).
   */
  private computeInheritedStyleFromAncestors(node: LayoutNode): VisualStyle | undefined {
    const result: Partial<VisualStyle> = {}
    let remaining = INHERITABLE_STYLE_KEYS.length
    let current = node.parent

    while (current && remaining > 0) {
      const style = this.getEffectiveStyle(current)
      for (const key of INHERITABLE_STYLE_KEYS) {
        if (result[key] === undefined && style[key] !== undefined) {
          (result as any)[key] = style[key]
          remaining--
        }
      }
      current = current.parent
    }

    return remaining < INHERITABLE_STYLE_KEYS.length ? result as VisualStyle : undefined
  }

  /**
   * Compute the clipBox for a node based on its ancestors' viewports
   */
  private computeClipBoxFromAncestors(node: LayoutNode, contextClipBox?: ClipBox): ClipBox | undefined {
    // For absolutely positioned elements, don't apply clipping from ancestors
    // (they have their own stacking context)
    if (node.layoutProps.position === "absolute") {
      return contextClipBox
    }

    let clipBox = contextClipBox

    // Walk up the parent chain and apply each parent's viewport as a clip boundary
    let current = node.parent
    while (current && current.layout) {
      const parentClip: ClipBox = {
        x: current.layout.x,
        y: current.layout.y,
        width: current.layout.width,
        height: current.layout.height,
      }

      if (clipBox) {
        // Intersect with existing clipBox
        const x = Math.max(clipBox.x, parentClip.x)
        const y = Math.max(clipBox.y, parentClip.y)
        const right = Math.min(clipBox.x + clipBox.width, parentClip.x + parentClip.width)
        const bottom = Math.min(clipBox.y + clipBox.height, parentClip.y + parentClip.height)
        clipBox = {
          x,
          y,
          width: Math.max(0, right - x),
          height: Math.max(0, bottom - y),
        }
      } else {
        clipBox = parentClip
      }

      current = current.parent
    }

    return clipBox
  }

  /**
   * Compute the clip box for a node's children
   */
  private computeChildClipBox(
    node: LayoutNode,
    parentScrollY: number,
    clipBox?: ClipBox
  ): ClipBox | undefined {
    if (!node.layout) return clipBox

    const adjustedY = node.layout.y - parentScrollY
    const layout = node.layout
    const borderLeft   = getBorderSide(layout.border, 'left')
    const borderTop    = getBorderSide(layout.border, 'top')
    const borderRight  = getBorderSide(layout.border, 'right')
    const borderBottom = getBorderSide(layout.border, 'bottom')
    const padding = layout.padding

    // Clip to the content box (inside border + padding) so children never
    // bleed into padding or border areas — this is what makes padding-bottom clip correctly.
    let own: ClipBox = {
      x: layout.x + borderLeft + padding.left,
      y: adjustedY + borderTop + padding.top,
      width: layout.width - borderLeft - borderRight - padding.left - padding.right,
      height: layout.height - borderTop - borderBottom - padding.top - padding.bottom,
    }

    // For scrollable containers with overflow, reserve 1 column for the scrollbar
    if (isScrollableNode(node) && node.contentHeight !== undefined) {
      const viewportHeight = own.height
      if (node.contentHeight > viewportHeight) {
        // Content overflows - reduce width by 1 to reserve space for scrollbar
        own = { ...own, width: Math.max(0, own.width - 1) }
      }
    }

    if (!clipBox) return own

    const x = Math.max(clipBox.x, own.x)
    const y = Math.max(clipBox.y, own.y)
    const right = Math.min(clipBox.x + clipBox.width, own.x + own.width)
    const bottom = Math.min(clipBox.y + clipBox.height, own.y + own.height)

    return {
      x,
      y,
      width: Math.max(0, right - x),
      height: Math.max(0, bottom - y),
    }
  }

  /**
   * Render box background
   */
  private renderBackground(
    node: LayoutNode,
    style: VisualStyle,
    parentScrollY: number,
    clipBox?: ClipBox
  ): void {
    const layout = node.layout!
    const adjustedY = layout.y - parentScrollY

    if (adjustedY + layout.height <= 0 || adjustedY >= this.buffer.height) return

    const cellStyle = this.visualStyleToCellStyle(style)

    // Fill background
    if (style.bg && style.transparent !== true) {
      let fillX = layout.x
      let fillW = layout.width
      let fillY = adjustedY
      let fillH = layout.height

      if (fillY < 0) {
        fillH += fillY
        fillY = 0
      }
      if (fillY + fillH > this.buffer.height) {
        fillH = this.buffer.height - fillY
      }

      if (clipBox) {
        const clipRight = clipBox.x + clipBox.width
        const clipBottom = clipBox.y + clipBox.height
        if (fillX < clipBox.x) {
          fillW -= clipBox.x - fillX
          fillX = clipBox.x
        }
        if (fillX + fillW > clipRight) {
          fillW = clipRight - fillX
        }
        if (fillY < clipBox.y) {
          fillH -= clipBox.y - fillY
          fillY = clipBox.y
        }
        if (fillY + fillH > clipBottom) {
          fillH = clipBottom - fillY
        }
      }

      if (fillH > 0 && fillW > 0) {
        const bgCell = createStyledCell(" ", {
          color: cellStyle.color ?? null,
          background: cellStyle.background ?? null,
          bold: false,
          underline: false,
          italic: false,
          inverse: cellStyle.inverse ?? false,
          dim: false,
        })
        this.buffer.fill(fillX, fillY, fillW, fillH, bgCell)
      }
    }
  }

  /**
   * Render box border
   */
  private renderBorder(
    node: LayoutNode,
    style: VisualStyle,
    parentScrollY: number,
    clipBox?: ClipBox
  ): void {
    const layout = node.layout!
    if (!layout.border) return

    const borderStyle = layout.border
    const hasTop    = getBorderSide(borderStyle, 'top')    > 0
    const hasRight  = getBorderSide(borderStyle, 'right')  > 0
    const hasBottom = getBorderSide(borderStyle, 'bottom') > 0
    const hasLeft   = getBorderSide(borderStyle, 'left')   > 0
    if (!hasTop && !hasRight && !hasBottom && !hasLeft) return

    const borderType = borderStyle.type || "line"
    const chars = borderType === "bg" ? BOX_CHARS.line : BOX_CHARS[borderType] || BOX_CHARS.line
    const borderBg = style.border?.bg || style.bg
    const adjustedY = layout.y - parentScrollY
    const x = layout.x
    const y = adjustedY
    const width = layout.width
    const height = layout.height

    const cellStyleForSide = (side: 'top' | 'right' | 'bottom' | 'left') => ({
      color: style.border?.fg || getBorderSideFg(borderStyle, side) || style.fg || null,
      background: borderBg || null,
      bold: style.bold || false,
      underline: false,
      italic: false,
      inverse: false,
      dim: false,
    })

    // Top side
    if (hasTop) {
      const cs = cellStyleForSide('top')
      const leftChar  = hasLeft  ? chars.topLeft     : chars.horizontal
      const rightChar = hasRight ? chars.topRight    : chars.horizontal
      this.buffer.write(x, y, leftChar, cs)
      if (width > 2) {
        this.buffer.write(x + 1, y, this.getRepeatedString(chars.horizontal, width - 2), cs)
      }
      if (width > 1) this.buffer.write(x + width - 1, y, rightChar, cs)
    }

    // Bottom side
    if (hasBottom) {
      const cs = cellStyleForSide('bottom')
      const leftChar  = hasLeft  ? chars.bottomLeft  : chars.horizontal
      const rightChar = hasRight ? chars.bottomRight : chars.horizontal
      this.buffer.write(x, y + height - 1, leftChar, cs)
      if (width > 2) {
        this.buffer.write(x + 1, y + height - 1, this.getRepeatedString(chars.horizontal, width - 2), cs)
      }
      if (width > 1) this.buffer.write(x + width - 1, y + height - 1, rightChar, cs)
    }

    // Left side (interior rows only)
    if (hasLeft) {
      const cs = cellStyleForSide('left')
      const startRow = hasTop    ? 1 : 0
      const endRow   = hasBottom ? height - 1 : height
      for (let i = startRow; i < endRow; i++) {
        this.buffer.write(x, y + i, chars.vertical, cs)
      }
    }

    // Right side (interior rows only)
    if (hasRight) {
      const cs = cellStyleForSide('right')
      const startRow = hasTop    ? 1 : 0
      const endRow   = hasBottom ? height - 1 : height
      for (let i = startRow; i < endRow; i++) {
        this.buffer.write(x + width - 1, y + i, chars.vertical, cs)
      }
    }
  }

  /**
   * Render text node
   */
  private renderText(
    node: LayoutNode,
    style: VisualStyle,
    parentScrollY: number,
    clipBox?: ClipBox
  ): void {
    const layout = node.layout!
    const text = node.content || ""

    const cellStyle = this.visualStyleToCellStyle(style)
    const adjustedY = layout.y - parentScrollY

    if (adjustedY + layout.height <= 0 || adjustedY >= this.buffer.height) return

    const lines = text.split("\n")
    for (let i = 0; i < lines.length && i < layout.height; i++) {
      const line = lines[i] || ""
      const y = adjustedY + i

      if (y < 0) continue
      if (y >= this.buffer.height) break

      if (clipBox && (y < clipBox.y || y >= clipBox.y + clipBox.height)) continue

      let x = layout.x
      let displayText = line.slice(0, layout.width)

      if (clipBox) {
        const clipRight = clipBox.x + clipBox.width
        if (x >= clipRight) continue
        if (x < clipBox.x) {
          displayText = displayText.slice(clipBox.x - x)
          x = clipBox.x
        }
        if (x + displayText.length > clipRight) {
          displayText = displayText.slice(0, clipRight - x)
        }
      }

      this.buffer.write(x, y, displayText, cellStyle)
    }
  }

  /**
   * Render element-specific content (button text, input value, etc.) and box content
   * This is called for non-text nodes to render their content
   */
  private renderElementContent(
    node: LayoutNode,
    style: VisualStyle,
    parentScrollY: number,
    clipBox?: ClipBox
  ): void {
    const behavior = this.getCachedElementBehavior(node.type)
    if (behavior?.render) {
      if (!node.layout) return
      const layout = node.layout!
      const adjustedY = layout.y - parentScrollY
      const cellStyle = this.visualStyleToCellStyle(style)

      const selectionBg = resolveSelectionBg(this.uiConfig?.selection)
      behavior.render(node, { buffer: this.buffer, cellStyle, adjustedY, clipBox, selectionBg })
    } else if (node.content) {
      // Render box content with padding offset
      const layout = node.layout!
      const content = node.content || ""
      const borderLeft   = getBorderSide(layout.border, 'left')
      const borderTop    = getBorderSide(layout.border, 'top')
      const borderRight  = getBorderSide(layout.border, 'right')
      const borderBottom = getBorderSide(layout.border, 'bottom')
      const padding = layout.padding
      const cellStyle = this.visualStyleToCellStyle(style)

      const contentX = layout.x + borderLeft + padding.left
      const contentY = (layout.y - parentScrollY) + borderTop + padding.top
      let contentWidth = layout.width - borderLeft - borderRight - padding.left - padding.right
      const contentHeight = layout.height - borderTop - borderBottom - padding.top - padding.bottom

      // If there's a clipBox, constrain the content width to it
      let maxX = contentX + contentWidth
      if (clipBox) {
        maxX = Math.min(maxX, clipBox.x + clipBox.width)
      }
      const effectiveWidth = Math.max(1, maxX - contentX)

      const scrollOffset = node.scrollY
      const textAlign = node.layoutProps.textAlign
      const verticalAlign = node.layoutProps.verticalAlign
      const lines = content.split("\n")

      // Calculate vertical offset based on verticalAlign
      let verticalOffset = 0
      if (verticalAlign === 'middle') {
        verticalOffset = Math.floor((contentHeight - lines.length) / 2)
      } else if (verticalAlign === 'bottom') {
        verticalOffset = Math.max(0, contentHeight - lines.length)
      }

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i] || ""

        if (i < scrollOffset) continue

        const visibleIndex = i - scrollOffset
        if (visibleIndex >= contentHeight) break

        const y = contentY + verticalOffset + visibleIndex

        if (clipBox && (y < clipBox.y || y >= clipBox.y + clipBox.height)) continue

        const clipped = line.slice(0, effectiveWidth)
        let x = contentX
        if (textAlign === "center") {
          x = contentX + Math.floor((effectiveWidth - clipped.length) / 2)
        } else if (textAlign === "right") {
          x = contentX + effectiveWidth - clipped.length
        }

        this.buffer.write(x, y, clipped, cellStyle)
      }
    }
  }

  /**
   * Get effective style (base + interactive state) with caching
   */
  private getEffectiveStyle(node: LayoutNode): VisualStyle {
    // Compute current interaction state key
    let stateKey = 'none'
    if (this.interactionManager) {
      const state = this.interactionManager.getState(node)
      stateKey = `${state.active ? 'a' : ''}${state.focus ? 'f' : ''}${state.hover ? 'h' : ''}` || 'none'
    }

    // Check cache
    if (node._cachedEffectiveStyle && node._cachedStyleState === stateKey) {
      return node._cachedEffectiveStyle
    }

    const uaStyle: Partial<VisualStyle> =
      node.type === "button"
        ? { bg: "blue" }
        : node.type === "input" || node.type === "textarea" || node.type === "select"
          ? { bg: "grey" }
          : node.type === "a"
            ? { fg: "cyan", underline: true }
            : {}
    const baseStyle = { ...uaStyle, ...node.style }

    if (!this.interactionManager) {
      node._cachedEffectiveStyle = baseStyle
      node._cachedStyleState = stateKey
      return baseStyle
    }

    const state = this.interactionManager.getState(node)
    let effectiveStyle = { ...baseStyle }

    if (state.hover && node.style.hover) {
      effectiveStyle = { ...effectiveStyle, ...node.style.hover }
    }

    if (state.focus && node.style.focus) {
      effectiveStyle = { ...effectiveStyle, ...node.style.focus }
    }

    if (state.active && node.style.active) {
      effectiveStyle = { ...effectiveStyle, ...node.style.active }
    }

    // Cache the result
    node._cachedEffectiveStyle = effectiveStyle
    node._cachedStyleState = stateKey
    return effectiveStyle
  }

  /**
   * Render a scrollbar overlay on the rightmost column
   */
  private renderScrollbar(node: LayoutNode, parentScrollY: number, clipBox?: ClipBox): void {
    const layout = node.layout!
    const contentHeight = node.contentHeight ?? 0
    const borderTop   = getBorderSide(layout.border, 'top')
    const borderRight = getBorderSide(layout.border, 'right')
    const borderBottom = getBorderSide(layout.border, 'bottom')
    const padding = layout.padding
    const viewportHeight = layout.height - borderTop - borderBottom - padding.top - padding.bottom

    if (contentHeight <= viewportHeight) return

    const adjustedY = layout.y - parentScrollY + borderTop
    const x = layout.x + layout.width - 1 - borderRight

    // Clamp visible track to clip box so the scrollbar never draws outside its container
    const clipTop    = clipBox ? Math.max(adjustedY, clipBox.y) : adjustedY
    const clipBottom = clipBox ? Math.min(adjustedY + viewportHeight, clipBox.y + clipBox.height) : adjustedY + viewportHeight
    const visibleHeight = Math.max(0, clipBottom - clipTop)
    if (visibleHeight === 0) return

    const thumbSize = Math.max(1, Math.floor((viewportHeight / contentHeight) * viewportHeight))
    const scrollRange = contentHeight - viewportHeight
    const trackRange = viewportHeight - thumbSize
    const thumbPos = trackRange > 0 ? Math.round((node.scrollY / scrollRange) * trackRange) : 0

    const trackStyle = {
      color: "grey" as string,
      background: null,
      bold: false,
      underline: false,
      italic: false,
      inverse: false,
      dim: false,
    }
    const thumbStyle = {
      color: "white" as string,
      background: null,
      bold: false,
      underline: false,
      italic: false,
      inverse: false,
      dim: false,
    }

    const thumbChar = this.uiConfig?.scrollbar?.thumb ?? '█'
    const trackChar = this.uiConfig?.scrollbar?.track ?? '│'

    // Render scrollbar vertically (one row at a time), skipping rows outside clip
    // Track before thumb
    for (let i = 0; i < thumbPos; i++) {
      const y = adjustedY + i
      if (y >= clipTop && y < clipBottom) this.buffer.write(x, y, trackChar, trackStyle)
    }
    // Thumb section
    for (let i = 0; i < thumbSize; i++) {
      const y = adjustedY + thumbPos + i
      if (y >= clipTop && y < clipBottom) this.buffer.write(x, y, thumbChar, thumbStyle)
    }
    // Track after thumb
    const trackAfter = viewportHeight - thumbPos - thumbSize
    for (let i = 0; i < trackAfter; i++) {
      const y = adjustedY + thumbPos + thumbSize + i
      if (y >= clipTop && y < clipBottom) this.buffer.write(x, y, trackChar, trackStyle)
    }
  }

  /**
   * Convert visual style to cell style
   */
  private visualStyleToCellStyle(style: VisualStyle): Partial<Omit<Cell, "char">> {
    return {
      color: style.fg || null,
      background: style.bg || null,
      bold: style.bold || false,
      underline: style.underline || false,
      italic: style.italic || false,
      inverse: style.inverse || false,
      dim: style.dim || false,
    }
  }
}
