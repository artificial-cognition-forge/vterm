/**
 * Buffer Renderer - Renders LayoutNode tree to ScreenBuffer
 *
 * Renders directly to a ScreenBuffer using computed layout positions.
 *
 * Flow:
 * 1. Layout engine computes positions (x, y, width, height)
 * 2. Buffer renderer paints nodes to screen buffer
 * 3. Frame differ generates minimal ANSI updates
 * 4. Terminal driver writes to stdout
 */

import type { LayoutNode, VisualStyle } from "../../core/layout/types"
import { buildStackingContextTree } from "../../core/layout/stacking-context"
import { ScreenBuffer, createStyledCell, type Cell } from "../terminal/buffer"
import { isScrollableNode } from "../../core/layout/utils"
import { getElement } from "../elements/registry"
import type { InteractionManager } from "./interaction"
import type { SelectionManager } from "./selection"
import { RenderingPass } from "./rendering-pass"
import type { UIConfig } from "../../types/types"

interface ClipBox {
    x: number
    y: number
    width: number
    height: number
}

/**
 * Box drawing characters for borders
 */
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
 * Renders a LayoutNode tree to a ScreenBuffer
 */
export class BufferRenderer {
    private interactionManager?: InteractionManager
    private selectionManager?: SelectionManager
    private uiConfig: UIConfig

    constructor(interactionManager?: InteractionManager, selectionManager?: SelectionManager, uiConfig?: UIConfig) {
        this.interactionManager = interactionManager
        this.selectionManager = selectionManager
        this.uiConfig = uiConfig ?? { scrollbar: { thumb: '█', track: '│' }, cursor: { shape: 'block', blink: true } }
    }

    /**
     * Renders the entire layout tree to a buffer using stacking contexts,
     * then overlays the selection highlight.
     *
     * Uses two-pass rendering:
     * - Pass 1: Paint all backgrounds and borders (respecting z-index stacking order)
     * - Pass 2: Paint all text content (on top of all backgrounds)
     */
    render(root: LayoutNode, buffer: ScreenBuffer): void {
        // Clear the buffer
        buffer.clear()

        // Build stacking context tree from layout nodes
        const rootContext = buildStackingContextTree(root)

        // Execute two-pass rendering
        const renderPass = new RenderingPass(buffer, this.interactionManager, this.selectionManager)
        renderPass.executeRenderingPasses(rootContext, 0)

        // Overlay selection highlight on top of all rendered content
        this.selectionManager?.applyHighlight(buffer)
    }

    /**
     * Renders a single node and its children.
     * Renders children sorted by z-index (back-to-front) to ensure higher z-index
     * elements completely obscure lower ones.
     */
    private renderNode(node: LayoutNode, buffer: ScreenBuffer, parentScrollY: number = 0, clipBox?: ClipBox): void {
        if (!node.layout) return

        // Skip invisible nodes and display:none nodes
        if (node.style.invisible || node.layoutProps.display === 'none') return

        // Effective scroll offset for this node's children
        const effectiveScrollY = parentScrollY + node.scrollY

        // Get the effective style for this node (base style + interactive state)
        const effectiveStyle = this.getEffectiveStyle(node)

        // Render based on node type
        if (node.type === "text") {
            this.renderText(node, buffer, effectiveStyle, parentScrollY, clipBox)
        } else {
            this.renderBox(node, buffer, effectiveStyle, parentScrollY, clipBox)
        }

        // All container nodes establish a clip box that constrains their children
        const childClipBox: ClipBox | undefined = node.layout && node.type !== 'text'
            ? (() => {
                const own: ClipBox = { x: node.layout.x, y: node.layout.y - parentScrollY, width: node.layout.width, height: node.layout.height }
                if (!clipBox) return own
                const x = Math.max(clipBox.x, own.x)
                const y = Math.max(clipBox.y, own.y)
                const right = Math.min(clipBox.x + clipBox.width, own.x + own.width)
                const bottom = Math.min(clipBox.y + clipBox.height, own.y + own.height)
                return { x, y, width: Math.max(0, right - x), height: Math.max(0, bottom - y) }
            })()
            : clipBox

        // Skip children when the element behavior handles all content rendering itself
        const skipChildren = node.type !== 'text' && !!getElement(node.type)?.skipChildren

        if (!skipChildren) {
            // Sort children by z-index for proper layering (back-to-front)
            const sortedChildren = [...node.children].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))

