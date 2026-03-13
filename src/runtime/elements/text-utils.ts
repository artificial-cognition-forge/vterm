/**
 * Shared text editing utilities used by input, textarea and editor elements.
 */

import type { LayoutNode } from '../../core/layout/types'

// ---------------------------------------------------------------------------
// Node value / event helpers (identical in all three input elements)
// ---------------------------------------------------------------------------

/**
 * Returns the current string value for an input-like node.
 * Reads internal state first, then falls back to the `value` / `modelValue` prop.
 */
export function getNodeValue(node: LayoutNode): string {
    return node._inputValue ?? String(node.props.value ?? node.props.modelValue ?? '')
}

/**
 * Fires the `update:modelvalue` event so v-model stays in sync.
 */
export function emitNodeUpdate(node: LayoutNode): void {
    const handler = node.events.get('update:modelvalue')
    if (handler) handler(node._inputValue!)
}

// ---------------------------------------------------------------------------
// Content geometry (calculated identically across all three elements)
// ---------------------------------------------------------------------------

export interface ContentGeometry {
    contentX: number
    contentY: number
    contentWidth: number
    contentHeight: number
}

/**
 * Derive content area geometry from a layout node, using the raw layout.y
 * as the vertical origin.  For elements that receive an `adjustedY` from the
 * renderer (textarea, editor inside a scrolled parent) use
 * `getAdjustedContentGeometry` instead.
 */
export function getContentGeometry(node: LayoutNode): ContentGeometry {
    const layout = node.layout!
    const border = layout.border.width
    const { padding } = layout
    return {
        contentX:      layout.x + border + padding.left,
        contentY:      layout.y + border + padding.top,
        contentWidth:  layout.width  - 2 * border - padding.left - padding.right,
        contentHeight: layout.height - 2 * border - padding.top  - padding.bottom,
    }
}

/**
 * Like `getContentGeometry` but uses an explicit `adjustedY` for the vertical
 * origin — necessary when the node is inside a scrolled parent.
 */
export function getAdjustedContentGeometry(node: LayoutNode, adjustedY: number): ContentGeometry {
    const layout = node.layout!
    const border = layout.border.width
    const { padding } = layout
    return {
        contentX:      layout.x + border + padding.left,
        contentY:      adjustedY + border + padding.top,
        contentWidth:  layout.width  - 2 * border - padding.left - padding.right,
        contentHeight: layout.height - 2 * border - padding.top  - padding.bottom,
    }
}

// ---------------------------------------------------------------------------
// Pure string mutation helpers
// ---------------------------------------------------------------------------

/**
 * Insert `text` at `cursor` inside `value`.
 * If `selStart !== selEnd` the selection is replaced first.
 * Returns the new value and resulting cursor position.
 */
export function insertText(
    value: string,
    cursor: number,
    text: string,
    selStart = cursor,
    selEnd = cursor,
): { value: string; cursor: number } {
    if (selStart !== selEnd) {
        const s = Math.min(selStart, selEnd)
        const e = Math.max(selStart, selEnd)
        const next = value.slice(0, s) + text + value.slice(e)
        return { value: next, cursor: s + text.length }
    }
    return { value: value.slice(0, cursor) + text + value.slice(cursor), cursor: cursor + text.length }
}

/**
 * Delete the range [selStart, selEnd).  If the selection is collapsed
 * (`selStart === selEnd`) this behaves like a standard backspace (removes the
 * character before `cursor`) when `forward` is false, or delete-forward when
 * `forward` is true.
 * Returns the new value and resulting cursor position.
 */
export function deleteSelection(
    value: string,
    cursor: number,
    selStart = cursor,
    selEnd = cursor,
    forward = false,
): { value: string; cursor: number } {
    if (selStart !== selEnd) {
        const s = Math.min(selStart, selEnd)
        const e = Math.max(selStart, selEnd)
        return { value: value.slice(0, s) + value.slice(e), cursor: s }
    }
    if (forward) {
        if (cursor >= value.length) return { value, cursor }
        return { value: value.slice(0, cursor) + value.slice(cursor + 1), cursor }
    }
    if (cursor <= 0) return { value, cursor }
    return { value: value.slice(0, cursor - 1) + value.slice(cursor), cursor: cursor - 1 }
}

/**
 * Visual line with wrapping info.
 */
export interface VisualLine {
    text: string      // displayable text (does not include the \n)
    startPos: number  // flat offset in the full value string
    hardLine: number  // index of the hard (newline-delimited) line this wraps from
}

/**
 * Split value into visual lines based on content width.
 * Respects hard newlines and soft-wraps long lines at width boundary.
 */
export function buildVisualLines(value: string, width: number): VisualLine[] {
    if (width <= 0) return []
    const result: VisualLine[] = []
    const hardLines = value.split('\n')
    let flatPos = 0
    for (let h = 0; h < hardLines.length; h++) {
        const hardLine = hardLines[h]!
        if (hardLine.length === 0) {
            result.push({ text: '', startPos: flatPos, hardLine: h })
        } else {
            let offset = 0
            while (offset < hardLine.length) {
                result.push({
                    text: hardLine.slice(offset, offset + width),
                    startPos: flatPos + offset,
                    hardLine: h,
                })
                offset += width
            }
        }
        flatPos += hardLine.length + 1 // +1 for '\n'
    }
    return result
}

/**
 * Get the visual line and column for a flat cursor position.
 */
export function getVisualPos(visualLines: VisualLine[], flatPos: number): { vLine: number; col: number } {
    for (let i = visualLines.length - 1; i >= 0; i--) {
        if (flatPos >= visualLines[i]!.startPos) {
            return { vLine: i, col: flatPos - visualLines[i]!.startPos }
        }
    }
    return { vLine: 0, col: 0 }
}

/**
 * Compute {line, col} from a flat cursor offset within a multi-line string.
 * Used for hard-line navigation (when wrapping is not available).
 */
export function getCursorLineCol(value: string, cursorPos: number): { line: number; col: number } {
    const before = value.slice(0, cursorPos)
    const lines = before.split('\n')
    return {
        line: lines.length - 1,
        col: (lines[lines.length - 1] ?? '').length,
    }
}

/**
 * Convert {line, col} back to a flat cursor offset.
 * Clamps col to the target line's length.
 */
export function getFlatPos(lines: string[], targetLine: number, targetCol: number): number {
    const clampedLine = Math.max(0, Math.min(targetLine, lines.length - 1))
    let pos = 0
    for (let i = 0; i < clampedLine; i++) {
        pos += (lines[i]?.length ?? 0) + 1 // +1 for \n
    }
    pos += Math.min(targetCol, lines[clampedLine]?.length ?? 0)
    return pos
}

/**
 * Find the nearest word boundary from pos in the given direction.
 */
export function findWordBoundary(text: string, pos: number, direction: 'left' | 'right'): number {
    if (direction === 'left') {
        if (pos <= 0) return 0
        let i = pos - 1
        while (i >= 0 && !/\w/.test(text[i]!)) i--
        while (i >= 0 && /\w/.test(text[i]!)) i--
        return i + 1
    } else {
        if (pos >= text.length) return text.length
        let i = pos
        while (i < text.length && /\w/.test(text[i]!)) i++
        while (i < text.length && !/\w/.test(text[i]!)) i++
        return i
    }
}
