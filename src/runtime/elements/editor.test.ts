import { test, expect, describe } from 'bun:test'
import './editor' // registers editor behavior
import { getElement } from './registry'
import type { LayoutNode } from '../../core/layout/types'
import type { KeyEvent, MouseEvent } from '../terminal/input'
import { ScreenBuffer } from '../terminal/buffer'

function makeNode(value = '', cursorPos?: number): LayoutNode {
    const node: LayoutNode = {
        id: 'test-editor',
        type: 'editor',
        layoutProps: {},
        props: { modelValue: value },
        content: null,
        style: {},
        events: new Map(),
        children: [],
        parent: null,
        layout: {
            x: 0,
            y: 0,
            width: 22, // 2 border + 20 content
            height: 12,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            border: { width: 1, type: 'line' },
        },
        scrollX: 0,
        scrollY: 0,
    }
    if (cursorPos !== undefined) {
        node._inputValue = value
        node._cursorPos = cursorPos
        node._selectionStart = cursorPos
        node._selectionEnd = cursorPos
        node._editorSelAnchor = cursorPos
        node._editorMode = 'insert'
        node._editorDragActive = false
        node._editorYankBuffer = ''
        node._editorPendingKey = ''
    }
    return node
}

function key(name: string): KeyEvent {
    return { name, sequence: '', ctrl: false, shift: false, meta: false }
}

function printable(char: string): KeyEvent {
    return { name: char, sequence: char, ctrl: false, shift: false, meta: false }
}

function mouseEvent(x: number, y: number, shift = false): MouseEvent {
    return { type: 'mousedown', x, y, button: 0, shift }
}

function mouseMove(x: number, y: number): MouseEvent {
    return { type: 'mousemove', x, y, button: -1, shift: false }
}

const noop = () => {}

// ---------------------------------------------------------------------------
// Auto-closing brackets
// ---------------------------------------------------------------------------

describe('editor - auto-closing brackets', () => {
    test('inserting ( auto-closes to ()', () => {
        const node = makeNode('', 0)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable('('), noop)
        expect(node._inputValue).toBe('()')
        expect(node._cursorPos).toBe(1)
    })

    test('inserting [ auto-closes to []', () => {
        const node = makeNode('', 0)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable('['), noop)
        expect(node._inputValue).toBe('[]')
        expect(node._cursorPos).toBe(1)
    })

    test('inserting { auto-closes to {}', () => {
        const node = makeNode('', 0)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable('{'), noop)
        expect(node._inputValue).toBe('{}')
        expect(node._cursorPos).toBe(1)
    })

    test('inserting " auto-closes to ""', () => {
        const node = makeNode('', 0)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable('"'), noop)
        expect(node._inputValue).toBe('""')
        expect(node._cursorPos).toBe(1)
    })

    test("inserting ' auto-closes to ''", () => {
        const node = makeNode('', 0)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable("'"), noop)
        expect(node._inputValue).toBe("''")
        expect(node._cursorPos).toBe(1)
    })

    test('inserting ` auto-closes to ``', () => {
        const node = makeNode('', 0)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable('`'), noop)
        expect(node._inputValue).toBe('``')
        expect(node._cursorPos).toBe(1)
    })

    test('auto-close works in the middle of text', () => {
        const node = makeNode('hello world', 5)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable('('), noop)
        expect(node._inputValue).toBe('hello() world')
        expect(node._cursorPos).toBe(6)
    })
})

// ---------------------------------------------------------------------------
// Skip-over closing bracket
// ---------------------------------------------------------------------------

