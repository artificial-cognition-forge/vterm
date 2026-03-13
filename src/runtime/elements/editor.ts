import type { ElementBehavior, ElementRenderContext } from './types'
import type { LayoutNode } from '../../core/layout/types'
import type { KeyEvent, MouseEvent } from '../terminal/input'
import { registerElement } from './registry'
import { buildVisualLines, getVisualPos, getFlatPos, findWordBoundary } from './text-utils'
import { getHighlightedLines } from './highlighter'

// ---------------------------------------------------------------------------
// Auto-closing bracket/quote pairs
// ---------------------------------------------------------------------------

/** Map of opening char → closing char */
const PAIR_OPEN: Record<string, string> = {
    '(': ')',
    '[': ']',
    '{': '}',
    '"': '"',
    "'": "'",
    '`': '`',
}

/** Set of closing chars (used for skip-over) */
const PAIR_CLOSE = new Set([')', ']', '}', '"', "'", '`'])

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getValue(node: LayoutNode): string {
    return node._inputValue ?? String(node.props.value ?? node.props.modelValue ?? '')
}

function emitUpdate(node: LayoutNode): void {
    const handler = node.events.get('update:modelvalue')
    if (handler) handler(node._inputValue!)
}

function ensureState(node: LayoutNode): void {
    if (node._inputValue === undefined) {
        node._inputValue = getValue(node)
        node._cursorPos = node._inputValue.length
        node._prevCursorPos = node._cursorPos
        node._selectionStart = node._cursorPos
        node._selectionEnd = node._cursorPos
        node._editorMode = 'insert'
        node._editorYankBuffer = ''
        node._editorPendingKey = ''
        node._editorStickyCol = undefined
        node._editorDragActive = false
        node._editorSelAnchor = node._cursorPos
    }
}

function getIndentSize(node: LayoutNode): number {
    const raw = node.props.indent
    const n = typeof raw === 'number' ? raw : parseInt(String(raw ?? '2'), 10)
    return isNaN(n) || n < 1 ? 2 : n
}

function isVimMode(node: LayoutNode): boolean {
    return node.props.vimMode === true || node.props.vimmode === true
}

/** Leading whitespace of the line containing pos. */
function getLineIndent(val: string, pos: number): string {
    const lineStart = val.lastIndexOf('\n', pos - 1) + 1
    return val.slice(lineStart).match(/^[ \t]*/)?.[0] ?? ''
}

/** Flat offset of the start of the line containing pos. */
function getLineStart(val: string, pos: number): number {
    return val.lastIndexOf('\n', pos - 1) + 1
}

/** Flat offset of the first non-whitespace char on the line containing pos. */
function getLineFirstNonWS(val: string, pos: number): number {
    const start = getLineStart(val, pos)
    const rest = val.slice(start)
    const m = rest.match(/^[ \t]*/)
    return start + (m ? m[0].length : 0)
}

/** Flat offset of the end of the line containing pos (before the \n). */
function getLineEnd(val: string, pos: number): number {
    const next = val.indexOf('\n', pos)
    return next === -1 ? val.length : next
}

/** Hard line index and column of pos. */
function getHardLineCol(val: string, pos: number): { line: number; col: number } {
    const before = val.slice(0, pos)
    const lines = before.split('\n')
    return { line: lines.length - 1, col: (lines[lines.length - 1] ?? '').length }
}

/** Word boundaries for double-click selection — selects the word under pos. */
function getWordAt(val: string, pos: number): { start: number; end: number } {
    if (pos >= val.length || /\s/.test(val[pos]!)) {
        // On whitespace: select run of whitespace
        let s = pos, e = pos
        while (s > 0 && /\s/.test(val[s - 1]!) && val[s - 1] !== '\n') s--
        while (e < val.length && /\s/.test(val[e]!) && val[e] !== '\n') e++
        return { start: s, end: e }
    }
    const isWord = /\w/
    if (isWord.test(val[pos]!)) {
        let s = pos, e = pos
        while (s > 0 && isWord.test(val[s - 1]!)) s--
        while (e < val.length && isWord.test(val[e]!)) e++
        return { start: s, end: e }
    }
    // Punctuation — select single char
    return { start: pos, end: pos + 1 }
}

/**
 * Given a string and a position that is ON an opener or closer bracket,
 * return the position of the matching bracket, or null if not found.
 */
