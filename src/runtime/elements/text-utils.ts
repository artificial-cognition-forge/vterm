/**
 * Shared text editing utilities used by textarea and editor elements.
 */

/**
 * Visual line with wrapping info.
 */
export interface VisualLine {
    text: string      // displayable text (does not include the \n)
    startPos: number  // flat offset in the full value string
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
    for (const hardLine of hardLines) {
        if (hardLine.length === 0) {
            result.push({ text: '', startPos: flatPos })
        } else {
            let offset = 0
            while (offset < hardLine.length) {
                result.push({
                    text: hardLine.slice(offset, offset + width),
                    startPos: flatPos + offset,
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