            // Render children with accumulated scroll offset and clip box
            for (const child of sortedChildren) {
                this.renderNode(child, buffer, effectiveScrollY, childClipBox)
            }

            // Overlay scrollbar on top of children (rightmost column of the viewport)
            // Textarea always gets a scrollbar if content overflows
            if ((isScrollableNode(node) || node.type === 'textarea') && node.layout) {
                this.renderScrollbar(node, buffer, parentScrollY)
            }
        }
    }


    /**
     * Renders a scrollbar overlay on the rightmost column of a scrollable node.
     * Drawn after children so it sits on top of any content.
     */
    private renderScrollbar(node: LayoutNode, buffer: ScreenBuffer, parentScrollY: number): void {
        const layout = node.layout!
        const contentHeight = node.contentHeight ?? 0

        // Calculate actual viewport height (content area minus borders and padding)
        const border = layout.border.width
        const padding = layout.padding
        const viewportHeight = layout.height - 2 * border - padding.top - padding.bottom

        // Store debug info on node for testing
        ;(node as any).__scrollbar_debug = {
            contentHeight, viewportHeight, border, padding,
            shouldRender: contentHeight > viewportHeight,
            layout_x: layout.x,
            layout_y: layout.y,
            layout_width: layout.width,
            layout_height: layout.height,
            scrollbar_x: layout.x + layout.width - 1,
            scrollbar_y: layout.y + border,
            scrollbar_height: viewportHeight,
            parentScrollY
        }

        if (contentHeight <= viewportHeight) return

        // Scrollbar is positioned at the right edge of the content area (inside border)
        const adjustedY = layout.y + border + padding.top - parentScrollY
        const x = layout.x + layout.width - 1

        const thumbSize = Math.max(1, Math.floor((viewportHeight / contentHeight) * viewportHeight))
        const scrollRange = contentHeight - viewportHeight
        const trackRange = viewportHeight - thumbSize
        const thumbPos = trackRange > 0 ? Math.round((node.scrollY / scrollRange) * trackRange) : 0

        const trackStyle = { color: 'grey' as string, background: null, bold: false, underline: false, italic: false, inverse: false, dim: false }
        const thumbStyle = { color: 'white' as string, background: null, bold: false, underline: false, italic: false, inverse: false, dim: false }

        const scrollbarConfig = this.uiConfig.scrollbar ?? {}
        const thumbChar = scrollbarConfig.thumb ?? '█'
        const trackChar = scrollbarConfig.track ?? '│'

        for (let i = 0; i < viewportHeight; i++) {
            const y = adjustedY + i
            if (y < 0 || y >= buffer.height) continue
            const isThumb = i >= thumbPos && i < thumbPos + thumbSize
            buffer.write(x, y, isThumb ? thumbChar : trackChar, isThumb ? thumbStyle : trackStyle)
        }
    }

    /**
     * Gets the effective style for a node, merging base style with interactive state
     */
    private getEffectiveStyle(node: LayoutNode): VisualStyle {
        const uaStyle: Partial<VisualStyle> =
            node.type === 'button'   ? { bg: 'blue' } :
            node.type === 'input' || node.type === 'textarea' || node.type === 'select' ? { bg: 'grey' } :
            node.type === 'a'        ? { fg: 'cyan', underline: true } :
            {}
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
     * Renders a text node
     */
    private renderText(
        node: LayoutNode,
        buffer: ScreenBuffer,
        style: VisualStyle,
        parentScrollY: number,
        clipBox?: ClipBox
    ): void {
        const layout = node.layout!
        const text = node.content || ""

        const cellStyle = this.visualStyleToCellStyle(style)

        const adjustedY = layout.y - parentScrollY

        if (adjustedY + layout.height < 0 || adjustedY >= buffer.height) return

        const lines = text.split("\n")
        for (let i = 0; i < lines.length && i < layout.height; i++) {
            const line = lines[i] || ""
            const y = adjustedY + i

            if (y < 0) continue
            if (y >= buffer.height) break

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

            buffer.write(x, y, displayText, cellStyle)
        }
    }

    /**
     * Renders a box node (container)
     */
    private renderBox(
        node: LayoutNode,
        buffer: ScreenBuffer,
        style: VisualStyle,
        parentScrollY: number = 0,
        clipBox?: ClipBox
    ): void {
        const layout = node.layout!

        const adjustedY = layout.y - parentScrollY

        if (adjustedY + layout.height <= 0 || adjustedY >= buffer.height) return

        const cellStyle = this.visualStyleToCellStyle(style)

        // Fill background
        if (style.bg && style.transparent !== true) {
            let fillX = layout.x
            let fillW = layout.width
            let fillY = adjustedY
            let fillH = layout.height

            if (fillY < 0) { fillH += fillY; fillY = 0 }
            if (fillY + fillH > buffer.height) { fillH = buffer.height - fillY }

            if (clipBox) {
                const clipRight = clipBox.x + clipBox.width
                const clipBottom = clipBox.y + clipBox.height
                if (fillX < clipBox.x) { fillW -= clipBox.x - fillX; fillX = clipBox.x }
                if (fillX + fillW > clipRight) { fillW = clipRight - fillX }
                if (fillY < clipBox.y) { fillH -= clipBox.y - fillY; fillY = clipBox.y }
                if (fillY + fillH > clipBottom) { fillH = clipBottom - fillY }
            }

            if (fillH > 0 && fillW > 0) {
                const bgCell = createStyledCell(" ", cellStyle)
                buffer.fill(fillX, fillY, fillW, fillH, bgCell)
            }
        }

        // Render border
        if (layout.border && layout.border.width > 0) {
            this.renderBorder(node, buffer, style, adjustedY)
        }

        // Delegate content rendering to element behavior if one is registered
        const behavior = getElement(node.type)
        if (behavior?.render) {
            behavior.render(node, { buffer, cellStyle, adjustedY, clipBox })
        } else if (node.content) {
            this.renderBoxContent(node, buffer, cellStyle, adjustedY, clipBox)
        }
    }

    /**
     * Renders content inside a box
     */
    private renderBoxContent(
        node: LayoutNode,
        buffer: ScreenBuffer,
        cellStyle: Partial<Omit<Cell, "char">>,
        adjustedY: number,
        clipBox?: ClipBox
    ): void {
        const layout = node.layout!
        const content = node.content || ""

        const border = layout.border.width
        const padding = layout.padding

        const contentX = layout.x + border + padding.left
        const contentY = adjustedY + border + padding.top
        const contentWidth = layout.width - 2 * border - padding.left - padding.right
        const contentHeight = layout.height - 2 * border - padding.top - padding.bottom

        const scrollOffset = node.scrollY

        const textAlign = node.layoutProps.textAlign
        const valign = (node.layoutProps as any).valign as string | undefined
        const lines = content.split("\n")

        // Compute vertical offset for vertical-align: middle / bottom
        let verticalOffset = 0
        if (valign === 'middle') {
            verticalOffset = Math.floor((contentHeight - lines.length) / 2)
        } else if (valign === 'bottom') {
            verticalOffset = Math.max(0, contentHeight - lines.length)
        }

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i] || ""

            if (i < scrollOffset) continue

            const visibleIndex = i - scrollOffset
            if (visibleIndex >= contentHeight) break

            const y = contentY + verticalOffset + visibleIndex

            if (clipBox && (y < clipBox.y || y >= clipBox.y + clipBox.height)) continue

            const clipped = line.slice(0, contentWidth)
            let x = contentX
            if (textAlign === 'center') {
                x = contentX + Math.floor((contentWidth - clipped.length) / 2)
            } else if (textAlign === 'right') {
                x = contentX + contentWidth - clipped.length
            }

            buffer.write(x, y, clipped.padEnd(contentWidth - (x - contentX), " "), cellStyle)
        }
    }

    /**
     * Renders a border around a box
     */
    private renderBorder(node: LayoutNode, buffer: ScreenBuffer, style: VisualStyle, adjustedY?: number): void {
        const layout = node.layout!
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

        const x = layout.x
        const y = adjustedY ?? layout.y
        const width = layout.width
        const height = layout.height

        buffer.write(x, y, chars.topLeft, cellStyle)
        buffer.write(x + 1, y, chars.horizontal.repeat(Math.max(0, width - 2)), cellStyle)
        buffer.write(x + width - 1, y, chars.topRight, cellStyle)

        for (let i = 1; i < height - 1; i++) {
            buffer.write(x, y + i, chars.vertical, cellStyle)
            buffer.write(x + width - 1, y + i, chars.vertical, cellStyle)
        }

        buffer.write(x, y + height - 1, chars.bottomLeft, cellStyle)
        buffer.write(x + 1, y + height - 1, chars.horizontal.repeat(Math.max(0, width - 2)), cellStyle)
        buffer.write(x + width - 1, y + height - 1, chars.bottomRight, cellStyle)
    }

    /**
     * Converts visual style to cell style
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
