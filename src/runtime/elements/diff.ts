import type { ElementBehavior, ElementRenderContext } from './types'
import type { LayoutNode } from '../../core/layout/types'
import type { KeyEvent, MouseEvent } from '../terminal/input'
import { registerElement } from './registry'
import { getHighlightedLines } from './highlighter'
import type { HighlightedLine } from './highlighter'

// ---------------------------------------------------------------------------
// Myers diff algorithm — line-level LCS-based diff
// ---------------------------------------------------------------------------

type DiffOp = { type: 'equal' | 'insert' | 'delete'; line: string }

function computeDiff(before: string[], after: string[]): DiffOp[] {
    const n = before.length
    const m = after.length
    const max = n + m

    // V[k] stores the furthest-reaching x in diagonal k
    const v: number[] = new Array(2 * max + 1).fill(0)
    const trace: number[][] = []

    outer:
    for (let d = 0; d <= max; d++) {
        trace.push(v.slice())
        for (let k = -d; k <= d; k += 2) {
            const idx = k + max
            let x: number
            if (k === -d || (k !== d && (v[idx - 1] ?? 0) < (v[idx + 1] ?? 0))) {
                x = v[idx + 1] ?? 0
            } else {
                x = (v[idx - 1] ?? 0) + 1
            }
            let y = x - k
            while (x < n && y < m && before[x] === after[y]) { x++; y++ }
            v[idx] = x
            if (x >= n && y >= m) break outer
        }
    }

    // Backtrack through the trace to build the edit script
    const ops: DiffOp[] = []
    let x = n
    let y = m
    for (let d = trace.length - 1; d >= 0 && (x > 0 || y > 0); d--) {
        const savedV = trace[d]!
        const k = x - y
        const idx = k + max

        let prevK: number
        if (k === -d || (k !== d && (savedV[idx - 1] ?? 0) < (savedV[idx + 1] ?? 0))) {
            prevK = k + 1
        } else {
            prevK = k - 1
        }

        const prevX = savedV[prevK + max] ?? 0
        const prevY = prevX - prevK

        while (x > prevX && y > prevY) {
            ops.unshift({ type: 'equal', line: before[x - 1]! })
            x--; y--
        }

        if (d > 0) {
            if (x === prevX) {
                ops.unshift({ type: 'insert', line: after[y - 1]! })
                y--
            } else {
                ops.unshift({ type: 'delete', line: before[x - 1]! })
                x--
            }
        }
    }

    return ops
}

// ---------------------------------------------------------------------------
// Diff line types
// ---------------------------------------------------------------------------

interface DiffLine {
    type: 'equal' | 'insert' | 'delete'
    line: string
    /** Index within the before/after array, for correct highlighting lookup */
    sourceIndex: number
}

function buildDiffLines(before: string[], after: string[]): DiffLine[] {
    const ops = computeDiff(before, after)
    const result: DiffLine[] = []
    let beforeIdx = 0
    let afterIdx = 0

    for (const op of ops) {
        if (op.type === 'equal') {
            result.push({ type: 'equal', line: op.line, sourceIndex: beforeIdx })
            beforeIdx++
            afterIdx++
        } else if (op.type === 'delete') {
            result.push({ type: 'delete', line: op.line, sourceIndex: beforeIdx })
            beforeIdx++
        } else {
            result.push({ type: 'insert', line: op.line, sourceIndex: afterIdx })
            afterIdx++
        }
    }

    return result
}

// ---------------------------------------------------------------------------
// Per-node diff state (cached between renders to avoid recomputing)
// ---------------------------------------------------------------------------

interface DiffState {
    beforeLines: string[]
    afterLines: string[]
    diffLines: DiffLine[]
}

const _diffStateCache = new WeakMap<LayoutNode, DiffState>()

