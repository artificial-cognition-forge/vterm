import { test, expect, describe, mock } from 'bun:test'

// Mock shiki before importing the code element so tests run synchronously
// and don't depend on network/WASM loading
mock.module('../../runtime/elements/highlighter', () => ({
    getHighlightedLines: () => null, // always "pending" — triggers fallback dim-text path
    setHighlightCallback: () => {},
}))

import './code' // registers code behavior
import { getElement } from './registry'
import { ScreenBuffer } from '../terminal/buffer'
import type { LayoutNode } from '../../core/layout/types'

function makeLayout(x = 0, y = 0, width = 40, height = 10) {
    return {
        x, y, width, height,
        padding: { top: 0, right: 0, bottom: 0, left: 0 },
        margin: { top: 0, right: 0, bottom: 0, left: 0 },
        border: { width: 0, type: 'line' as const },
    }
}

function makeCodeNode(options: {
    content?: string        // set directly on node (setElementText path)
    children?: string[]     // text child nodes (createText path)
    lang?: string
    width?: number
    height?: number
}): LayoutNode {
    const { content, children = [], lang = 'ts', width = 40, height = 10 } = options

    const childNodes: LayoutNode[] = children.map((text, i) => ({
        id: `text-${i}`,
        type: 'text' as const,
        layoutProps: {},
        props: {},
        content: text,
        style: {},
        events: new Map(),
        children: [],
        parent: null,
        layout: makeLayout(0, 0, width, text.split('\n').length),
        scrollX: 0,
        scrollY: 0,
    }))

    const node: LayoutNode = {
        id: 'code-node',
        type: 'code',
        layoutProps: {},
        props: { lang },
        content: content ?? null,
        style: {},
        events: new Map(),
        children: childNodes,
        parent: null,
        layout: makeLayout(0, 0, width, height),
        scrollX: 0,
        scrollY: 0,
    }

    for (const child of childNodes) {
        child.parent = node
    }

    return node
}

const behavior = getElement('code')!
const cellStyle = { color: null, background: null, bold: false, underline: false, italic: false, inverse: false, dim: false }

describe('code element - skipChildren', () => {
    test('has skipChildren set to true', () => {
        expect(behavior.skipChildren).toBe(true)
    })
})

describe('code element - render from child text nodes', () => {
    test('renders single-line code from child text node', () => {
        const node = makeCodeNode({ children: ['const x = 1'] })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })
        expect(buffer.getLine(0).trim()).toBe('const x = 1')
    })

    test('renders multi-line code from child text node', () => {
        const code = 'const x = 1\nconst y = 2'
        const node = makeCodeNode({ children: [code], height: 5 })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })
        expect(buffer.getLine(0).trim()).toBe('const x = 1')
        expect(buffer.getLine(1).trim()).toBe('const y = 2')
    })

    test('strips common leading indentation from child text node', () => {
        const code = '    const x = 1\n    const y = 2'
        const node = makeCodeNode({ children: [code], height: 5 })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })
        expect(buffer.getLine(0).startsWith('const')).toBe(true)
        expect(buffer.getLine(0).startsWith('    ')).toBe(false)
    })

    test('strips leading and trailing blank lines from child text node', () => {
        const code = '\n\nconst x = 1\n\n'
        const node = makeCodeNode({ children: [code], height: 5 })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })
        expect(buffer.getLine(0).trim()).toBe('const x = 1')
    })

    test('handles template-style indented code block', () => {
        // Simulates text content from <code> with surrounding template indentation
        const code = '\n        const x = 1\n        const y = 2\n    '
        const node = makeCodeNode({ children: [code], height: 5 })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })
        expect(buffer.getLine(0).trim()).toBe('const x = 1')
        expect(buffer.getLine(1).trim()).toBe('const y = 2')
    })
})

describe('code element - render from node.content (setElementText path)', () => {
    test('renders code when text is set directly on node.content', () => {
        const node = makeCodeNode({ content: 'const x = 1', children: [] })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })
        expect(buffer.getLine(0).trim()).toBe('const x = 1')
    })

    test('renders multi-line code from node.content', () => {
        const node = makeCodeNode({ content: 'const x = 1\nconst y = 2', children: [], height: 5 })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })
        expect(buffer.getLine(0).trim()).toBe('const x = 1')
        expect(buffer.getLine(1).trim()).toBe('const y = 2')
    })

    test('strips indentation from node.content', () => {
        const node = makeCodeNode({ content: '    const x = 1\n    const y = 2', children: [], height: 5 })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })
        expect(buffer.getLine(0).startsWith('const')).toBe(true)
    })
})

describe('code element - layout bounds', () => {
    test('respects contentHeight - does not render more lines than fit', () => {
        const code = 'line1\nline2\nline3\nline4\nline5'
        const node = makeCodeNode({ children: [code], height: 3 })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })
        expect(buffer.getLine(0).trim()).toBe('line1')
        expect(buffer.getLine(1).trim()).toBe('line2')
        expect(buffer.getLine(2).trim()).toBe('line3')
        expect(buffer.getLine(3).trim()).toBe('') // line4 clipped
    })

    test('renders at adjustedY offset', () => {
        const node = makeCodeNode({ children: ['const x = 1'], height: 5 })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 3 })
        expect(buffer.getLine(3).trim()).toBe('const x = 1')
        expect(buffer.getLine(0).trim()).toBe('') // nothing above offset
    })

    test('renders nothing when contentHeight is zero', () => {
        const node = makeCodeNode({ children: ['const x = 1'], height: 0 })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })
        // Nothing should have been written
        for (let y = 0; y < 10; y++) {
            expect(buffer.getLine(y).trim()).toBe('')
        }
    })
})

