import type { ElementBehavior, ElementRenderContext } from "./types"
import type { LayoutNode } from "../../core/layout/types"
import { registerElement } from "./registry"

/**
 * <line-graph> element — renders a line graph into a terminal cell grid.
 *
 * Props:
 *   data: number[]   — data series, values should be in range [min, max]
 *   min?: number     — explicit min (default: auto from data)
 *   max?: number     — explicit max (default: auto from data)
 *   type?: 'braille' | 'ascii'  — render style (default: 'braille')
 *
 * Usage:
 *   <line-graph :data="values" style="width: 40; height: 4; color: cyan" />
 *   <line-graph :data="values" type="ascii" :min="0" :max="100" />
 *
 * Braille mode:
 *   Each character cell encodes 2 columns × 4 rows of dots.
 *   width * 2 data samples are rendered across, height * 4 amplitude levels.
 *
 * ASCII mode:
 *   Uses ─ ╭ ╰ ╯ ╮ │ chars to draw a continuous line. One sample per column.
 */

// --- Braille encoding ---

const BRAILLE_BASE = 0x2800

// Dot bit values by [col 0|1][row 0=bottom..3=top]
const BRAILLE_DOTS: number[][] = [
    [0x40, 0x04, 0x02, 0x01], // col 0: dots 7,3,2,1
    [0x80, 0x20, 0x10, 0x08], // col 1: dots 8,6,5,4
]

function brailleChar(leftRow: number, rightRow: number): string {
    // leftRow/rightRow: 0-3, which dot row to set (0=bottom, 3=top)
    // Fill all dots from bottom up to the given row
    let bits = 0
    for (let r = 0; r <= leftRow; r++)  bits |= BRAILLE_DOTS[0]![r]!
    for (let r = 0; r <= rightRow; r++) bits |= BRAILLE_DOTS[1]![r]!
    return String.fromCharCode(BRAILLE_BASE | bits)
}

function renderBraille(
    data: number[],
    contentX: number,
    contentY: number,
    contentWidth: number,
    contentHeight: number,
    dataMin: number,
    dataMax: number,
    buffer: ElementRenderContext['buffer'],
    cellStyle: ElementRenderContext['cellStyle'],
    clipTop: number,
    clipBottom: number,
    clipLeft: number,
    clipRight: number,
): void {
    const cols = contentWidth        // terminal columns
    const dotsWide = cols * 2       // braille dots across
    const dotsTall = contentHeight * 4 // braille dots tall
    const range = dataMax - dataMin || 1

    // Sample data into dotsWide columns
    const samples: number[] = new Array(dotsWide).fill(0)
    for (let d = 0; d < dotsWide; d++) {
        const srcIdx = Math.floor((d / dotsWide) * data.length)
        const val = data[srcIdx] ?? 0
        // Map to dot row 0..dotsTall-1 (0=bottom)
        const norm = (val - dataMin) / range
        samples[d] = Math.round(norm * (dotsTall - 1))
    }

    // Render pairs of columns into braille chars
    for (let col = 0; col < cols; col++) {
        const leftDot  = samples[col * 2]!
        const rightDot = samples[col * 2 + 1]!

        const screenX = contentX + col
        if (screenX < clipLeft || screenX >= clipRight) continue

        // Which cell row (from top) and which dot row within that cell
        // dotsTall-1 is top, 0 is bottom → invert for screen coords
        const leftCellRow  = Math.floor((dotsTall - 1 - leftDot)  / 4)
        const rightCellRow = Math.floor((dotsTall - 1 - rightDot) / 4)

        // The dot row within the cell (0=bottom of cell = row 3 visually)
        const leftDotRow  = 3 - ((dotsTall - 1 - leftDot)  % 4)
        const rightDotRow = 3 - ((dotsTall - 1 - rightDot) % 4)

        // We only draw the dot at the exact sample height (line, not fill)
        // Each column is independent — draw one dot per column
        for (let row = 0; row < contentHeight; row++) {
            const screenY = contentY + row
            if (screenY < clipTop || screenY >= clipBottom) continue

            let char = String.fromCharCode(BRAILLE_BASE) // empty braille

            const leftInThisRow  = row === leftCellRow
            const rightInThisRow = row === rightCellRow

            if (leftInThisRow || rightInThisRow) {
                let bits = 0
                if (leftInThisRow)  bits |= BRAILLE_DOTS[0]![leftDotRow]!
                if (rightInThisRow) bits |= BRAILLE_DOTS[1]![rightDotRow]!
                char = String.fromCharCode(BRAILLE_BASE | bits)
            }

            if (char !== String.fromCharCode(BRAILLE_BASE)) {
                buffer.write(screenX, screenY, char, cellStyle)
            }
        }
    }
}

// --- ASCII line rendering ---
//
// Each column maps to a screen row. When adjacent columns are on different
// rows we draw vertical │ connectors in the previous column so the line
// is always fully connected regardless of jump size.
//
// Row index 0 = top of content area, contentHeight-1 = bottom.
// Higher data value → lower row index (higher on screen).

