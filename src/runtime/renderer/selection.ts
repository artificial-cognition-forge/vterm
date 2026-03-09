/**
 * SelectionManager — tracks mouse-drag text selection in screen coordinates.
 *
 * Operates entirely in (column, row) space — no dependency on the layout tree.
 * The buffer renderer calls applyHighlight() after its normal render pass so
 * the selection overlay sits on top of all content.
 *
 * Linear selection model:
 *   - First row: from anchor.x to the right edge
 *   - Middle rows: full width
 *   - Last row: from left edge to active.x
 */

import type { ScreenBuffer } from '../terminal/buffer'
import type { MouseEvent } from '../terminal/input'
import type { SelectionConfig } from '../../types/types'

// ---------------------------------------------------------------------------
// Color blending helpers
// ---------------------------------------------------------------------------

type RGB = [number, number, number]

/** Approximate RGB values for the 16 ANSI named terminal colors */
const NAMED_COLOR_RGB: Record<string, RGB> = {
    black:          [0,   0,   0],
    red:            [204, 0,   0],
    green:          [0,   204, 0],
    yellow:         [204, 204, 0],
    blue:           [0,   0,   204],
    magenta:        [204, 0,   204],
    cyan:           [0,   204, 204],
    white:          [204, 204, 204],
    grey:           [128, 128, 128],
    gray:           [128, 128, 128],
    brightblack:    [85,  85,  85],
    brightred:      [255, 85,  85],
    brightgreen:    [85,  255, 85],
    brightyellow:   [255, 255, 85],
    brightblue:     [85,  85,  255],
    brightmagenta:  [255, 85,  255],
    brightcyan:     [85,  255, 255],
    brightwhite:    [255, 255, 255],
}

/** Fallback when cell has no background: typical dark terminal background */
const DEFAULT_BG_RGB: RGB = [30, 30, 30]

function hexToRgb(hex: string): RGB | null {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return m ? [parseInt(m[1]!, 16), parseInt(m[2]!, 16), parseInt(m[3]!, 16)] : null
}