// ─── Clipping: parent clipBox must constrain rendered output ─────────────────
//
// Regression: code.ts used `buffer.height` and its own content bounds to decide
// which rows/columns to paint, but ignored the parent's clipBox entirely.
// Content that extended beyond a parent container would bleed into adjacent areas.

describe('code element - clipBox clipping', () => {
    test('lines outside clipBox.y range are not rendered', () => {
        // Code node at y=0, height=6, but clipBox restricts to y=0..2
        const node = makeCodeNode({ children: ['line1\nline2\nline3\nline4\nline5\nline6'], height: 6 })
        const buffer = new ScreenBuffer(40, 10)
        const clipBox = { x: 0, y: 0, width: 40, height: 3 }  // only 3 rows visible
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0, clipBox })

        expect(buffer.getLine(0).trim()).toBe('line1')
        expect(buffer.getLine(1).trim()).toBe('line2')
        expect(buffer.getLine(2).trim()).toBe('line3')
        // rows 3-5 clipped by clipBox
        expect(buffer.getLine(3).trim()).toBe('')
        expect(buffer.getLine(4).trim()).toBe('')
        expect(buffer.getLine(5).trim()).toBe('')
    })

    test('lines above clipBox.y are not rendered', () => {
        // Code at adjustedY=0, clipBox starts at y=2 — first 2 lines invisible
        const node = makeCodeNode({ children: ['line1\nline2\nline3\nline4'], height: 4 })
        const buffer = new ScreenBuffer(40, 10)
        const clipBox = { x: 0, y: 2, width: 40, height: 4 }
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0, clipBox })

        expect(buffer.getLine(0).trim()).toBe('')  // line1 above clip
        expect(buffer.getLine(1).trim()).toBe('')  // line2 above clip
        expect(buffer.getLine(2).trim()).toBe('line3')
        expect(buffer.getLine(3).trim()).toBe('line4')
    })

    test('tokens outside clipBox.x range are not rendered', () => {
        // Code at x=0, contentWidth=20, clipBox restricts to x=0..5
        const node = makeCodeNode({ content: 'ABCDEFGHIJKLMNOPQRST', width: 20, height: 1 })
        const buffer = new ScreenBuffer(20, 5)
        const clipBox = { x: 0, y: 0, width: 5, height: 1 }  // only first 5 cols
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0, clipBox })

        // Only first 5 characters should appear
        const row = buffer.getLine(0)
        expect(row.slice(0, 5).trim()).not.toBe('')  // content present within clip
        expect(row.slice(5).trim()).toBe('')          // nothing beyond x=5
    })

    test('tokens partially overlapping clipBox.x are trimmed', () => {
        // Code at x=0, clipBox starts at x=3 — first 3 chars of each line trimmed
        const node = makeCodeNode({ content: 'ABCDEFGH', width: 10, height: 1 })
        node.layout!.x = 0
        const buffer = new ScreenBuffer(10, 5)
        const clipBox = { x: 3, y: 0, width: 7, height: 1 }
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0, clipBox })

        // Chars A,B,C (x=0,1,2) should NOT appear — clipped
        expect(buffer.getCell(0, 0)?.char ?? ' ').toBe(' ')
        expect(buffer.getCell(1, 0)?.char ?? ' ').toBe(' ')
        expect(buffer.getCell(2, 0)?.char ?? ' ').toBe(' ')
        // D,E,F,G,H start at x=3
        expect(buffer.getCell(3, 0)?.char).toBe('D')
    })

    test('no output when clipBox and content area do not overlap (y)', () => {
        // Code at y=0..3, clipBox at y=10..13 — no overlap
        const node = makeCodeNode({ children: ['line1\nline2\nline3'], height: 3 })
        const buffer = new ScreenBuffer(40, 15)
        const clipBox = { x: 0, y: 10, width: 40, height: 3 }
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0, clipBox })

        for (let y = 0; y < 6; y++) {
            expect(buffer.getLine(y).trim()).toBe('')
        }
    })

    test('no output when clipBox and content area do not overlap (x)', () => {
        // Code at x=0..10, clipBox at x=15..25 — no overlap
        const node = makeCodeNode({ content: 'HELLO', width: 10, height: 1 })
        const buffer = new ScreenBuffer(30, 5)
        const clipBox = { x: 15, y: 0, width: 10, height: 1 }
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0, clipBox })

        for (let x = 0; x < 10; x++) {
            expect(buffer.getCell(x, 0)?.char ?? ' ').toBe(' ')
        }
    })

    test('without clipBox: full content renders normally', () => {
        // Baseline: no clipBox means no clipping beyond own dimensions
        const node = makeCodeNode({ children: ['line1\nline2\nline3'], height: 5 })
        const buffer = new ScreenBuffer(40, 10)
        behavior.render!(node, { buffer, cellStyle, adjustedY: 0 })  // no clipBox

        expect(buffer.getLine(0).trim()).toBe('line1')
        expect(buffer.getLine(1).trim()).toBe('line2')
        expect(buffer.getLine(2).trim()).toBe('line3')
    })
})