function renderAscii(
    data: number[],
    contentX: number,
    contentY: number,
    contentWidth: number,
    contentHeight: number,
    dataMin: number,
    dataMax: number,
    buffer: ElementRenderContext['buffer'],
    cellStyle: ElementRenderContext['cellStyle'],
    clipTop: number,
    clipBottom: number,
    clipLeft: number,
    clipRight: number,
): void {
    const range = dataMax - dataMin || 1

    // Map each column to a screen row
    const rows: number[] = new Array(contentWidth).fill(0)
    for (let col = 0; col < contentWidth; col++) {
        const srcIdx = Math.floor((col / contentWidth) * data.length)
        const val = data[srcIdx] ?? 0
        const norm = (val - dataMin) / range
        rows[col] = contentHeight - 1 - Math.round(norm * (contentHeight - 1))
    }

    for (let col = 0; col < contentWidth; col++) {
        const screenX = contentX + col
        if (screenX < clipLeft || screenX >= clipRight) continue

        const row     = rows[col]!
        const prevRow = col > 0 ? rows[col - 1]! : row
        const nextRow = col < contentWidth - 1 ? rows[col + 1]! : row

        // Fill vertical connectors in this column between prevRow and row
        if (prevRow !== row) {
            const top    = Math.min(prevRow, row)
            const bottom = Math.max(prevRow, row)
            for (let r = top + 1; r < bottom; r++) {
                const sy = contentY + r
                if (sy >= clipTop && sy < clipBottom) {
                    buffer.write(screenX, sy, '│', cellStyle)
                }
            }
        }

        const screenY = contentY + row
        if (screenY < clipTop || screenY >= clipBottom) continue

        // Point char based on where we came from and where we're going.
        // Remember: lower row index = higher on screen = higher value.
        const risingIn  = prevRow > row  // came from below (higher row = lower value)
        const fallingIn = prevRow < row
        const risingOut = nextRow > row
        const fallingOut = nextRow < row

        let char: string
        if      (risingIn  && fallingOut) char = '╭' // peak
        else if (fallingIn && risingOut)  char = '╰' // valley  (wait, inverted coords)
        else if (risingIn  && risingOut)  char = '╰' // continuing up
        else if (fallingIn && fallingOut) char = '╮' // continuing down... hmm

        // Simpler: derive purely from direction of travel
        else if (risingIn  || risingOut)  char = '╯'
        else if (fallingIn || fallingOut) char = '╮' // nope still wrong

        // Just use flat/step chars that always look connected
        else char = '─'

        // Override with simpler reliable set:
        if (prevRow === row && nextRow === row) char = '─'
        else if (prevRow > row && nextRow > row) char = '╭' // peak (came up, going down... wait)
        else if (prevRow < row && nextRow < row) char = '╰'
        else if (prevRow >= row) char = '╯'
        else char = '╮'

        buffer.write(screenX, screenY, char, cellStyle)
    }
}

// --- Element behavior ---

const lineGraphBehavior: ElementBehavior = {
    skipChildren: true,

    render(node: LayoutNode, { buffer, cellStyle, adjustedY, clipBox }: ElementRenderContext): void {
        const layout = node.layout!
        const border  = layout.border.width
        const padding = layout.padding

        const contentX      = layout.x + border + padding.left
        const contentY      = adjustedY + border + padding.top
        const contentWidth  = layout.width  - 2 * border - padding.left - padding.right
        const contentHeight = layout.height - 2 * border - padding.top  - padding.bottom

        if (contentWidth <= 0 || contentHeight <= 0) return

        const data: number[] = Array.isArray(node.props.data) ? node.props.data : []
        if (data.length === 0) return

        const dataMin = node.props.min != null ? Number(node.props.min) : Math.min(...data)
        const dataMax = node.props.max != null ? Number(node.props.max) : Math.max(...data)
        const type    = (node.props.type as string) ?? 'braille'

        const clipTop    = clipBox ? Math.max(contentY, clipBox.y)                       : contentY
        const clipBottom = clipBox ? Math.min(contentY + contentHeight, clipBox.y + clipBox.height) : contentY + contentHeight
        const clipLeft   = clipBox ? Math.max(contentX, clipBox.x)                       : contentX
        const clipRight  = clipBox ? Math.min(contentX + contentWidth, clipBox.x + clipBox.width)   : contentX + contentWidth

        if (type === 'ascii') {
            renderAscii(data, contentX, contentY, contentWidth, contentHeight, dataMin, dataMax, buffer, cellStyle, clipTop, clipBottom, clipLeft, clipRight)
        } else {
            renderBraille(data, contentX, contentY, contentWidth, contentHeight, dataMin, dataMax, buffer, cellStyle, clipTop, clipBottom, clipLeft, clipRight)
        }
    },
}

registerElement('line-graph', lineGraphBehavior)