describe('editor - skip-over closing bracket', () => {
    test('typing ) when ) is at cursor advances without inserting', () => {
        const node = makeNode('()', 1)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable(')'), noop)
        expect(node._inputValue).toBe('()')
        expect(node._cursorPos).toBe(2)
    })

    test('typing ] when ] is at cursor advances without inserting', () => {
        const node = makeNode('[]', 1)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable(']'), noop)
        expect(node._inputValue).toBe('[]')
        expect(node._cursorPos).toBe(2)
    })

    test('typing } when } is at cursor advances without inserting', () => {
        const node = makeNode('{}', 1)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable('}'), noop)
        expect(node._inputValue).toBe('{}')
        expect(node._cursorPos).toBe(2)
    })

    test('typing ) when cursor is not before ) inserts normally', () => {
        const node = makeNode('hello', 5)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, printable(')'), noop)
        expect(node._inputValue).toBe('hello)')
        expect(node._cursorPos).toBe(6)
    })
})

// ---------------------------------------------------------------------------
// Backspace-pair deletion
// ---------------------------------------------------------------------------

describe('editor - backspace-pair deletion', () => {
    test('backspace inside () deletes both brackets', () => {
        const node = makeNode('()', 1)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, key('backspace'), noop)
        expect(node._inputValue).toBe('')
        expect(node._cursorPos).toBe(0)
    })

    test('backspace inside [] deletes both brackets', () => {
        const node = makeNode('[]', 1)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, key('backspace'), noop)
        expect(node._inputValue).toBe('')
        expect(node._cursorPos).toBe(0)
    })

    test('backspace inside {} deletes both brackets', () => {
        const node = makeNode('{}', 1)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, key('backspace'), noop)
        expect(node._inputValue).toBe('')
        expect(node._cursorPos).toBe(0)
    })

    test('backspace inside "" deletes both quotes', () => {
        const node = makeNode('""', 1)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, key('backspace'), noop)
        expect(node._inputValue).toBe('')
        expect(node._cursorPos).toBe(0)
    })

    test('backspace NOT between pair only deletes one char', () => {
        const node = makeNode('(a)', 2)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, key('backspace'), noop)
        // 'a' before cursor, ')' at cursor — not a pair match
        expect(node._inputValue).toBe('()')
        expect(node._cursorPos).toBe(1)
    })

    test('backspace at start of string does nothing', () => {
        const node = makeNode('hello', 0)
        const behavior = getElement('editor')!
        behavior.handleKey!(node, key('backspace'), noop)
        expect(node._inputValue).toBe('hello')
        expect(node._cursorPos).toBe(0)
    })
})

// ---------------------------------------------------------------------------
// Selection skew fix — _editorAdjustedY stored during render
// ---------------------------------------------------------------------------

describe('editor - _editorAdjustedY selection skew fix', () => {
    test('render stores adjustedY on node', () => {
        const node = makeNode('hello', 0)
        const behavior = getElement('editor')!
        const buffer = new ScreenBuffer(22, 12)
        const ctx = {
            buffer,
            cellStyle: { fg: undefined, bg: undefined, bold: false, dim: false, italic: false, underline: false, inverse: false },
            adjustedY: 5, // simulate parent scroll offset
        }
        behavior.render!(node, ctx as any)
        expect(node._editorAdjustedY).toBe(5)
    })

    test('render stores adjustedY = 0 when not scrolled', () => {
        const node = makeNode('hello', 0)
        const behavior = getElement('editor')!
        const buffer = new ScreenBuffer(22, 12)
        const ctx = {
            buffer,
            cellStyle: {},
            adjustedY: 0,
        }
        behavior.render!(node, ctx as any)
        expect(node._editorAdjustedY).toBe(0)
    })
})

// ---------------------------------------------------------------------------
// Hover bracket highlighting — _editorHoverPos
// ---------------------------------------------------------------------------

