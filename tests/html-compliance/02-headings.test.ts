/**
 * HTML Compliance — Heading Elements
 *
 * Tests: h1, h2, h3, h4, h5, h6
 *
 * Headings are block-level elements. VTerm does NOT apply a UA bold style —
 * the browser's user-agent bold for headings is absent. User CSS must be used
 * to apply bold, larger apparent weight, etc.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, cellBg, cellColor, cellBold } from './helpers'

const headings = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const

// ─── UA styles ────────────────────────────────────────────────────────────────

describe('headings: UA styles', () => {
    for (const tag of headings) {
        test(`${tag} has no UA bg`, async () => {
            const buf = await renderCSS(
                `.h { width: 20; height: 1; }`,
                h(tag, { class: 'h' }, 'Title')
            )
            expect(cellBg(buf, 0, 0)).toBeNull()
        })

        test(`${tag} has no UA fg`, async () => {
            const buf = await renderCSS(
                `.h { width: 20; height: 1; }`,
                h(tag, { class: 'h' }, 'Title')
            )
            expect(cellColor(buf, 0, 0)).toBeNull()
        })

        test(`${tag} has no UA bold`, async () => {
            const buf = await renderCSS(
                `.h { width: 20; height: 1; }`,
                h(tag, { class: 'h' }, 'Title')
            )
            // Text content renders via a text child node; check first char
            expect(cellBold(buf, 0, 0)).toBe(false)
        })
    }
})

// ─── Text content ─────────────────────────────────────────────────────────────

describe('headings: text rendering', () => {
    for (const tag of headings) {
        test(`${tag} renders text content`, async () => {
            const buf = await renderCSS(
                `.h { width: 20; height: 1; }`,
                h(tag, { class: 'h' }, 'Hello')
            )
            expect(rowSlice(buf, 0, 0, 5)).toBe('Hello')
        })
    }

    test('h1 with font-weight: bold renders bold cells', async () => {
        const buf = await renderCSS(
            `.h { width: 20; height: 1; font-weight: bold; }`,
            h('h1', { class: 'h' }, 'Bold')
        )
        expect(cellBold(buf, 0, 0)).toBe(true)
    })

    test('h2 with color renders correct fg', async () => {
        const buf = await renderCSS(
            `.h { width: 20; height: 1; color: yellow; }`,
            h('h2', { class: 'h' }, 'Yellow')
        )
        expect(cellColor(buf, 0, 0)).toBe('yellow')
    })
})

// ─── Block layout ─────────────────────────────────────────────────────────────

describe('headings: block stacking', () => {
    test('h1 and h2 stack vertically', async () => {
        const buf = await renderCSS(
            `.h { width: 20; height: 1; }`,
            h('div', {},
                h('h1', { class: 'h' }, 'First'),
                h('h2', { class: 'h' }, 'Second')
            )
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('First')
        expect(rowSlice(buf, 1, 0, 6)).toBe('Second')
    })

    test('h1 through h6 all stack in order', async () => {
        const css = headings.map((t, i) => `.h${i + 1} { width: 20; height: 1; }`).join('\n')
        const children = headings.map((tag, i) => h(tag, { class: `h${i + 1}` }, `row${i}`))
        const buf = await renderCSS(css, h('div', {}, ...children))

        for (let i = 0; i < headings.length; i++) {
            expect(rowSlice(buf, i, 0, 4)).toBe(`row${i}`)
        }
    })

    test('h1 background fills its row', async () => {
        const buf = await renderCSS(
            `.h { width: 10; height: 1; background: magenta; }`,
            h('h1', { class: 'h' }, 'Hi')
        )
        for (let x = 0; x < 10; x++) {
            expect(cellBg(buf, x, 0)).toBe('magenta')
        }
    })
})

// ─── h1–h6 all behave identically without user CSS ───────────────────────────

describe('headings: h1–h6 are visually equivalent without user CSS', () => {
    test('h1 and h6 render identical text style', async () => {
        const buf1 = await renderCSS(
            `.h { width: 10; height: 1; }`,
            h('h1', { class: 'h' }, 'same')
        )
        const buf6 = await renderCSS(
            `.h { width: 10; height: 1; }`,
            h('h6', { class: 'h' }, 'same')
        )
        // Both should have same text, no bg, no fg, no bold
        expect(rowSlice(buf1, 0, 0, 4)).toBe(rowSlice(buf6, 0, 0, 4))
        expect(cellBold(buf1, 0, 0)).toBe(cellBold(buf6, 0, 0))
        expect(cellBg(buf1, 0, 0)).toBe(cellBg(buf6, 0, 0))
    })
})
