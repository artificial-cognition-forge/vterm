/**
 * HTML Compliance — Anchor Element
 *
 * Tests: a
 *
 * The anchor element receives UA styles: fg='cyan', underline=true.
 * These can be overridden by user CSS. The `href` attribute is stored in props
 * but has no navigational effect — VTerm does not implement URL navigation.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, cellColor, cellUnderline, cellBg } from './helpers'

// ─── UA styles ────────────────────────────────────────────────────────────────

describe('a: UA styles', () => {
    test('anchor has UA fg: cyan', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }`,
            h('a', { class: 'link' }, 'Click here')
        )
        expect(cellColor(buf, 0, 0)).toBe('cyan')
    })

    test('anchor has UA underline: true', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }`,
            h('a', { class: 'link' }, 'Click here')
        )
        expect(cellUnderline(buf, 0, 0)).toBe(true)
    })

    test('anchor has no UA bg', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }`,
            h('a', { class: 'link' }, 'Click here')
        )
        expect(cellBg(buf, 0, 0)).toBeNull()
    })

    test('UA cyan applies to all text cells in anchor', async () => {
        const buf = await renderCSS(
            `.link { width: 10; height: 1; }`,
            h('a', { class: 'link' }, 'Link text')
        )
        for (let x = 0; x < 9; x++) {
            expect(cellColor(buf, x, 0)).toBe('cyan')
        }
    })

    test('UA underline applies to all text cells in anchor', async () => {
        const buf = await renderCSS(
            `.link { width: 10; height: 1; }`,
            h('a', { class: 'link' }, 'Link text')
        )
        for (let x = 0; x < 9; x++) {
            expect(cellUnderline(buf, x, 0)).toBe(true)
        }
    })
})

// ─── CSS overrides ────────────────────────────────────────────────────────────

describe('a: user CSS overrides UA', () => {
    test('user color overrides UA cyan', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; color: white; }`,
            h('a', { class: 'link' }, 'Custom color')
        )
        expect(cellColor(buf, 0, 0)).toBe('white')
    })

    test('user background-color applies on top of UA', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; background: blue; }`,
            h('a', { class: 'link' }, 'With bg')
        )
        expect(cellBg(buf, 0, 0)).toBe('blue')
    })
})

// ─── Text rendering ───────────────────────────────────────────────────────────

describe('a: text rendering', () => {
    test('renders text content correctly', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }`,
            h('a', { class: 'link' }, 'hello')
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('hello')
    })

    test('text clips at container width', async () => {
        const buf = await renderCSS(
            `.link { width: 5; height: 1; }`,
            h('a', { class: 'link' }, 'toolonganchortext')
        )
        expect(buf.getCell(5, 0)?.char ?? ' ').toBe(' ')
    })

    test('href attribute does not cause error (stored but ignored)', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }`,
            h('a', { class: 'link', href: 'https://example.com' }, 'External link')
        )
        // Just verify it renders without crash and UA styles still apply
        expect(cellColor(buf, 0, 0)).toBe('cyan')
        expect(cellUnderline(buf, 0, 0)).toBe(true)
    })
})

// ─── Block layout ─────────────────────────────────────────────────────────────

describe('a: block stacking', () => {
    test('two anchor elements stack vertically', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }`,
            h('div', {},
                h('a', { class: 'link' }, 'first link'),
                h('a', { class: 'link' }, 'second link')
            )
        )
        expect(rowSlice(buf, 0, 0, 10)).toBe('first link')
        expect(rowSlice(buf, 1, 0, 11)).toBe('second link')
    })

    test('anchor inside container: UA styles applied regardless of parent', async () => {
        const buf = await renderCSS(
            `.nav { width: 30; height: 2; }
             .link { width: 15; height: 1; }`,
            h('nav', { class: 'nav' },
                h('a', { class: 'link' }, 'home')
            )
        )
        expect(cellColor(buf, 0, 0)).toBe('cyan')
        expect(cellUnderline(buf, 0, 0)).toBe(true)
    })
})