function getDiffState(node: LayoutNode): DiffState {
    const beforeRaw = String(node.props.before ?? '')
    const afterRaw  = String(node.props.after ?? '')
    const beforeLines = beforeRaw === '' ? [] : beforeRaw.split('\n')
    const afterLines  = afterRaw  === '' ? [] : afterRaw.split('\n')

    const cached = _diffStateCache.get(node)
    if (cached &&
        cached.beforeLines.length === beforeLines.length &&
        cached.afterLines.length === afterLines.length &&
        cached.beforeLines.every((l, i) => l === beforeLines[i]) &&
        cached.afterLines.every((l, i) => l === afterLines[i])
    ) {
        return cached
    }

    const state: DiffState = {
        beforeLines,
        afterLines,
        diffLines: buildDiffLines(beforeLines, afterLines),
    }
    _diffStateCache.set(node, state)
    return state
}

// ---------------------------------------------------------------------------
// Color constants
// ---------------------------------------------------------------------------

// Muted red/green backgrounds to not clash with syntax highlight colors
const BG_DELETE  = '#3d1515'
const BG_INSERT  = '#0d2b0d'
const FG_PREFIX_DELETE = '#ff6b6b'
const FG_PREFIX_INSERT = '#6bff6b'
const FG_PREFIX_EQUAL  = '#555555'

// ---------------------------------------------------------------------------
// Render helper: paint one diff line into the buffer
// ---------------------------------------------------------------------------

function renderDiffLine(
    bufferRef: ElementRenderContext['buffer'],
    x: number,
    y: number,
    width: number,
    prefix: string,
    lineText: string,
    highlighted: HighlightedLine[] | null,
    highlightIdx: number,
    bg: string | null,
    prefixFg: string,
    cellStyle: ElementRenderContext['cellStyle'],
    clipLeft: number,
    clipRight: number,
): void {
    // Fill the whole line with the background color first
    const lineWidth = Math.min(width, clipRight - x)
    if (lineWidth > 0 && bg) {
        bufferRef.write(x, y, ' '.repeat(lineWidth), { background: bg })
    }

    // Prefix character ('+' / '-' / ' ')
    if (x >= clipLeft && x < clipRight) {
        bufferRef.writeCell(x, y, {
            char: prefix,
            color: prefixFg,
            background: bg,
            bold: false,
            underline: false,
            italic: false,
            inverse: false,
            dim: false,
        })
    }

    // Content starting at x+2 (prefix + space)
    const contentX = x + 2
    const contentWidth = width - 2
    if (contentWidth <= 0) return

    const tokens = highlighted ? (highlighted[highlightIdx] ?? null) : null

    if (!tokens || tokens.length === 0) {
        // Plain fallback
        const text = lineText.slice(0, contentWidth)
        if (text.length > 0 && contentX < clipRight && contentX + text.length > clipLeft) {
            const sliceStart = Math.max(0, clipLeft - contentX)
            const sliceEnd   = Math.min(text.length, clipRight - contentX)
            bufferRef.write(contentX + sliceStart, y, text.slice(sliceStart, sliceEnd), {
                ...cellStyle,
                background: bg,
            })
        }
        return
    }

    // Token-by-token render
    let colX = contentX
    for (const token of tokens) {
        const tokenEnd = colX + token.content.length
        if (tokenEnd <= clipLeft) { colX = tokenEnd; continue }
        if (colX >= clipRight || colX >= contentX + contentWidth) break

        const sliceStart = Math.max(0, clipLeft - colX)
        const sliceEnd   = Math.min(token.content.length, clipRight - colX, contentX + contentWidth - colX)
        const text = token.content.slice(sliceStart, sliceEnd)

        if (text.length > 0) {
            bufferRef.write(colX + sliceStart, y, text, {
                ...cellStyle,
                color: token.color ?? cellStyle.color,
                bold:      token.bold      || (cellStyle.bold      ?? false),
                underline: token.underline || (cellStyle.underline ?? false),
                italic:    token.italic,
                background: bg,
            })
        }

        colX = tokenEnd
    }
}

// ---------------------------------------------------------------------------
// Element behavior
// ---------------------------------------------------------------------------