function findMatchingBracket(val: string, pos: number): number | null {
    const ch = val[pos]
    if (!ch) return null

    // Determine direction and matching char
    const closer = PAIR_OPEN[ch]
    if (closer && ch !== '"' && ch !== "'" && ch !== '`') {
        // Searching forward for closer
        let depth = 0
        for (let i = pos; i < val.length; i++) {
            if (val[i] === ch) depth++
            else if (val[i] === closer) {
                depth--
                if (depth === 0) return i
            }
        }
        return null
    }

    // Check if ch is a structural closer (not a quote)
    const CLOSE_TO_OPEN: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
    const opener = CLOSE_TO_OPEN[ch]
    if (opener) {
        let depth = 0
        for (let i = pos; i >= 0; i--) {
            if (val[i] === ch) depth++
            else if (val[i] === opener) {
                depth--
                if (depth === 0) return i
            }
        }
        return null
    }

    // For quotes, scan backwards first; if we find an unmatched opener, we are the closer
    if (ch === '"' || ch === "'" || ch === '`') {
        // Count same quote chars before pos to determine if we're opener or closer
        let count = 0
        for (let i = 0; i < pos; i++) {
            if (val[i] === ch) count++
        }
        if (count % 2 === 0) {
            // We are the opener — find closing quote
            for (let i = pos + 1; i < val.length; i++) {
                if (val[i] === ch) return i
            }
        } else {
            // We are the closer — find opening quote
            for (let i = pos - 1; i >= 0; i--) {
                if (val[i] === ch) return i
            }
        }
        return null
    }

    return null
}

/** Get content geometry from a node. */
function getContentGeometry(node: LayoutNode) {
    const layout = node.layout!
    const border = layout.border.width
    const { padding } = layout
    return {
        contentX: layout.x + border + padding.left,
        contentY: layout.y + border + padding.top,
        contentWidth: layout.width - 2 * border - padding.left - padding.right,
        contentHeight: layout.height - 2 * border - padding.top - padding.bottom,
    }
}

/**
 * Like getContentGeometry but uses the stored _editorAdjustedY for contentY.
 * This corrects the hit-test skew that occurs when the node is inside a scrolled
 * parent (adjustedY != layout.y).
 */
function getAdjustedContentGeometry(node: LayoutNode) {
    const geom = getContentGeometry(node)
    const layout = node.layout!
    const border = layout.border.width
    const { padding } = layout
    const adjustedY = node._editorAdjustedY ?? layout.y
    return {
        ...geom,
        contentY: adjustedY + border + padding.top,
    }
}

/** Map screen coordinates to a flat cursor position. */
function posFromMouse(node: LayoutNode, event: MouseEvent): number | null {
    if (!node.layout) return null
    const { contentX, contentY, contentWidth, contentHeight } = getAdjustedContentGeometry(node)
    if (contentWidth <= 0 || contentHeight <= 0) return null

    const val = node._inputValue ?? getValue(node)
    const visualLines = buildVisualLines(val, contentWidth)
    const scrollY = node.scrollY ?? 0

    const relY = Math.max(0, Math.min(contentHeight - 1, event.y - contentY))
    const clickedVLine = scrollY + Math.floor(relY)
    const vl = visualLines[clickedVLine]
    if (!vl) return val.length

    const relX = event.x - contentX
    const col = Math.max(0, Math.min(relX, vl.text.length))
    return vl.startPos + col
}

// ---------------------------------------------------------------------------
// Cursor movement helpers — all return the new flat position.
// They also update _editorStickyCol as appropriate.
// ---------------------------------------------------------------------------

function moveCursorUp(node: LayoutNode, val: string, pos: number, _contentWidth: number): number {
    const lines = val.split('\n')
    const { line, col } = getHardLineCol(val, pos)
    const sticky = node._editorStickyCol ?? col
    if (line === 0) { node._editorStickyCol = sticky; return 0 }
    node._editorStickyCol = sticky
    return getFlatPos(lines, line - 1, sticky)
}

function moveCursorDown(node: LayoutNode, val: string, pos: number, _contentWidth: number): number {
    const lines = val.split('\n')
    const { line, col } = getHardLineCol(val, pos)
    const sticky = node._editorStickyCol ?? col
    if (line >= lines.length - 1) { node._editorStickyCol = sticky; return val.length }
    node._editorStickyCol = sticky
    return getFlatPos(lines, line + 1, sticky)
}

