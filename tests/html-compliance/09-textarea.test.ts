/**
 * HTML Compliance — Textarea Element
 *
 * Tests: textarea
 *
 * Covers:
 * - UA grey background
 * - Render: multiline value, viewport scrolling, border/padding offsets
 * - Key handling: insert, backspace, delete, arrow keys, enter (inserts newline)
 * - Cursor position calculation (line/col aware)
 */

import { test, expect, describe } from 'bun:test'
import '../../src/runtime/elements/textarea'   // registers textarea behavior
import { getElement } from '../../src/runtime/elements/registry'
import { h, renderCSS, cellBg, makeNode, key, printable, noop } from './helpers'
import { ScreenBuffer } from '../../src/runtime/terminal/buffer'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import type { LayoutNode } from './helpers'

// ─── UA styles ────────────────────────────────────────────────────────────────

describe('textarea: UA styles', () => {
    test('textarea has UA bg: grey', async () => {
        const buf = await renderCSS(
            `.ta { width: 20; height: 4; }`,
            h('textarea', { class: 'ta' })
        )
        expect(cellBg(buf, 0, 0)).toBe('grey')
    })

    test('UA grey fills all textarea cells', async () => {
        const buf = await renderCSS(
            `.ta { width: 8; height: 3; }`,
            h('textarea', { class: 'ta' })
        )
        for (let y = 0; y < 3; y++) {
            for (let x = 0; x < 8; x++) {
                expect(cellBg(buf, x, y)).toBe('grey')
            }
        }
    })

    test('user background overrides UA grey', async () => {
        const buf = await renderCSS(
            `.ta { width: 20; height: 3; background: white; }`,
            h('textarea', { class: 'ta' })
        )
        expect(cellBg(buf, 0, 0)).toBe('white')
    })
})

// ─── Render helpers ───────────────────────────────────────────────────────────

function makeTextareaNode(value = '', cursorPos?: number): LayoutNode {
    const node = makeNode('textarea', value, {
        layout: {
            x: 0,
            y: 0,
            width: 20,
            height: 7,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            border: { width: 1, type: 'line' },
        },
    })
    if (cursorPos !== undefined) {
        node._inputValue = value
        node._cursorPos = cursorPos
    }
    return node
}

function renderNode(node: LayoutNode): ScreenBuffer {
    const buffer = new ScreenBuffer(node.layout!.width + 10, node.layout!.height + 5)
    const renderer = new BufferRenderer()
    node.children = []
    node.parent = null
    renderer.render(node, buffer)
    return buffer
}

// ─── Render: value display ────────────────────────────────────────────────────

describe('textarea: render — value', () => {
    test('single line value renders on first content row', () => {
        const node = makeTextareaNode('hello', 5)
        const buf = renderNode(node)
        // border=1 → contentX=1, contentY=1
        const chars = Array.from({ length: 5 }, (_, i) => buf.getCell(1 + i, 1)?.char ?? ' ').join('')
        expect(chars).toBe('hello')
    })

    test('multiline value renders on correct rows', () => {
        const node = makeTextareaNode('line0\nline1\nline2', 0)
        const buf = renderNode(node)
        const row0 = Array.from({ length: 5 }, (_, i) => buf.getCell(1 + i, 1)?.char ?? ' ').join('')
        const row1 = Array.from({ length: 5 }, (_, i) => buf.getCell(1 + i, 2)?.char ?? ' ').join('')
        const row2 = Array.from({ length: 5 }, (_, i) => buf.getCell(1 + i, 3)?.char ?? ' ').join('')
        expect(row0).toBe('line0')
        expect(row1).toBe('line1')
        expect(row2).toBe('line2')
    })

    test('lines wider than contentWidth are clipped', () => {
        // width=20, border=1 → contentX=1, contentWidth=18
        // Textarea writes exactly contentWidth chars: x=1..18 (indices 0..17)
        const longLine = 'x'.repeat(25)
        const node = makeTextareaNode(longLine, 0)
        const buf = renderNode(node)
        // Last visible content cell (x=18) should be 'x'
        expect(buf.getCell(1 + 17, 1)?.char).toBe('x')
        // Right border (x=19) is '│', confirming content didn't bleed out
        expect(buf.getCell(1 + 18, 1)?.char).toBe('│')
    })

    test('content scrolled up when scrollY > 0', () => {
        // cursorPos=6 places cursor at line 1 col 0 ('line1').
        // Textarea auto-adjusts scrollY to keep cursor visible; with scrollY=1
        // and cursorLine=1, condition (1 < 1) is false so scrollY stays at 1.
        const node = makeTextareaNode('line0\nline1\nline2', 6)
        node.scrollY = 1
        const buf = renderNode(node)
        // With scrollY=1, line1 appears at the first content row (contentY=1)
        const row0 = Array.from({ length: 5 }, (_, i) => buf.getCell(1 + i, 1)?.char ?? ' ').join('')
        expect(row0).toBe('line1')
    })
})

// ─── Key handling ─────────────────────────────────────────────────────────────

describe('textarea: key handling — insert', () => {
    test('printable char inserts at cursor', () => {
        const node = makeTextareaNode('helo', 3)
        getElement('textarea')!.handleKey!(node, printable('l'), noop)
        expect(node._inputValue).toBe('hello')
        expect(node._cursorPos).toBe(4)
    })

    test('ctrl key does not insert', () => {
        const node = makeTextareaNode('hi', 2)
        getElement('textarea')!.handleKey!(node, { name: 'c', sequence: '\x03', ctrl: true, shift: false, meta: false }, noop)
        expect(node._inputValue).toBe('hi')
    })
})