const diffBehavior: ElementBehavior = {
    skipChildren: true,

    handleKey(node: LayoutNode, key: KeyEvent, requestRender: () => void): void {
        // Scroll with arrow keys / j/k / page up-down
        if (!node.layout) return

        const state = getDiffState(node)
        const totalLines = state.diffLines.length

        const border = node.layout.border.width
        const padding = node.layout.padding
        const contentHeight = node.layout.height - 2 * border - padding.top - padding.bottom

        const scrollY = node.scrollY ?? 0
        const maxScroll = Math.max(0, totalLines - contentHeight)

        let newScroll = scrollY
        if (key.name === 'up'   || key.name === 'k') newScroll = Math.max(0, scrollY - 1)
        else if (key.name === 'down' || key.name === 'j') newScroll = Math.min(maxScroll, scrollY + 1)
        else if (key.name === 'pageup')   newScroll = Math.max(0, scrollY - contentHeight)
        else if (key.name === 'pagedown') newScroll = Math.min(maxScroll, scrollY + contentHeight)
        else if (key.name === 'home' || key.name === 'g') newScroll = 0
        else if (key.name === 'end'  || key.name === 'G') newScroll = maxScroll

        if (newScroll !== scrollY) {
            node.scrollY = newScroll
            requestRender()
        }
    },

    handleMouseDown(node: LayoutNode, _event: MouseEvent, _requestRender: () => void): void {
        // Focus on click (handled by interaction layer)
    },

    render(node: LayoutNode, { buffer, cellStyle, adjustedY, clipBox }: ElementRenderContext): void {
        const layout = node.layout!
        const border = layout.border.width
        const padding = layout.padding

        const contentX      = layout.x + border + padding.left
        const contentY      = adjustedY + border + padding.top
        const contentWidth  = layout.width  - 2 * border - padding.left - padding.right
        const contentHeight = layout.height - 2 * border - padding.top  - padding.bottom

        if (contentWidth <= 0 || contentHeight <= 0) return

        const { beforeLines, afterLines, diffLines } = getDiffState(node)

        node.contentHeight = diffLines.length

        // Scrolling
        const scrollY = node.scrollY ?? 0

        // Clip bounds
        const clipTop    = clipBox ? Math.max(contentY, clipBox.y) : contentY
        const clipBottom = clipBox ? Math.min(contentY + contentHeight, clipBox.y + clipBox.height) : contentY + contentHeight
        const clipLeft   = clipBox ? Math.max(contentX, clipBox.x) : contentX
        const clipRight  = clipBox ? Math.min(contentX + contentWidth, clipBox.x + clipBox.width) : contentX + contentWidth

        const lang = String(node.props.lang ?? node.props.language ?? 'text')

        // Get highlighted lines for before and after independently
        const beforeCode = beforeLines.join('\n')
        const afterCode  = afterLines.join('\n')
        const beforeHighlighted = beforeCode ? getHighlightedLines(beforeCode, lang) : []
        const afterHighlighted  = afterCode  ? getHighlightedLines(afterCode,  lang) : []

        for (let i = 0; i < contentHeight; i++) {
            const screenY = contentY + i
            if (screenY < clipTop || screenY >= clipBottom) continue
            if (screenY >= buffer.height) break

            const dl = diffLines[scrollY + i]
            if (!dl) {
                // Empty line below content
                buffer.write(contentX, screenY, ' '.repeat(Math.max(0, clipRight - contentX)), cellStyle)
                continue
            }

            let prefix: string
            let bg: string | null
            let prefixFg: string
            let highlighted: HighlightedLine[] | null
            let highlightIdx: number

            if (dl.type === 'delete') {
                prefix     = '-'
                bg         = BG_DELETE
                prefixFg   = FG_PREFIX_DELETE
                highlighted = beforeHighlighted
                highlightIdx = dl.sourceIndex
            } else if (dl.type === 'insert') {
                prefix     = '+'
                bg         = BG_INSERT
                prefixFg   = FG_PREFIX_INSERT
                highlighted = afterHighlighted
                highlightIdx = dl.sourceIndex
            } else {
                prefix     = ' '
                bg         = null
                prefixFg   = FG_PREFIX_EQUAL
                highlighted = beforeHighlighted
                highlightIdx = dl.sourceIndex
            }

            renderDiffLine(
                buffer,
                contentX,
                screenY,
                contentWidth,
                prefix,
                dl.line,
                highlighted,
                highlightIdx,
                bg,
                prefixFg,
                cellStyle,
                clipLeft,
                clipRight,
            )
        }
    },
}

registerElement('diff', diffBehavior)