/** Move cursor and clear selection. Resets sticky col unless it's a vertical move. */
function setCursor(node: LayoutNode, newPos: number, clearSticky = true): void {
    node._cursorPos = newPos
    node._selectionStart = newPos
    node._selectionEnd = newPos
    node._editorSelAnchor = newPos
    if (clearSticky) node._editorStickyCol = undefined
}

/**
 * Extend selection from anchor to newPos.
 * selStart/selEnd always reflect the ordered range; cursorPos is the moving end.
 */
function extendSelection(node: LayoutNode, newPos: number): void {
    const anchor = node._editorSelAnchor ?? node._cursorPos ?? newPos
    node._cursorPos = newPos
    node._selectionStart = Math.min(anchor, newPos)
    node._selectionEnd   = Math.max(anchor, newPos)
}

// ---------------------------------------------------------------------------
// Vim normal-mode handler
// ---------------------------------------------------------------------------

function handleVimNormal(node: LayoutNode, key: KeyEvent, requestRender: () => void): boolean {
    const val = node._inputValue!
    const pos = node._cursorPos!
    const pending = node._editorPendingKey ?? ''
    const lines = val.split('\n')
    const { line: hardLine, col: hardCol } = getHardLineCol(val, pos)

    // Enter insert mode
    if (key.name === 'i' && !key.ctrl) { node._editorMode = 'insert'; node._editorPendingKey = ''; requestRender(); return true }
    if (key.name === 'I' && !key.ctrl) {
        node._editorMode = 'insert'; node._editorPendingKey = ''
        setCursor(node, getLineStart(val, pos))
        requestRender(); return true
    }
    if (key.name === 'a' && !key.ctrl) {
        node._editorMode = 'insert'; node._editorPendingKey = ''
        setCursor(node, Math.min(val.length, pos + 1))
        requestRender(); return true
    }
    if (key.name === 'A' && !key.ctrl) {
        node._editorMode = 'insert'; node._editorPendingKey = ''
        setCursor(node, getLineEnd(val, pos))
        requestRender(); return true
    }

    // Open new line below / above
    if (key.name === 'o' && !key.ctrl) {
        node._editorMode = 'insert'; node._editorPendingKey = ''
        const lineEnd = getLineEnd(val, pos)
        const indent = getLineIndent(val, pos)
        node._inputValue = val.slice(0, lineEnd) + '\n' + indent + val.slice(lineEnd)
        setCursor(node, lineEnd + 1 + indent.length)
        emitUpdate(node); requestRender(); return true
    }
    if (key.name === 'O' && !key.ctrl) {
        node._editorMode = 'insert'; node._editorPendingKey = ''
        const lineStart = getLineStart(val, pos)
        const indent = getLineIndent(val, pos)
        node._inputValue = val.slice(0, lineStart) + indent + '\n' + val.slice(lineStart)
        setCursor(node, lineStart + indent.length)
        emitUpdate(node); requestRender(); return true
    }

    // h/j/k/l
    if (key.name === 'h' && !key.ctrl) { setCursor(node, Math.max(0, pos - 1)); node._editorPendingKey = ''; requestRender(); return true }
    if (key.name === 'l' && !key.ctrl) { setCursor(node, Math.min(val.length, pos + 1)); node._editorPendingKey = ''; requestRender(); return true }
    if (key.name === 'j' && !key.ctrl) {
        node._editorPendingKey = ''
        const newPos = hardLine < lines.length - 1 ? getFlatPos(lines, hardLine + 1, hardCol) : pos
        setCursor(node, newPos); requestRender(); return true
    }
    if (key.name === 'k' && !key.ctrl) {
        node._editorPendingKey = ''
        const newPos = hardLine > 0 ? getFlatPos(lines, hardLine - 1, hardCol) : pos
        setCursor(node, newPos); requestRender(); return true
    }

    // w / b
    if (key.name === 'w' && !key.ctrl) { setCursor(node, findWordBoundary(val, pos, 'right')); node._editorPendingKey = ''; requestRender(); return true }
    if (key.name === 'b' && !key.ctrl) { setCursor(node, findWordBoundary(val, pos, 'left')); node._editorPendingKey = ''; requestRender(); return true }

    // 0 / $
    if (key.name === '0') { setCursor(node, getLineStart(val, pos)); node._editorPendingKey = ''; requestRender(); return true }
    if (key.name === '$' || (key.shift && key.name === '4')) { setCursor(node, getLineEnd(val, pos)); node._editorPendingKey = ''; requestRender(); return true }

    // gg / G
    if (key.name === 'G' && !key.ctrl) { setCursor(node, val.length); node._editorPendingKey = ''; requestRender(); return true }
    if (key.name === 'g' && !key.ctrl) {
        if (pending === 'g') { setCursor(node, 0); node._editorPendingKey = ''; requestRender(); return true }
        node._editorPendingKey = 'g'; return true
    }

    // x — delete char
    if (key.name === 'x' && !key.ctrl) {
        if (pos < val.length && val[pos] !== '\n') {
            node._inputValue = val.slice(0, pos) + val.slice(pos + 1)
            setCursor(node, pos)
            emitUpdate(node)
        }
        node._editorPendingKey = ''; requestRender(); return true
    }

    // dd — delete line, yy — yank line
    if (key.name === 'd' && !key.ctrl) {
        if (pending === 'd') {
            const lineStart = getLineStart(val, pos), lineEnd = getLineEnd(val, pos)
            node._editorYankBuffer = val.slice(lineStart, lineEnd)
            let removeStart = lineStart, removeEnd = lineEnd
            if (removeEnd < val.length) removeEnd++
            else if (removeStart > 0) removeStart--
            node._inputValue = val.slice(0, removeStart) + val.slice(removeEnd)
            setCursor(node, Math.min(removeStart, node._inputValue.length))
            node._editorPendingKey = ''; emitUpdate(node); requestRender(); return true
        }
        node._editorPendingKey = 'd'; return true
    }
    if (key.name === 'y' && !key.ctrl) {
        if (pending === 'y') {
            node._editorYankBuffer = val.slice(getLineStart(val, pos), getLineEnd(val, pos))
            node._editorPendingKey = ''; requestRender(); return true
        }
        node._editorPendingKey = 'y'; return true
    }

    // p — paste below
    if (key.name === 'p' && !key.ctrl) {
        const yank = node._editorYankBuffer ?? ''
        if (yank.length > 0) {
            const lineEnd = getLineEnd(val, pos)
            node._inputValue = val.slice(0, lineEnd) + '\n' + yank + val.slice(lineEnd)
            setCursor(node, lineEnd + 1)
            emitUpdate(node)
        }
        node._editorPendingKey = ''; requestRender(); return true
    }

    if (key.name === 'escape') { node._editorPendingKey = ''; requestRender(); return true }

    node._editorPendingKey = ''
    return false
}

