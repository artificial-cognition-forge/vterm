/**
 * HTML Compliance — Input Element
 *
 * Tests: input
 *
 * Covers:
 * - UA grey background
 * - Render: value, placeholder, viewport scrolling, padding/border offsets
 * - Key handling: insert, backspace, delete, navigation, enter
 * - Cursor position calculation
 *
 * Key handling is tested directly on the element behavior (no full pipeline
 * needed). Render output is tested via ScreenBuffer assertions.
 */

import { test, expect, describe } from 'bun:test'
import '../../src/runtime/elements/input'   // registers input behavior
import { getElement } from '../../src/runtime/elements/registry'
import { h, renderCSS, rowSlice, cellBg, makeNode, key, printable, noop } from './helpers'
import { ScreenBuffer } from '../../src/runtime/terminal/buffer'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import type { LayoutNode } from './helpers'

// ─── UA styles ────────────────────────────────────────────────────────────────

describe('input: UA styles', () => {
    test('input has UA bg: grey', async () => {
        const buf = await renderCSS(
            `.inp { width: 20; height: 1; }`,
            h('input', { class: 'inp' })
        )
        expect(cellBg(buf, 0, 0)).toBe('grey')
    })

    test('UA grey fills all input cells', async () => {
        const buf = await renderCSS(
            `.inp { width: 10; height: 1; }`,
            h('input', { class: 'inp' })
        )
        for (let x = 0; x < 10; x++) {
            expect(cellBg(buf, x, 0)).toBe('grey')
        }
    })

    test('user background overrides UA grey', async () => {
        const buf = await renderCSS(
            `.inp { width: 10; height: 1; background: white; }`,
            h('input', { class: 'inp' })
        )
        expect(cellBg(buf, 0, 0)).toBe('white')
    })
})

// ─── Render: value display ────────────────────────────────────────────────────

function renderNode(node: LayoutNode): ScreenBuffer {
    const buffer = new ScreenBuffer(node.layout!.width + 10, node.layout!.height + 5)
    const renderer = new BufferRenderer()
    // Build a minimal tree with node as root
    node.children = []
    node.parent = null
    renderer.render(node, buffer)
    return buffer
}

describe('input: render — value', () => {
    test('value renders in content area', () => {
        const node = makeNode('input', 'hello')
        node._inputValue = 'hello'
        node._cursorPos = 5
        // layout: border=1, padding=0 → contentX=1, contentY=1
        const buf = renderNode(node)
        const text = Array.from({ length: 5 }, (_, i) => buf.getCell(1 + i, 1)?.char ?? ' ').join('')
        expect(text).toBe('hello')
    })

    test('empty value fills content area with spaces', () => {
        const node = makeNode('input', '')
        node._inputValue = ''
        node._cursorPos = 0
        const buf = renderNode(node)
        // Content area should have spaces (not undefined)
        const cell = buf.getCell(1, 1)
        expect(cell?.char ?? ' ').toBe(' ')
    })

    test('value longer than contentWidth is scrolled to show cursor', () => {
        // width=20, border=1 → contentWidth=18
        const longVal = 'a'.repeat(25)
        const node = makeNode('input', longVal)
        node._inputValue = longVal
        node._cursorPos = 25 // at end
        const buf = renderNode(node)
        // Last 18 chars of 'aaa...' (all 'a') visible at contentX=1
        const cell = buf.getCell(1, 1)
        expect(cell?.char).toBe('a')
    })

    test('placeholder renders when value is empty', () => {
        const node = makeNode('input', '')
        node.props.placeholder = 'Enter name'
        node._inputValue = ''
        node._cursorPos = 0
        const buf = renderNode(node)
        // Placeholder text at content area
        const chars = Array.from({ length: 5 }, (_, i) => buf.getCell(1 + i, 1)?.char ?? ' ').join('')
        expect(chars).toBe('Enter')
    })

    test('placeholder is not rendered when value is present', () => {
        const node = makeNode('input', 'xyz')
        node.props.placeholder = 'placeholder'
        node._inputValue = 'xyz'
        node._cursorPos = 3
        const buf = renderNode(node)
        const cell = buf.getCell(1, 1)
        expect(cell?.char).toBe('x')
    })
})

// ─── Key handling ─────────────────────────────────────────────────────────────

describe('input: key handling — insert', () => {
    test('printable char inserts at cursor', () => {
        const node = makeNode('input', 'helo')
        node._inputValue = 'helo'
        node._cursorPos = 3
        getElement('input')!.handleKey!(node, printable('l'), noop)
        expect(node._inputValue).toBe('hello')
        expect(node._cursorPos).toBe(4)
    })

    test('ctrl key does not insert', () => {
        const node = makeNode('input', 'hi')
        node._inputValue = 'hi'
        node._cursorPos = 2
        getElement('input')!.handleKey!(node, { name: 'c', sequence: '\x03', ctrl: true, shift: false, meta: false }, noop)
        expect(node._inputValue).toBe('hi')
    })
})