function rgbToHex([r, g, b]: RGB): string {
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function resolveColor(color: string | null): RGB {
    if (!color) return DEFAULT_BG_RGB
    if (color.startsWith('#')) return hexToRgb(color) ?? DEFAULT_BG_RGB
    return NAMED_COLOR_RGB[color.toLowerCase()] ?? DEFAULT_BG_RGB
}

function blend(base: RGB, overlay: RGB, opacity: number): RGB {
    const t = Math.max(0, Math.min(1, opacity))
    return [
        Math.round(base[0] * (1 - t) + overlay[0] * t),
        Math.round(base[1] * (1 - t) + overlay[1] * t),
        Math.round(base[2] * (1 - t) + overlay[2] * t),
    ]
}

export interface SelectionPoint {
    x: number
    y: number
}

export interface NormalizedSelection {
    start: SelectionPoint
    end: SelectionPoint
}

export class SelectionManager {
    private anchor: SelectionPoint | null = null
    private active: SelectionPoint | null = null
    private dragging = false
    private onChanged?: () => void
    private selectionRgb: RGB
    private selectionOpacity: number

    constructor(onChanged?: () => void, config?: SelectionConfig) {
        this.onChanged = onChanged
        const rawColor = config?.color ?? '#4a7bc4'
        this.selectionRgb = resolveColor(rawColor)
        this.selectionOpacity = config?.opacity ?? 0.4
    }

    /**
     * Forward a mouse event into the selection state machine.
     * Only left-button events participate in selection.
     */
    handleMouseEvent(event: MouseEvent): void {
        switch (event.type) {
            case 'mousedown':
                if (event.button === 'left') {
                    // Start a new selection — clear any previous one
                    this.anchor = { x: event.x, y: event.y }
                    this.active = null
                    this.dragging = true
                    this.onChanged?.()
                }
                break

            case 'mousemove':
                if (this.dragging && this.anchor) {
                    this.active = { x: event.x, y: event.y }
                    this.onChanged?.()
                }
                break

            case 'mouseup':
                if (this.dragging) {
                    this.dragging = false
                    if (this.anchor && this.active) {
                        // Finalize drag (even same-position drag = single-cell selection)
                        this.onChanged?.()
                    } else {
                        // Plain click (mousedown + mouseup with no mousemove) — clear selection
                        this.anchor = null
                        this.active = null
                        this.onChanged?.()
                    }
                }
                break
        }
    }

    /**
     * Returns true when there is a visible selection (anchor and active both set).
     */
    hasSelection(): boolean {
        return this.anchor !== null && this.active !== null
    }

    /**
     * Returns true while the user is actively dragging (mousedown held, no mouseup yet).
     */
    isDragging(): boolean {
        return this.dragging
    }

    /**
     * Returns the normalized selection with start always before end in reading order.
     * Returns null when no selection exists.
     */
    getNormalized(): NormalizedSelection | null {
        if (!this.anchor || !this.active) return null

        const a = this.anchor
        const b = this.active

        // Order by reading position (top-left → bottom-right)
        if (a.y < b.y || (a.y === b.y && a.x <= b.x)) {
            return { start: a, end: b }
        }
        return { start: b, end: a }
    }

    /**
     * Returns true if the cell at (x, y) falls within the current selection.
     * Uses linear selection: partial first/last rows, full middle rows.
     */
    isSelected(x: number, y: number): boolean {
        const sel = this.getNormalized()
        if (!sel) return false

        const { start, end } = sel

        if (y < start.y || y > end.y) return false

        if (start.y === end.y) {
            return x >= start.x && x <= end.x
        }

        if (y === start.y) return x >= start.x
        if (y === end.y) return x <= end.x
        return true // middle rows are fully selected
    }

    /**
     * Extracts the selected text from the given buffer.
     * Trailing whitespace is trimmed from each line (terminal lines are space-padded).
     */
    getSelectedText(buffer: ScreenBuffer): string {
        const sel = this.getNormalized()
        if (!sel) return ''

        const lines: string[] = []

        for (let y = sel.start.y; y <= sel.end.y; y++) {
            const fullLine = buffer.getLine(y)
            let startX: number
            let endX: number

            if (sel.start.y === sel.end.y) {
                startX = sel.start.x
                endX = sel.end.x + 1
            } else if (y === sel.start.y) {
                startX = sel.start.x
                endX = fullLine.length
            } else if (y === sel.end.y) {
                startX = 0
                endX = sel.end.x + 1
            } else {
                startX = 0
                endX = fullLine.length
            }

            lines.push(fullLine.slice(startX, endX).trimEnd())
        }

        return lines.join('\n')
    }

    /**
     * Applies the selection highlight to the buffer by alpha-blending the cell's
     * background with the configured selection color. Called by BufferRenderer
     * after its normal render pass.
     */
    applyHighlight(buffer: ScreenBuffer): void {
        const sel = this.getNormalized()
        if (!sel) return

        for (let y = sel.start.y; y <= sel.end.y; y++) {
            if (y < 0 || y >= buffer.height) continue

            let startX: number
            let endX: number

            if (sel.start.y === sel.end.y) {
                startX = sel.start.x
                endX = sel.end.x
            } else if (y === sel.start.y) {
                startX = sel.start.x
                endX = buffer.width - 1
            } else if (y === sel.end.y) {
                startX = 0
                endX = sel.end.x
            } else {
                startX = 0
                endX = buffer.width - 1
            }

            for (let x = startX; x <= endX; x++) {
                if (x < 0 || x >= buffer.width) continue
                const cell = buffer.getCell(x, y)
                if (!cell) continue
                const bgRgb = resolveColor(cell.background)
                const blended = blend(bgRgb, this.selectionRgb, this.selectionOpacity)
                buffer.writeCell(x, y, { ...cell, background: rgbToHex(blended) })
            }
        }
    }

    /**
     * Copies the selected text to the system clipboard via OSC 52.
     * OSC 52 is supported by most modern terminal emulators (kitty, iTerm2,
     * Windows Terminal, tmux with set-clipboard, etc.).
     */
    copyToClipboard(buffer: ScreenBuffer): void {
        const text = this.getSelectedText(buffer)
        if (!text) return
        const encoded = Buffer.from(text).toString('base64')
        process.stdout.write(`\x1b]52;c;${encoded}\x07`)
    }

    /**
     * Clears the current selection.
     */
    clearSelection(): void {
        this.anchor = null
        this.active = null
        this.dragging = false
    }
}