// ---------------------------------------------------------------------------
// Insert-mode key handler
// ---------------------------------------------------------------------------

function handleInsert(node: LayoutNode, key: KeyEvent, requestRender: () => void): void {
    const val = node._inputValue!
    const pos = node._cursorPos!
    const selStart = node._selectionStart ?? pos
    const selEnd   = node._selectionEnd   ?? pos
    const hasSelection = selStart !== selEnd
    const sMin = Math.min(selStart, selEnd)
    const sMax = Math.max(selStart, selEnd)
    const indentSize = getIndentSize(node)
    const lines = val.split('\n')
    const contentWidth = (() => {
        if (!node.layout) return 80
        const b = node.layout.border.width, p = node.layout.padding
        return node.layout.width - 2 * b - p.left - p.right
    })()

    // Escape → vim normal mode
    if (isVimMode(node) && key.name === 'escape') {
        node._editorMode = 'normal'
        setCursor(node, Math.max(0, pos - 1))
        requestRender(); return
    }

    // Ctrl+A — select all
    if (key.ctrl && key.name === 'a') {
        node._cursorPos = val.length
        node._selectionStart = 0
        node._selectionEnd = val.length
        node._editorSelAnchor = 0
        requestRender(); return
    }

    // Ctrl+Z — undo (stub, no-op for now — keeps key from being typed)
    if (key.ctrl && key.name === 'z') { requestRender(); return }

    // Ctrl+Left / Right — word jump (+ Shift to select)
    if (key.ctrl && (key.name === 'left' || key.name === 'right')) {
        const newPos = findWordBoundary(val, pos, key.name === 'left' ? 'left' : 'right')
        if (key.shift) {
            extendSelection(node, newPos)
        } else {
            setCursor(node, newPos)
        }
        requestRender(); return
    }

    // Arrow keys
    const isShift = key.shift ?? false
    if (key.name === 'left' || key.name === 'right' || key.name === 'up' || key.name === 'down' ||
        key.name === 'home' || key.name === 'end' || key.name === 'pageup' || key.name === 'pagedown') {

        // If selection exists and no shift, collapse to appropriate end
        if (hasSelection && !isShift) {
            if (key.name === 'left' || key.name === 'up')   { setCursor(node, sMin); node._editorStickyCol = undefined; requestRender(); return }
            if (key.name === 'right' || key.name === 'down') { setCursor(node, sMax); node._editorStickyCol = undefined; requestRender(); return }
        }

        let newPos = pos

        if (key.name === 'left')  { newPos = Math.max(0, pos - 1); node._editorStickyCol = undefined }
        else if (key.name === 'right') { newPos = Math.min(val.length, pos + 1); node._editorStickyCol = undefined }
        else if (key.name === 'up')   { newPos = moveCursorUp(node, val, pos, contentWidth) }
        else if (key.name === 'down') { newPos = moveCursorDown(node, val, pos, contentWidth) }
        else if (key.name === 'home') {
            // Smart home: first press → first non-whitespace; second press → col 0
            node._editorStickyCol = undefined
            const firstNW = getLineFirstNonWS(val, pos)
            newPos = (pos === firstNW) ? getLineStart(val, pos) : firstNW
        }
        else if (key.name === 'end') {
            node._editorStickyCol = undefined
            newPos = getLineEnd(val, pos)
        }
        else if (key.name === 'pageup') {
            node._editorStickyCol = undefined
            const { line } = getHardLineCol(val, pos)
            const pageSize = contentWidth > 0 ? Math.max(1, Math.floor(
                (node.layout ? node.layout.height - 2 * node.layout.border.width - node.layout.padding.top - node.layout.padding.bottom : 24)
            )) : 24
            newPos = getFlatPos(lines, Math.max(0, line - pageSize), getHardLineCol(val, pos).col)
        }
        else if (key.name === 'pagedown') {
            node._editorStickyCol = undefined
            const { line } = getHardLineCol(val, pos)
            const pageSize = contentWidth > 0 ? Math.max(1, Math.floor(
                (node.layout ? node.layout.height - 2 * node.layout.border.width - node.layout.padding.top - node.layout.padding.bottom : 24)
            )) : 24
            newPos = getFlatPos(lines, Math.min(lines.length - 1, line + pageSize), getHardLineCol(val, pos).col)
        }

        if (isShift) {
            if (!hasSelection) node._editorSelAnchor = pos
            extendSelection(node, newPos)
        } else {
            setCursor(node, newPos, false) // sticky col managed above per-key
        }
        requestRender(); return
    }

    // Keys that clear sticky col and modify text
    node._editorStickyCol = undefined

    if (key.name === 'backspace') {
        if (hasSelection) {
            node._inputValue = val.slice(0, sMin) + val.slice(sMax)
            setCursor(node, sMin)
        } else if (pos > 0) {
            // Smart indent backspace: if everything between the line start and cursor
            // is spaces, delete up to one indent level worth of spaces.
            const lineStart = val.lastIndexOf('\n', pos - 1) + 1
            const beforeCursor = val.slice(lineStart, pos)
            if (beforeCursor.length > 0 && /^ +$/.test(beforeCursor)) {
                const deleteCount = ((beforeCursor.length - 1) % indentSize) + 1
                node._inputValue = val.slice(0, pos - deleteCount) + val.slice(pos)
                setCursor(node, pos - deleteCount)
            } else {
                // Backspace-pair: if the char before cursor is an opener and char at cursor is its closer, delete both
                const charBefore = val[pos - 1]!
                const charAt = val[pos]
                if (charBefore && charAt && PAIR_OPEN[charBefore] === charAt) {
                    node._inputValue = val.slice(0, pos - 1) + val.slice(pos + 1)
                } else {
                    node._inputValue = val.slice(0, pos - 1) + val.slice(pos)
                }
                setCursor(node, pos - 1)
            }
        }
    } else if (key.name === 'delete') {
        if (hasSelection) {
            node._inputValue = val.slice(0, sMin) + val.slice(sMax)
            setCursor(node, sMin)
        } else if (pos < val.length) {
            node._inputValue = val.slice(0, pos) + val.slice(pos + 1)
            setCursor(node, pos)
        }
    } else if (key.name === 'tab') {
        const spaces = ' '.repeat(indentSize)
        if (hasSelection) {
            node._inputValue = val.slice(0, sMin) + spaces + val.slice(sMax)
            setCursor(node, sMin + indentSize)
        } else {
            node._inputValue = val.slice(0, pos) + spaces + val.slice(pos)
            setCursor(node, pos + indentSize)
        }
    } else if (key.name === 'enter') {
        const indent = getLineIndent(val, pos)
        const indentUnit = ' '.repeat(indentSize)
        if (hasSelection) {
            node._inputValue = val.slice(0, sMin) + '\n' + indent + val.slice(sMax)
            setCursor(node, sMin + 1 + indent.length)
        } else {
            // Check if cursor sits between a bracket pair e.g. {|} — expand it
            const OPENERS = new Set(['{', '[', '('])
            const CLOSERS: Record<string, string> = { '}': '{', ']': '[', ')': '(' }
            const charBefore = val[pos - 1]
            const charAfter  = val[pos]
            if (charBefore && charAfter && OPENERS.has(charBefore) && CLOSERS[charAfter] === charBefore) {
                // Insert: \n indent+unit | \n indent
                const inner = '\n' + indent + indentUnit
                const outer = '\n' + indent
                node._inputValue = val.slice(0, pos) + inner + outer + val.slice(pos)
                setCursor(node, pos + inner.length)
            } else {
                // Normal enter: match current indent, plus one level if line ends with an opener
                const lineUpToCursor = val.slice(val.lastIndexOf('\n', pos - 1) + 1, pos)
                const trimmed = lineUpToCursor.trimEnd()
                const endsWithOpener = trimmed.length > 0 && OPENERS.has(trimmed[trimmed.length - 1]!)
                const newIndent = endsWithOpener ? indent + indentUnit : indent
                node._inputValue = val.slice(0, pos) + '\n' + newIndent + val.slice(pos)
                setCursor(node, pos + 1 + newIndent.length)
            }
        }
    } else if (!key.ctrl && !key.meta && key.sequence && key.sequence.length === 1) {
        const ch = key.sequence
        if (hasSelection) {
            // With a selection, wrap in pair if opener; otherwise replace selection
            const closer = PAIR_OPEN[ch]
            if (closer) {
                node._inputValue = val.slice(0, sMin) + ch + val.slice(sMin, sMax) + closer + val.slice(sMax)
                setCursor(node, sMax + 2)
            } else {
                node._inputValue = val.slice(0, sMin) + ch + val.slice(sMax)
                setCursor(node, sMin + 1)
            }
        } else {
            // Skip-over: if typing a closing char that already sits at cursor, just advance
            if (PAIR_CLOSE.has(ch) && val[pos] === ch) {
                setCursor(node, pos + 1)
            } else if (PAIR_OPEN[ch]) {
                // Auto-close: insert opener + closer, leave cursor between them
                const closer = PAIR_OPEN[ch]!
                node._inputValue = val.slice(0, pos) + ch + closer + val.slice(pos)
                setCursor(node, pos + 1)
            } else {
                node._inputValue = val.slice(0, pos) + ch + val.slice(pos)
                setCursor(node, pos + 1)
            }
        }
    }

    if (node._inputValue !== val) emitUpdate(node)
    requestRender()
}