describe('input: key handling — deletion', () => {
    test('backspace removes char before cursor', () => {
        const node = makeNode('input', 'hello')
        node._inputValue = 'hello'
        node._cursorPos = 5
        getElement('input')!.handleKey!(node, key('backspace'), noop)
        expect(node._inputValue).toBe('hell')
        expect(node._cursorPos).toBe(4)
    })

    test('backspace at pos 0 does nothing', () => {
        const node = makeNode('input', 'hi')
        node._inputValue = 'hi'
        node._cursorPos = 0
        getElement('input')!.handleKey!(node, key('backspace'), noop)
        expect(node._inputValue).toBe('hi')
        expect(node._cursorPos).toBe(0)
    })

    test('delete removes char at cursor', () => {
        const node = makeNode('input', 'hello')
        node._inputValue = 'hello'
        node._cursorPos = 1
        getElement('input')!.handleKey!(node, key('delete'), noop)
        expect(node._inputValue).toBe('hllo')
        expect(node._cursorPos).toBe(1)
    })
})

describe('input: key handling — navigation', () => {
    test('left moves cursor back', () => {
        const node = makeNode('input', 'hello')
        node._inputValue = 'hello'
        node._cursorPos = 3
        getElement('input')!.handleKey!(node, key('left'), noop)
        expect(node._cursorPos).toBe(2)
    })

    test('left at 0 stays at 0', () => {
        const node = makeNode('input', 'hello')
        node._inputValue = 'hello'
        node._cursorPos = 0
        getElement('input')!.handleKey!(node, key('left'), noop)
        expect(node._cursorPos).toBe(0)
    })

    test('right moves cursor forward', () => {
        const node = makeNode('input', 'hello')
        node._inputValue = 'hello'
        node._cursorPos = 2
        getElement('input')!.handleKey!(node, key('right'), noop)
        expect(node._cursorPos).toBe(3)
    })

    test('right at end stays at end', () => {
        const node = makeNode('input', 'hello')
        node._inputValue = 'hello'
        node._cursorPos = 5
        getElement('input')!.handleKey!(node, key('right'), noop)
        expect(node._cursorPos).toBe(5)
    })

    test('home jumps to position 0', () => {
        const node = makeNode('input', 'hello')
        node._inputValue = 'hello'
        node._cursorPos = 4
        getElement('input')!.handleKey!(node, key('home'), noop)
        expect(node._cursorPos).toBe(0)
    })

    test('end jumps to end of value', () => {
        const node = makeNode('input', 'hello')
        node._inputValue = 'hello'
        node._cursorPos = 1
        getElement('input')!.handleKey!(node, key('end'), noop)
        expect(node._cursorPos).toBe(5)
    })
})

describe('input: key handling — events', () => {
    test('enter fires change event', () => {
        const node = makeNode('input', 'done')
        node._inputValue = 'done'
        node._cursorPos = 4
        let emitted: string | undefined
        node.events.set('change', (v: string) => { emitted = v })
        getElement('input')!.handleKey!(node, key('enter'), noop)
        expect(emitted).toBe('done')
    })

    test('typing fires update:modelvalue', () => {
        const node = makeNode('input', 'hi')
        node._inputValue = 'hi'
        node._cursorPos = 2
        let emitted: string | undefined
        node.events.set('update:modelvalue', (v: string) => { emitted = v })
        getElement('input')!.handleKey!(node, printable('!'), noop)
        expect(emitted).toBe('hi!')
    })

    test('non-mutating navigation does not fire update:modelvalue', () => {
        const node = makeNode('input', 'hi')
        node._inputValue = 'hi'
        node._cursorPos = 1
        let emitCount = 0
        node.events.set('update:modelvalue', () => { emitCount++ })
        getElement('input')!.handleKey!(node, key('left'), noop)
        expect(emitCount).toBe(0)
    })
})

// ─── Cursor position ──────────────────────────────────────────────────────────

describe('input: cursor position', () => {
    test('cursor pos at offset N returns contentX + N', () => {
        // layout: x=0, y=0, border=1, padding=0 → contentX=1, contentY=1
        const node = makeNode('input', 'hi')
        node._inputValue = 'hi'
        node._cursorPos = 2
        const pos = getElement('input')!.getCursorPos!(node)
        expect(pos).not.toBeNull()
        expect(pos!.x).toBe(1 + 2) // contentX + cursorPos
        expect(pos!.y).toBe(1)     // contentY
    })

    test('cursor scrolled into view when past contentWidth', () => {
        // width=20, border=1 → contentWidth=18; cursor at 20
        const node = makeNode('input', 'a'.repeat(25))
        node._inputValue = 'a'.repeat(25)
        node._cursorPos = 20
        const pos = getElement('input')!.getCursorPos!(node)
        expect(pos).not.toBeNull()
        // scrollOffset = max(0, 20 - 18 + 1) = 3; x = 1 + (20 - 3) = 18
        expect(pos!.x).toBe(1 + 17)
    })

    test('returns null when layout is not set', () => {
        const node = makeNode('input', 'hi')
        node._inputValue = 'hi'
        node._cursorPos = 1
        node.layout = null
        const pos = getElement('input')!.getCursorPos!(node)
        expect(pos).toBeNull()
    })
})
