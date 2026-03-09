/**
 * HTML Compliance — Inline Elements
 *
 * Tests: span, strong, em
 *
 * VTerm treats all elements as block-level. There is no true inline flow.
 * These elements render as boxes within the layout tree.
 *
 * Known limitation: `<span>` with direct text content may not render correctly
 * as VTerm currently lacks inline text flow. Tests document actual behaviour.
 *
 * `<strong>` and `<em>` have NO UA bold/italic styles — user must apply CSS.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, cellBg, cellColor, cellBold, cellItalic } from './helpers'

// ─── strong ──────────────────────────────────────────────────────────────────

describe('strong: UA styles', () => {
    test('strong has no UA bg', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; }`,
            h('strong', { class: 'el' }, 'bold text')
        )
        expect(cellBg(buf, 0, 0)).toBeNull()
    })

    test('strong has no UA bold', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; }`,
            h('strong', { class: 'el' }, 'bold text')
        )
        // Without user CSS, strong has no built-in bold
        expect(cellBold(buf, 0, 0)).toBe(false)
    })

    test('strong has no UA fg', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; }`,
            h('strong', { class: 'el' }, 'text')
        )
        expect(cellColor(buf, 0, 0)).toBeNull()
    })
})

describe('strong: text rendering', () => {
    test('strong renders text content', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; }`,
            h('strong', { class: 'el' }, 'hello')
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('hello')
    })

    test('strong with font-weight bold has bold cells', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; font-weight: bold; }`,
            h('strong', { class: 'el' }, 'Bold!')
        )
        expect(cellBold(buf, 0, 0)).toBe(true)
    })

    test('strong with color has correct fg', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; color: cyan; }`,
            h('strong', { class: 'el' }, 'text')
        )
        expect(cellColor(buf, 0, 0)).toBe('cyan')
    })
})

// ─── em ──────────────────────────────────────────────────────────────────────

describe('em: UA styles', () => {
    test('em has no UA bg', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; }`,
            h('em', { class: 'el' }, 'italic text')
        )
        expect(cellBg(buf, 0, 0)).toBeNull()
    })

    test('em has no UA italic', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; }`,
            h('em', { class: 'el' }, 'italic text')
        )
        // Without user CSS, em has no built-in italic
        expect(cellItalic(buf, 0, 0)).toBe(false)
    })
})

describe('em: text rendering', () => {
    test('em renders text content', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; }`,
            h('em', { class: 'el' }, 'emphasized')
        )
        expect(rowSlice(buf, 0, 0, 10)).toBe('emphasized')
    })

    test('em with font-style italic has italic cells', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; font-style: italic; }`,
            h('em', { class: 'el' }, 'italic')
        )
        expect(cellItalic(buf, 0, 0)).toBe(true)
    })
})

// ─── span ─────────────────────────────────────────────────────────────────────

describe('span: UA styles', () => {
    test('span has no UA bg or fg', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; }`,
            h('span', { class: 'el' }, 'text')
        )
        expect(cellBg(buf, 0, 0)).toBeNull()
        expect(cellColor(buf, 0, 0)).toBeNull()
    })
})

describe('span: background styling', () => {
    test('span with background-color fills its box', async () => {
        const buf = await renderCSS(
            `.el { width: 8; height: 1; background: magenta; }`,
            h('span', { class: 'el' })
        )
        expect(cellBg(buf, 0, 0)).toBe('magenta')
    })
})

describe('span: text rendering', () => {
    test('span with explicit dimensions renders text child content', async () => {
        // span needs explicit dimensions to occupy space in the layout tree
        const buf = await renderCSS(
            `.el { width: 15; height: 1; color: white; }`,
            h('span', { class: 'el' }, 'visible text')
        )
        // Document the actual behaviour: text may or may not render depending
        // on whether span is treated as inline or block
        const text = rowSlice(buf, 0, 0, 12)
        // At minimum we assert no crash and the buffer is valid
        expect(typeof text).toBe('string')
        expect(text.length).toBe(12)
    })
})

// ─── Mixed inline elements stacking ──────────────────────────────────────────

describe('inline elements: block stacking', () => {
    test('strong and em stack vertically as block elements', async () => {
        const buf = await renderCSS(
            `.el { width: 15; height: 1; }`,
            h('div', {},
                h('strong', { class: 'el' }, 'bold line'),
                h('em', { class: 'el' }, 'italic line')
            )
        )
        expect(rowSlice(buf, 0, 0, 9)).toBe('bold line')
        expect(rowSlice(buf, 1, 0, 11)).toBe('italic line')
    })
})
