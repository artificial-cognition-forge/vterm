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
import type { StackingContext, StackingContextLayer } from "../../core/layout/stacking-context"
import { ScreenBuffer, createStyledCell, type Cell } from "../terminal/buffer"
import { getElement } from "../elements/registry"
import { isScrollableNode } from "../../core/layout/utils"
import type { InteractionManager } from "./interaction"
import type { SelectionManager } from "./selection"

interface ClipBox {
  x: number
  y: number
  width: number
  height: number
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
  private isTextPass: boolean = false

  constructor(
    buffer: ScreenBuffer,
    interactionManager?: InteractionManager,
    selectionManager?: SelectionManager
  ) {
    this.buffer = buffer
    this.interactionManager = interactionManager
    this.selectionManager = selectionManager
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

      // First pass for this z-index: render backgrounds and borders
      this.isTextPass = false
      for (const node of layer.nodes) {
        // When rendering nodes from layers, compute the appropriate clipBox
        // based on this node's parents' viewports
        const nodeClipBox = this.computeClipBoxFromAncestors(node, contextClipBox)
        this.renderNode(node, context, layerParentScrollY, nodeClipBox)
      }

      // Second pass for this z-index: render text content
      this.isTextPass = true
      for (const node of layer.nodes) {
        // When rendering nodes from layers, compute the appropriate clipBox
        const nodeClipBox = this.computeClipBoxFromAncestors(node, contextClipBox)
        this.renderNode(node, context, layerParentScrollY, nodeClipBox)
      }

      // Render nested stacking contexts that are at this z-index level
      // Each nested context fully renders itself (all its internal z-index levels)
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

    // Render scrollbar for this context's root (if scrollable, on background pass)
    if (context.root.layout && isScrollableNode(context.root)) {
      this.renderScrollbar(context.root, parentScrollY)
    }
  }

  /**
   * Render a single node in the current pass
   */
  private renderNode(
    node: LayoutNode,
    parentContext: StackingContext,
    parentScrollY: number,
    clipBox?: ClipBox
  ): void {
    if (!node.layout) return
    if (node.style.invisible || node.layoutProps.display === "none") return

    const effectiveScrollY = parentScrollY + node.scrollY
    const effectiveStyle = this.getEffectiveStyle(node)

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

      // Render children in document order (they belong to parent context)
      for (const child of node.children) {
        this.renderNode(child, parentContext, effectiveScrollY, childClipBox)
      }

      // Render scrollbar on top of children (background pass only)
      if (!this.isTextPass && isScrollableNode(node) && node.layout) {
        this.renderScrollbar(node, parentScrollY)
      }
    }
  }

  /**
   * Compute the clipBox for a node based on its ancestors' viewports
   */
  private computeClipBoxFromAncestors(node: LayoutNode, contextClipBox?: ClipBox): ClipBox | undefined {
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

    const own: ClipBox = {
      x: node.layout.x,
      y: adjustedY,
      width: node.layout.width,
      height: node.layout.height,
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
        const bgCell = createStyledCell(" ", cellStyle)
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
    if (!layout.border || layout.border.width === 0) return

    const borderStyle = layout.border
    const borderType = borderStyle.type || "line"
    const chars = borderType === "bg" ? BOX_CHARS.line : BOX_CHARS[borderType] || BOX_CHARS.line

    const borderColor = style.border?.fg || borderStyle.fg || style.fg
    const borderBg = style.border?.bg || style.bg

    const cellStyle = {
      color: borderColor || null,
      background: borderBg || null,
      bold: style.bold || false,
      underline: false,
      italic: false,
      inverse: false,
      dim: false,
    }

    const adjustedY = layout.y - parentScrollY
    const x = layout.x
    const y = adjustedY
    const width = layout.width
    const height = layout.height

    // Top-left corner
    this.buffer.write(x, y, chars.topLeft, cellStyle)

    // Top border
    if (width > 2) {
      this.buffer.write(x + 1, y, chars.horizontal.repeat(width - 2), cellStyle)
    }

    // Top-right corner
    this.buffer.write(x + width - 1, y, chars.topRight, cellStyle)

    // Left and right borders
    for (let i = 1; i < height - 1; i++) {
      this.buffer.write(x, y + i, chars.vertical, cellStyle)
      this.buffer.write(x + width - 1, y + i, chars.vertical, cellStyle)
    }

    // Bottom-left corner
    this.buffer.write(x, y + height - 1, chars.bottomLeft, cellStyle)

    // Bottom border
    if (width > 2) {
      this.buffer.write(x + 1, y + height - 1, chars.horizontal.repeat(width - 2), cellStyle)
    }

    // Bottom-right corner
    this.buffer.write(x + width - 1, y + height - 1, chars.bottomRight, cellStyle)
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
    const behavior = getElement(node.type)
    if (behavior?.render) {
      if (!node.layout) return
      const layout = node.layout!
      const adjustedY = layout.y - parentScrollY
      const cellStyle = this.visualStyleToCellStyle(style)

      behavior.render(node, { buffer: this.buffer, cellStyle, adjustedY, clipBox })
    } else if (node.content) {
      // Render box content with padding offset
      const layout = node.layout!
      const content = node.content || ""
      const border = layout.border.width
      const padding = layout.padding
      const cellStyle = this.visualStyleToCellStyle(style)

      const contentX = layout.x + border + padding.left
      const contentY = (layout.y - parentScrollY) + border + padding.top
      let contentWidth = layout.width - 2 * border - padding.left - padding.right
      const contentHeight = layout.height - 2 * border - padding.top - padding.bottom

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

        const textToWrite = clipped.padEnd(effectiveWidth - (x - contentX), " ")
        this.buffer.write(x, y, textToWrite, cellStyle)
      }
    }
  }

  /**
   * Get effective style (base + interactive state)
   */
  private getEffectiveStyle(node: LayoutNode): VisualStyle {
    const uaStyle: Partial<VisualStyle> =
      node.type === "button"
        ? { bg: "blue" }
        : node.type === "input" || node.type === "textarea" || node.type === "select"
          ? { bg: "grey" }
          : node.type === "a"
            ? { fg: "cyan", underline: true }
            : {}
    const baseStyle = { ...uaStyle, ...node.style }

    if (!this.interactionManager) return baseStyle

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

    return effectiveStyle
  }

  /**
   * Render a scrollbar overlay on the rightmost column
   * Drawn on top of children so it sits above any content
   */
  private renderScrollbar(node: LayoutNode, parentScrollY: number): void {
    const layout = node.layout!
    const contentHeight = node.contentHeight ?? 0
    const viewportHeight = layout.height

    if (contentHeight <= viewportHeight) return

    const adjustedY = layout.y - parentScrollY
    const x = layout.x + layout.width - 1

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

    for (let i = 0; i < viewportHeight; i++) {
      const y = adjustedY + i
      if (y < 0 || y >= this.buffer.height) continue
      const isThumb = i >= thumbPos && i < thumbPos + thumbSize
      this.buffer.write(x, y, isThumb ? "█" : "│", isThumb ? thumbStyle : trackStyle)
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
