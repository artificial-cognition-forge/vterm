import type { ElementBehavior, ElementRenderContext } from "./types"
import type { LayoutNode } from "../../core/layout/types"
import { registerElement } from "./registry"
import { getHighlightedLines } from "./highlighter"

// Optional: indicate module load in debug mode
if (
    typeof process !== "undefined" &&
    (process.env?.VT_CODE_DEBUG === "1" || process.env?.VT_CODE_DEBUG === "true")
) {
    // eslint-disable-next-line no-console
    console.debug("[VT_CODE_DEBUG] code element module loaded")
}

/**
 * Recursively collect all text content from a node's subtree.
 * Falls back to node.content for nodes with no children (handles
 * the setElementText path where Vue sets content directly on the element).
 */
function collectText(node: LayoutNode): string {
    const anyNode = node as any
    // 1) Direct text nodes
    if (anyNode?.type === "text" && typeof anyNode?.content === "string") {
        return anyNode.content
    }

    // 2) Common explicit text-like fields on the node
    if (typeof anyNode?.text === "string") return anyNode.text
    if (typeof anyNode?.textContent === "string") return anyNode.textContent
    if (typeof anyNode?.value === "string") return anyNode.value
    if (typeof anyNode?.content === "string") return anyNode.content
    if (anyNode?.props?.modelValue != null) return String(anyNode.props.modelValue)

    // 3) Recurse into children if they exist
    if (Array.isArray(node.children) && node.children.length > 0) {
        return node.children.map(collectText).join("")
    }

    // 4) Any other common fallbacks
    // Some render paths expose text on the root as `text` or `textContent`.
    if (typeof anyNode?.text === "string") return anyNode.text

    // 5) Final fallback
    return ""
}

/**
 * Strip leading/trailing blank lines and remove common leading indentation.
 */
function normalizeCode(raw: string): string {
    const lines = raw.split("\n")

    // Remove leading/trailing blank lines
    while (lines.length > 0 && lines[0]!.trim() === "") lines.shift()
    while (lines.length > 0 && lines[lines.length - 1]!.trim() === "") lines.pop()

    if (lines.length === 0) return ""

    // Find minimum leading whitespace across non-empty lines.
    // When the first line is flush-left (indent=0) but subsequent lines are indented,
    // we still want to dedent by the smallest *non-zero* indent so template
    // indentation is stripped without altering real code indentation.
    let minIndent = Infinity
    let minNonZeroIndent = Infinity
    for (const line of lines) {
        if (line.trim().length === 0) continue
        const indent = line.match(/^[ \t]*/)?.[0]?.length ?? 0
        if (indent < minIndent) minIndent = indent
        if (indent > 0 && indent < minNonZeroIndent) minNonZeroIndent = indent
    }

    let indentToRemove = minIndent
    if (indentToRemove === 0 && minNonZeroIndent !== Infinity) {
        indentToRemove = minNonZeroIndent
    }

    if (indentToRemove === Infinity || indentToRemove <= 0) {
        return lines.join("\n")
    }

    return lines
        .map(line => {
            if (!line) return line
            const indent = line.match(/^[ \t]*/)?.[0]?.length ?? 0
            const sliceAmount = Math.min(indent, indentToRemove)
            return line.slice(sliceAmount)
        })
        .join("\n")
}