describe('textarea: key handling — deletion', () => {
    test('backspace removes char before cursor', () => {
        const node = makeTextareaNode('hello', 5)
        getElement('textarea')!.handleKey!(node, key('backspace'), noop)
        expect(node._inputValue).toBe('hell')
        expect(node._cursorPos).toBe(4)
    })

    test('backspace at pos 0 does nothing', () => {
        const node = makeTextareaNode('hello', 0)
        getElement('textarea')!.handleKey!(node, key('backspace'), noop)
        expect(node._inputValue).toBe('hello')
        expect(node._cursorPos).toBe(0)
    })

    test('delete removes char at cursor', () => {
        const node = makeTextareaNode('hello', 1)
        getElement('textarea')!.handleKey!(node, key('delete'), noop)
        expect(node._inputValue).toBe('hllo')
        expect(node._cursorPos).toBe(1)
    })
})

describe('textarea: key handling — enter inserts newline', () => {
    test('enter inserts newline at cursor', () => {
        const node = makeTextareaNode('hello world', 5)
        getElement('textarea')!.handleKey!(node, key('enter'), noop)
        expect(node._inputValue).toBe('hello\n world')
        expect(node._cursorPos).toBe(6)
    })

    test('enter at start inserts newline before all content', () => {
        const node = makeTextareaNode('hello', 0)
        getElement('textarea')!.handleKey!(node, key('enter'), noop)
        expect(node._inputValue).toBe('\nhello')
        expect(node._cursorPos).toBe(1)
    })

    test('enter at end appends newline', () => {
        const node = makeTextareaNode('hello', 5)
        getElement('textarea')!.handleKey!(node, key('enter'), noop)
        expect(node._inputValue).toBe('hello\n')
        expect(node._cursorPos).toBe(6)
    })
})

describe('textarea: key handling — multiline navigation', () => {
    test('up moves cursor to same column on previous line', () => {
        // 'hello\nworld' — cursor at pos 9 (col 3 of 'world')
        const node = makeTextareaNode('hello\nworld', 9)
        getElement('textarea')!.handleKey!(node, key('up'), noop)
        expect(node._cursorPos).toBe(3) // col 3 of 'hello'
    })

    test('up on first line jumps to position 0', () => {
        const node = makeTextareaNode('hello\nworld', 2)
        getElement('textarea')!.handleKey!(node, key('up'), noop)
        expect(node._cursorPos).toBe(0)
    })

    test('down moves cursor to same column on next line', () => {
        // 'hello\nworld' — cursor at pos 2 (col 2 of 'hello')
        const node = makeTextareaNode('hello\nworld', 2)
        getElement('textarea')!.handleKey!(node, key('down'), noop)
        expect(node._cursorPos).toBe(8) // col 2 of 'world' = 6+2
    })

    test('down on last line jumps to end', () => {
        const node = makeTextareaNode('hello\nworld', 9)
        getElement('textarea')!.handleKey!(node, key('down'), noop)
        expect(node._cursorPos).toBe(11)
    })

    test('home moves to start of current line', () => {
        const node = makeTextareaNode('hello\nworld', 9) // col 3 of 'world'
        getElement('textarea')!.handleKey!(node, key('home'), noop)
        expect(node._cursorPos).toBe(6) // start of 'world'
    })

    test('end moves to end of current line', () => {
        const node = makeTextareaNode('hello\nworld', 7) // col 1 of 'world'
        getElement('textarea')!.handleKey!(node, key('end'), noop)
        expect(node._cursorPos).toBe(11)
    })

    test('up clamps column to shorter line length', () => {
        // 'hi\nhello' — cursor at col 4 of 'hello' (pos 7)
        const node = makeTextareaNode('hi\nhello', 7)
        getElement('textarea')!.handleKey!(node, key('up'), noop)
        // 'hi' has length 2, col clamped to 2
        expect(node._cursorPos).toBe(2)
    })
})

describe('textarea: key handling — events', () => {
    test('typing fires update:modelvalue', () => {
        const node = makeTextareaNode('hi', 2)
        let emitted: string | undefined
        node.events.set('update:modelvalue', (v: string) => { emitted = v })
        getElement('textarea')!.handleKey!(node, printable('!'), noop)
        expect(emitted).toBe('hi!')
    })
})

// ─── Cursor position ──────────────────────────────────────────────────────────

describe('textarea: cursor position', () => {
    test('cursor on visible line returns correct x, y', () => {
        // layout: x=0, y=0, border=1, padding=0 → contentX=1, contentY=1
        const node = makeTextareaNode('line0\nline1\nline2', 12) // line 2, col 0
        const pos = getElement('textarea')!.getCursorPos!(node)
        expect(pos).not.toBeNull()
        expect(pos!.y).toBe(1 + 2) // contentY + line
        expect(pos!.x).toBe(1 + 0) // contentX + col
    })

    test('cursor above scroll viewport returns null', () => {
        const node = makeTextareaNode('line0\nline1\nline2\nline3', 2) // line 0
        node.scrollY = 2
        const pos = getElement('textarea')!.getCursorPos!(node)
        expect(pos).toBeNull()
    })

    test('cursor below scroll viewport returns null', () => {
        // contentHeight = 7 - 2*1 = 5; cursor on line 6 (out of viewport)
        const lines = Array.from({ length: 7 }, (_, i) => `L${i}`).join('\n')
        const cursorPos = lines.lastIndexOf('L6')
        const node = makeTextareaNode(lines, cursorPos)
        const pos = getElement('textarea')!.getCursorPos!(node)
        expect(pos).toBeNull()
    })

    test('returns null when layout is not set', () => {
        const node = makeTextareaNode('hello', 1)
        node.layout = null
        const pos = getElement('textarea')!.getCursorPos!(node)
        expect(pos).toBeNull()
    })
})
