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

// ─── Nested element inheritance ───────────────────────────────────────────────
//
// In native CSS, `color` and `text-decoration` are inherited properties.
// A <div> or <p> inside an <a> should receive cyan + underline from the ancestor
// unless the child overrides them with its own CSS.

describe('a: nested element inherits UA styles', () => {
    test('div child of a inherits UA cyan color', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }
             .inner { width: 10; height: 1; }`,
            h('a', { class: 'link' },
                h('div', { class: 'inner' }, 'hello')
            )
        )
        expect(cellColor(buf, 0, 0)).toBe('cyan')
    })

    test('div child of a inherits UA underline', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }
             .inner { width: 10; height: 1; }`,
            h('a', { class: 'link' },
                h('div', { class: 'inner' }, 'hello')
            )
        )
        expect(cellUnderline(buf, 0, 0)).toBe(true)
    })

    test('p child of a inherits UA cyan and underline', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }
             .text { width: 12; height: 1; }`,
            h('a', { class: 'link' },
                h('p', { class: 'text' }, 'paragraph')
            )
        )
        expect(cellColor(buf, 0, 0)).toBe('cyan')
        expect(cellUnderline(buf, 0, 0)).toBe(true)
    })

    test('code child of a inherits UA cyan and underline', async () => {
        const buf = await renderCSS(
            `.link { width: 20; height: 1; }
             .snippet { width: 12; height: 1; }`,
            h('a', { class: 'link' },
                h('code', { class: 'snippet' }, 'some-route')
            )
        )
        // code element text cells should be cyan + underline from ancestor <a>
        expect(cellColor(buf, 0, 0)).toBe('cyan')
        expect(cellUnderline(buf, 0, 0)).toBe(true)
    })

    test('text in nested div renders with cyan across all cells', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }
             .inner { width: 10; height: 1; }`,
            h('a', { class: 'link' },
                h('div', { class: 'inner' }, 'Link text')
            )
        )
        for (let x = 0; x < 9; x++) {
            expect(cellColor(buf, x, 0)).toBe('cyan')
        }
    })

    test('text in nested div renders with underline across all cells', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }
             .inner { width: 10; height: 1; }`,
            h('a', { class: 'link' },
                h('div', { class: 'inner' }, 'Link text')
            )
        )
        for (let x = 0; x < 9; x++) {
            expect(cellUnderline(buf, x, 0)).toBe(true)
        }
    })

    test('child color override wins over inherited a cyan', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }
             .inner { width: 10; height: 1; color: white; }`,
            h('a', { class: 'link' },
                h('div', { class: 'inner' }, 'Override')
            )
        )
        // child explicitly sets color: white, which should override inherited cyan
        expect(cellColor(buf, 0, 0)).toBe('white')
    })

    test('child underline:none override wins over inherited a underline', async () => {
        const buf = await renderCSS(
            `.link { width: 20; height: 1; }
             .inner { width: 15; height: 1; text-decoration: none; }`,
            h('a', { class: 'link' },
                h('div', { class: 'inner' }, 'No underline')
            )
        )
        expect(cellUnderline(buf, 0, 0)).toBe(false)
    })

    test('deeply nested element (a > div > p) inherits cyan', async () => {
        const buf = await renderCSS(
            `.link { width: 20; height: 1; }
             .wrap { width: 18; height: 1; }
             .text { width: 16; height: 1; }`,
            h('a', { class: 'link' },
                h('div', { class: 'wrap' },
                    h('p', { class: 'text' }, 'deep text')
                )
            )
        )
        expect(cellColor(buf, 0, 0)).toBe('cyan')
        expect(cellUnderline(buf, 0, 0)).toBe(true)
    })

    test('multiple a elements with nested divs each inherit their own UA styles', async () => {
        const buf = await renderCSS(
            `.link { width: 15; height: 1; }
             .inner { width: 12; height: 1; }`,
            h('div', {}, [
                h('a', { class: 'link' },
                    h('div', { class: 'inner' }, 'first')
                ),
                h('a', { class: 'link' },
                    h('div', { class: 'inner' }, 'second')
                )
            ])
        )
        expect(cellColor(buf, 0, 0)).toBe('cyan')
        expect(cellUnderline(buf, 0, 0)).toBe(true)
        expect(cellColor(buf, 0, 1)).toBe('cyan')
        expect(cellUnderline(buf, 0, 1)).toBe(true)
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
