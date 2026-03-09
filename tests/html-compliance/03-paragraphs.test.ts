/**
 * HTML Compliance — Paragraph Elements
 *
 * Tests: p, pre
 *
 * Both p and pre are block-level elements. VTerm does not preserve whitespace
 * differently for pre — tabs and multi-space sequences are not expanded or
 * preserved. They render identically to div.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, cellBg, cellColor } from './helpers'

// ─── p ───────────────────────────────────────────────────────────────────────

describe('p: UA styles', () => {
    test('p has no default bg', async () => {
        const buf = await renderCSS(
            `.para { width: 20; height: 1; }`,
            h('p', { class: 'para' }, 'text')
        )
        expect(cellBg(buf, 0, 0)).toBeNull()
    })

    test('p has no default fg', async () => {
        const buf = await renderCSS(
            `.para { width: 20; height: 1; }`,
            h('p', { class: 'para' }, 'text')
        )
        expect(cellColor(buf, 0, 0)).toBeNull()
    })
})

describe('p: text rendering', () => {
    test('renders text content at (0, 0)', async () => {
        const buf = await renderCSS(
            `.para { width: 20; height: 1; }`,
            h('p', { class: 'para' }, 'hello world')
        )
        expect(rowSlice(buf, 0, 0, 11)).toBe('hello world')
    })

    test('text clips at width boundary', async () => {
        const buf = await renderCSS(
            `.para { width: 5; height: 1; }`,
            h('p', { class: 'para' }, 'toolong')
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('toolo')
        expect(buf.getCell(5, 0)?.char ?? ' ').toBe(' ')
    })

    test('text with padding-left is offset', async () => {
        const buf = await renderCSS(
            `.para { width: 15; height: 1; padding-left: 2; }`,
            h('p', { class: 'para' }, 'hi')
        )
        expect(rowSlice(buf, 0, 0, 2)).toBe('  ')
        expect(rowSlice(buf, 0, 2, 2)).toBe('hi')
    })

    test('text with color renders correct fg', async () => {
        const buf = await renderCSS(
            `.para { width: 15; height: 1; color: green; }`,
            h('p', { class: 'para' }, 'green text')
        )
        // Text is rendered via text child node; color applies to that node
        // The text node at (0,0) should have green color
        const cell = buf.getCell(0, 0)
        expect(cell?.color).toBe('green')
    })

    test('background fills full p box', async () => {
        const buf = await renderCSS(
            `.para { width: 6; height: 1; background: yellow; }`,
            h('p', { class: 'para' }, 'hi')
        )
        for (let x = 0; x < 6; x++) {
            expect(cellBg(buf, x, 0)).toBe('yellow')
        }
    })
})

describe('p: block layout', () => {
    test('two p elements stack vertically', async () => {
        const buf = await renderCSS(
            `.para { width: 20; height: 1; }`,
            h('div', {},
                h('p', { class: 'para' }, 'first'),
                h('p', { class: 'para' }, 'second')
            )
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('first')
        expect(rowSlice(buf, 1, 0, 6)).toBe('second')
    })

    test('three p elements stack at y=0,1,2', async () => {
        const buf = await renderCSS(
            `.para { width: 20; height: 1; }`,
            h('div', {},
                h('p', { class: 'para' }, 'a'),
                h('p', { class: 'para' }, 'b'),
                h('p', { class: 'para' }, 'c')
            )
        )
        expect(rowSlice(buf, 0, 0, 1)).toBe('a')
        expect(rowSlice(buf, 1, 0, 1)).toBe('b')
        expect(rowSlice(buf, 2, 0, 1)).toBe('c')
    })
})

// ─── pre ─────────────────────────────────────────────────────────────────────

describe('pre: UA styles', () => {
    test('pre has no default bg or fg', async () => {
        const buf = await renderCSS(
            `.pre { width: 20; height: 1; }`,
            h('pre', { class: 'pre' }, 'code here')
        )
        expect(cellBg(buf, 0, 0)).toBeNull()
        expect(cellColor(buf, 0, 0)).toBeNull()
    })
})

describe('pre: text rendering', () => {
    test('pre renders text content', async () => {
        const buf = await renderCSS(
            `.pre { width: 20; height: 1; }`,
            h('pre', { class: 'pre' }, 'function() {}')
        )
        expect(rowSlice(buf, 0, 0, 13)).toBe('function() {}')
    })

    test('pre behaves identically to p for plain text', async () => {
        const text = 'same text'
        const bufP = await renderCSS(
            `.el { width: 20; height: 1; }`,
            h('p', { class: 'el' }, text)
        )
        const bufPre = await renderCSS(
            `.el { width: 20; height: 1; }`,
            h('pre', { class: 'el' }, text)
        )
        expect(rowSlice(bufP, 0, 0, text.length)).toBe(rowSlice(bufPre, 0, 0, text.length))
    })

    test('pre stacks vertically with other block elements', async () => {
        const buf = await renderCSS(
            `.el { width: 20; height: 1; }`,
            h('div', {},
                h('p', { class: 'el' }, 'paragraph'),
                h('pre', { class: 'el' }, 'preformatted')
            )
        )
        expect(rowSlice(buf, 0, 0, 9)).toBe('paragraph')
        expect(rowSlice(buf, 1, 0, 12)).toBe('preformatted')
    })
})