// ---------------------------------------------------------------------------
// Element behavior
// ---------------------------------------------------------------------------

const editorBehavior: ElementBehavior = {
    skipChildren: true,

    handleKey(node: LayoutNode, key: KeyEvent, requestRender: () => void): void {
        ensureState(node)
        if (isVimMode(node) && node._editorMode === 'normal') {
            handleVimNormal(node, key, requestRender)
        } else {
            handleInsert(node, key, requestRender)
        }
        node._prevCursorPos = node._cursorPos
    },

    handleMouseDown(node: LayoutNode, event: MouseEvent, requestRender: () => void): void {
        ensureState(node)
        const newPos = posFromMouse(node, event)
        if (newPos === null) return

        const now = Date.now()
        const lastTime = node._editorLastClickTime ?? 0
        const lastPos  = node._editorLastClickPos  ?? -1
        const DOUBLE_CLICK_MS = 400

        if (now - lastTime < DOUBLE_CLICK_MS && newPos === lastPos) {
            // Double-click — select word
            const { start, end } = getWordAt(node._inputValue!, newPos)
            node._cursorPos = end
            node._selectionStart = start
            node._selectionEnd   = end
            node._editorSelAnchor = start
            node._editorLastClickTime = 0 // reset so triple-click doesn't re-trigger
        } else {
            // Single click — place cursor, begin potential drag
            if (event.shift) {
                // Shift+click extends selection from anchor
                extendSelection(node, newPos)
            } else {
                setCursor(node, newPos)
            }
            node._editorLastClickTime = now
            node._editorLastClickPos  = newPos
        }

        node._editorDragActive = true
        node._editorStickyCol = undefined
        // Sync _prevCursorPos so render's auto-scroll doesn't fire for mouse-initiated cursor moves
        node._prevCursorPos = node._cursorPos
        requestRender()
    },

    handleMouseMove(node: LayoutNode, event: MouseEvent, requestRender: () => void): void {
        if (!node._editorDragActive) return
        const newPos = posFromMouse(node, event)
        if (newPos === null) return
        extendSelection(node, newPos)
        // Sync _prevCursorPos to suppress spurious auto-scroll during drag
        node._prevCursorPos = node._cursorPos
        requestRender()
    },

    handleMouseUp(node: LayoutNode, _event: MouseEvent, _requestRender: () => void): void {
        node._editorDragActive = false
    },

    handleHover(node: LayoutNode, event: MouseEvent, requestRender: () => void): void {
        ensureState(node)
        const hoverPos = posFromMouse(node, event)
        const prev = node._editorHoverPos
        node._editorHoverPos = hoverPos ?? undefined
        if (node._editorHoverPos !== prev) requestRender()
    },

    render(node: LayoutNode, { buffer, cellStyle, adjustedY, clipBox }: ElementRenderContext): void {
        const layout = node.layout!
        const border = layout.border.width
        const padding = layout.padding

        // Store adjustedY so posFromMouse / getCursorPos use the same origin as render
        node._editorAdjustedY = adjustedY

        const contentX = layout.x + border + padding.left
        const contentY = adjustedY + border + padding.top
        const contentWidth  = layout.width  - 2 * border - padding.left - padding.right
        const contentHeight = layout.height - 2 * border - padding.top  - padding.bottom

        if (contentWidth <= 0 || contentHeight <= 0) return

        const value = getValue(node)
        const cursorPos = node._cursorPos ?? value.length
        const selMin = Math.min(node._selectionStart ?? cursorPos, node._selectionEnd ?? cursorPos)
        const selMax = Math.max(node._selectionStart ?? cursorPos, node._selectionEnd ?? cursorPos)

        // Placeholder
        if (value.length === 0) {
            const placeholder = node.props.placeholder as string | undefined
            if (placeholder) {
                buffer.write(contentX, contentY, placeholder.slice(0, contentWidth).padEnd(contentWidth, ' '), { ...cellStyle, dim: true })
            }
            return
        }

        const lang = String(node.props.lang ?? 'text')
        const highlighted = getHighlightedLines(value, lang)

        const visualLines = buildVisualLines(value, contentWidth)
        const { vLine: cursorVLine } = getVisualPos(visualLines, cursorPos)

        node.contentHeight = visualLines.length

        // Auto-scroll to keep cursor visible
        let scrollY = node.scrollY ?? 0
        const prevCursorPos = node._prevCursorPos ?? cursorPos
        if (cursorPos !== prevCursorPos) {
            if (cursorVLine < scrollY) scrollY = cursorVLine
            else if (cursorVLine >= scrollY + contentHeight) scrollY = cursorVLine - contentHeight + 1
        }
        scrollY = Math.min(scrollY, Math.max(0, visualLines.length - contentHeight))
        node.scrollY = scrollY

        const clipTop    = clipBox ? Math.max(contentY, clipBox.y) : contentY
        const clipBottom = clipBox ? Math.min(contentY + contentHeight, clipBox.y + clipBox.height) : contentY + contentHeight
        const clipLeft   = clipBox ? Math.max(contentX, clipBox.x) : contentX
        const clipRight  = clipBox ? Math.min(contentX + contentWidth, clipBox.x + clipBox.width) : contentX + contentWidth

        // Bracket highlight positions
        let bracketA = -1, bracketB = -1
        const hoverPos = node._editorHoverPos
        if (hoverPos !== undefined && hoverPos >= 0 && hoverPos < value.length) {
            const ch = value[hoverPos]
            if (ch && (PAIR_OPEN[ch] || [')', ']', '}', '"', "'", '`'].includes(ch))) {
                const matched = findMatchingBracket(value, hoverPos)
                if (matched !== null) {
                    bracketA = hoverPos
                    bracketB = matched
                }
            }
        }

        for (let i = 0; i < contentHeight; i++) {
            const screenY = contentY + i
            if (screenY < clipTop || screenY >= clipBottom) continue
            if (screenY >= buffer.height) break

            const vl = visualLines[scrollY + i]
            if (!vl) {
                buffer.write(contentX, screenY, ' '.repeat(Math.max(0, clipRight - contentX)), cellStyle)
                continue
            }

            // Pre-compute per-column token styles for this visual line.
            // Hard-line column = visual line's offset within the hard line + j.
            const hardLineStart = value.lastIndexOf('\n', vl.startPos - 1) + 1
            const vlHardOffset  = vl.startPos - hardLineStart
            const lineTokens    = highlighted ? (highlighted[vl.hardLine] ?? []) : null

            // Build token-offset table once per line (avoid O(N²) inner loop)
            let tokenOffsets: number[] | null = null
            if (lineTokens && lineTokens.length > 0) {
                tokenOffsets = new Array(lineTokens.length)
                let off = 0
                for (let t = 0; t < lineTokens.length; t++) {
                    tokenOffsets[t] = off
                    off += lineTokens[t]!.content.length
                }
            }

            for (let j = 0; j < contentWidth; j++) {
                const x = contentX + j
                if (x < clipLeft || x >= clipRight) continue

                const absPos = vl.startPos + j
                const char   = j < vl.text.length ? vl.text[j]! : ' '
                // Only highlight actual characters. Trailing padding is never selected.
                const inSel = j < vl.text.length && absPos >= selMin && absPos < selMax

                // Resolve token color for this column
                let tokenColor: string | null = cellStyle.color ?? null
                let tokenBold = cellStyle.bold ?? false
                let tokenItalic = false
                let tokenUnderline = cellStyle.underline ?? false

                if (lineTokens && tokenOffsets) {
                    const hardCol = vlHardOffset + j
                    // Binary-search for the token covering hardCol
                    let lo = 0, hi = lineTokens.length - 1
                    while (lo < hi) {
                        const mid = (lo + hi + 1) >> 1
                        if (tokenOffsets[mid]! <= hardCol) lo = mid
                        else hi = mid - 1
                    }
                    const tok = lineTokens[lo]
                    if (tok && hardCol < tokenOffsets[lo]! + tok.content.length) {
                        tokenColor     = tok.color ?? tokenColor
                        tokenBold      = tok.bold      || tokenBold
                        tokenItalic    = tok.italic
                        tokenUnderline = tok.underline || tokenUnderline
                    }
                }

                const isBracketHL = !inSel && j < vl.text.length && (absPos === bracketA || absPos === bracketB)
                buffer.writeCell(x, screenY, {
                    char,
                    color:      inSel ? (cellStyle.background ?? '#1e3a5f') : isBracketHL ? '#ffcc00' : tokenColor,
                    background: inSel ? '#4a9eff'                            : isBracketHL ? '#333300' : (cellStyle.background ?? null),
                    bold:       isBracketHL ? true : tokenBold,
                    underline:  tokenUnderline,
                    italic:     tokenItalic,
                    inverse:    false,
                    dim:        false,
                })
            }
        }
    },

    getCursorPos(node: LayoutNode): { x: number; y: number } | null {
        if (!node.layout) return null
        const { contentX, contentY, contentWidth, contentHeight } = getAdjustedContentGeometry(node)
        const value = getValue(node)
        const cursorPos = node._cursorPos ?? value.length
        const visualLines = buildVisualLines(value, contentWidth)
        const { vLine, col } = getVisualPos(visualLines, cursorPos)
        const visibleLine = vLine - (node.scrollY ?? 0)
        if (visibleLine < 0 || visibleLine >= contentHeight) return null
        return { x: contentX + col, y: contentY + visibleLine }
    },
}

registerElement('editor', editorBehavior)