const codeBehavior: ElementBehavior = {
    // We render highlighted content directly — don't let the default path
    // paint the raw (indented, unstyled) child text nodes on top.
    skipChildren: true,

    render(node: LayoutNode, { buffer, cellStyle, adjustedY, clipBox }: ElementRenderContext): void {
        const layout = node.layout!
        // Debug: optionally dump rendering context for this code block
        if (
            typeof process !== "undefined" &&
            (process.env?.VT_CODE_DEBUG === "1" || process.env?.VT_CODE_DEBUG === "true")
        ) {
            try {
                // @ts-ignore - layout/node fields may exist in various forms
                console.debug("[VT_CODE_DEBUG] render(code):", {
                    id: (node as any).id,
                    type: node.type,
                    layout: { x: layout.x, y: layout.y, w: layout.width, h: layout.height },
                    hasChildren: node.children?.length ?? 0,
                })
            } catch {
                // ignore
            }
        }
        const border = layout.border.width
        const padding = layout.padding

        const contentX = layout.x + border + padding.left
        const contentY = adjustedY + border + padding.top
        const contentWidth = layout.width - 2 * border - padding.left - padding.right
        const contentHeight = layout.height - 2 * border - padding.top - padding.bottom

        if (contentWidth <= 0 || contentHeight <= 0) return

        const rawText = collectText(node)
        const code = normalizeCode(rawText)
        // Debug mode: render a visible marker when there's no code to display.
        const DEBUG_CODE_VIEW =
            typeof process !== "undefined" &&
            (process.env?.VT_CODE_DEBUG === "1" || process.env?.VT_CODE_DEBUG === "true")
        if (!code) {
            if (DEBUG_CODE_VIEW && contentWidth > 0 && contentHeight > 0) {
                // Draw a simple ASCII marker to show the code block exists
                const y = contentY
                buffer.write(contentX, y, "#", {
                    ...cellStyle,
                    color: "grey",
                })
            }
            return
        }

        const lang = String(node.props.lang ?? "text")
        const highlighted = getHighlightedLines(code, lang)

        // Helpers to apply the parent clip box to a screen row and column range.
        // The element clips to its own content area AND the parent's clipBox.
        const clipTop    = clipBox ? Math.max(contentY, clipBox.y) : contentY
        const clipBottom = clipBox ? Math.min(contentY + contentHeight, clipBox.y + clipBox.height) : contentY + contentHeight
        const clipLeft   = clipBox ? Math.max(contentX, clipBox.x) : contentX
        const clipRight  = clipBox ? Math.min(contentX + contentWidth, clipBox.x + clipBox.width) : contentX + contentWidth

        if (!highlighted) {
            // Highlighting in progress — render raw text, dimmed
            const lines = code.split("\n")
            for (let i = 0; i < Math.min(lines.length, contentHeight); i++) {
                const y = contentY + i
                if (y < clipTop || y >= clipBottom) continue
                if (y >= buffer.height) break

                let x = clipLeft
                const lineText = (lines[i] ?? "").slice(clipLeft - contentX, clipRight - contentX)
                if (lineText.length === 0) continue

                buffer.write(x, y, lineText, { ...cellStyle, dim: true })
            }
            return
        }

        // Render highlighted token lines
        for (let lineIdx = 0; lineIdx < Math.min(highlighted.length, contentHeight); lineIdx++) {
            const y = contentY + lineIdx
            if (y < clipTop || y >= clipBottom) continue
            if (y >= buffer.height) break

            const line = highlighted[lineIdx]!
            let x = contentX

            for (const token of line) {
                const tokenEnd = x + token.content.length
                // Token is entirely left of the visible area — skip and advance x
                if (tokenEnd <= clipLeft) { x = tokenEnd; continue }
                // Token is entirely right of the visible area — stop
                if (x >= clipRight) break

                // Slice the token to the visible x range
                const sliceStart = Math.max(0, clipLeft - x)
                const sliceEnd   = Math.min(token.content.length, clipRight - x)
                const text = token.content.slice(sliceStart, sliceEnd)

                if (text.length > 0) {
                    buffer.write(x + sliceStart, y, text, {
                        ...cellStyle,
                        color: token.color ?? cellStyle.color,
                        bold: token.bold || cellStyle.bold,
                        underline: token.underline || cellStyle.underline,
                        italic: token.italic,
                    })
                }

                x = tokenEnd
            }
        }
    },
}

registerElement("code", codeBehavior)