describe('editor - hover bracket highlighting', () => {
    test('handleHover sets _editorHoverPos', () => {
        const node = makeNode('(hello)', 0)
        node._editorAdjustedY = node.layout!.y // match render state
        const behavior = getElement('editor')!
        // Mouse at contentX + 0, contentY + 0 → pos 0 (the '(' char)
        const event = mouseMove(1, 1) // x=1 (contentX with border=1), y=1 (contentY)
        behavior.handleHover!(node, event, noop)
        expect(node._editorHoverPos).toBeDefined()
    })

    test('render highlights bracket pair when _editorHoverPos is set on opener', () => {
        const node = makeNode('(hello)', 0)
        const behavior = getElement('editor')!
        const buffer = new ScreenBuffer(22, 12)
        const ctx = {
            buffer,
            cellStyle: {},
            adjustedY: node.layout!.y,
        }
        behavior.render!(node, ctx as any)

        // Set hover pos to 0 (the '(' bracket)
        node._editorHoverPos = 0
        // Re-render with hover
        const buffer2 = new ScreenBuffer(22, 12)
        const ctx2 = { buffer: buffer2, cellStyle: {}, adjustedY: node.layout!.y }
        behavior.render!(node, ctx2 as any)

        // The '(' at col 0 and ')' at col 6 should have bracket highlight color (#ffcc00)
        const openCell = buffer2.getCell(1, 1) // contentX=1, contentY=1
        const closeCell = buffer2.getCell(7, 1) // contentX=1+6, contentY=1
        expect(openCell?.color).toBe('#ffcc00')
        expect(closeCell?.color).toBe('#ffcc00')
    })

    test('render does not highlight when no hover pos', () => {
        const node = makeNode('(hello)', 0)
        node._editorHoverPos = undefined
        const behavior = getElement('editor')!
        const buffer = new ScreenBuffer(22, 12)
        const ctx = { buffer, cellStyle: {}, adjustedY: node.layout!.y }
        behavior.render!(node, ctx as any)

        const openCell = buffer.getCell(1, 1)
        // Should not have the bracket highlight color
        expect(openCell?.color).not.toBe('#ffcc00')
    })
})

// ---------------------------------------------------------------------------
// Selection rendering correctness
// ---------------------------------------------------------------------------

describe('editor - selection rendering', () => {
    test('selected text renders with selection background', () => {
        const node = makeNode('hello world', 0)
        node._selectionStart = 0
        node._selectionEnd = 5
        const behavior = getElement('editor')!
        const buffer = new ScreenBuffer(22, 12)
        const selectionBg = '#264f78'
        const ctx = { buffer, cellStyle: {}, adjustedY: node.layout!.y, selectionBg }
        behavior.render!(node, ctx as any)

        // Cells 0-4 should have selection bg color
        const firstCell = buffer.getCell(1, 1)
        expect(firstCell?.background).toBe(selectionBg)

        // Cell 5 (space) should NOT have selection background
        const afterSel = buffer.getCell(6, 1)
        expect(afterSel?.background).not.toBe(selectionBg)
    })

    test('getCursorPos returns null when no layout', () => {
        const node = makeNode('hello', 2)
        node.layout = null
        const behavior = getElement('editor')!
        expect(behavior.getCursorPos!(node)).toBeNull()
    })

    test('getCursorPos returns correct position', () => {
        const node = makeNode('hello', 3)
        node._editorAdjustedY = node.layout!.y
        const behavior = getElement('editor')!
        const pos = behavior.getCursorPos!(node)
        expect(pos).not.toBeNull()
        // contentX = 0 + 1 (border) + 0 (padding) = 1
        // contentY = 0 + 1 (border) + 0 (padding) = 1
        expect(pos!.x).toBe(1 + 3)
        expect(pos!.y).toBe(1)
    })

    test('getCursorPos uses _editorAdjustedY when set', () => {
        const node = makeNode('hello', 0)
        node._editorAdjustedY = 3 // simulates scrolled parent
        const behavior = getElement('editor')!
        const pos = behavior.getCursorPos!(node)
        expect(pos).not.toBeNull()
        // contentY should be adjustedY(3) + border(1) = 4
        expect(pos!.y).toBe(4)
    })
})
