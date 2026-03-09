/**
 * HTML Compliance — List Elements
 *
 * Tests: ul, ol, li
 *
 * VTerm renders list elements as plain block containers. There are no automatic
 * bullet points for ul or auto-numbers for ol. These browser list semantics are
 * not implemented and must be emulated with user CSS or template content.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, cellBg, cellColor } from './helpers'

// ─── li ──────────────────────────────────────────────────────────────────────

describe('li: UA styles', () => {
    test('li has no default bg', async () => {
        const buf = await renderCSS(
            `.item { width: 20; height: 1; }`,
            h('li', { class: 'item' }, 'item text')
        )
        expect(cellBg(buf, 0, 0)).toBeNull()
    })

    test('li has no default fg', async () => {
        const buf = await renderCSS(
            `.item { width: 20; height: 1; }`,
            h('li', { class: 'item' }, 'item text')
        )
        expect(cellColor(buf, 0, 0)).toBeNull()
    })
})

describe('li: text rendering', () => {
    test('li renders text content', async () => {
        const buf = await renderCSS(
            `.item { width: 20; height: 1; }`,
            h('li', { class: 'item' }, 'list item')
        )
        expect(rowSlice(buf, 0, 0, 9)).toBe('list item')
    })

    test('li with color renders correct fg', async () => {
        const buf = await renderCSS(
            `.item { width: 20; height: 1; color: yellow; }`,
            h('li', { class: 'item' }, 'yellow item')
        )
        const cell = buf.getCell(0, 0)
        expect(cell?.color).toBe('yellow')
    })

    test('li with padding-left offsets text', async () => {
        const buf = await renderCSS(
            `.item { width: 20; height: 1; padding-left: 2; }`,
            h('li', { class: 'item' }, 'indented')
        )
        expect(rowSlice(buf, 0, 0, 2)).toBe('  ')
        expect(rowSlice(buf, 0, 2, 8)).toBe('indented')
    })

    test('li does not prepend a bullet character', async () => {
        const buf = await renderCSS(
            `.item { width: 20; height: 1; }`,
            h('li', { class: 'item' }, 'no bullet')
        )
        // First char should be 'n' not '•', '-', or '*'
        const first = buf.getCell(0, 0)?.char
        expect(first).toBe('n')
    })
})

// ─── ul ──────────────────────────────────────────────────────────────────────

describe('ul: UA styles', () => {
    test('ul has no default bg or fg', async () => {
        const buf = await renderCSS(
            `.list { width: 20; height: 3; }
             .item { width: 20; height: 1; }`,
            h('ul', { class: 'list' },
                h('li', { class: 'item' }, 'a')
            )
        )
        expect(cellBg(buf, 0, 0)).toBeNull()
        expect(cellColor(buf, 0, 0)).toBeNull()
    })
})

describe('ul: list layout', () => {
    test('ul > li items stack vertically', async () => {
        const buf = await renderCSS(
            `.list { width: 20; height: 3; display: flex; flex-direction: column; }
             .item { width: 20; height: 1; }`,
            h('ul', { class: 'list' },
                h('li', { class: 'item' }, 'alpha'),
                h('li', { class: 'item' }, 'beta'),
                h('li', { class: 'item' }, 'gamma')
            )
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('alpha')
        expect(rowSlice(buf, 1, 0, 4)).toBe('beta')
        expect(rowSlice(buf, 2, 0, 5)).toBe('gamma')
    })

    test('ul does not prepend bullets to li children', async () => {
        const buf = await renderCSS(
            `.list { width: 20; height: 2; display: flex; flex-direction: column; }
             .item { width: 20; height: 1; }`,
            h('ul', { class: 'list' },
                h('li', { class: 'item' }, 'item one'),
                h('li', { class: 'item' }, 'item two')
            )
        )
        // First char of first li is 'i' not a bullet
        expect(buf.getCell(0, 0)?.char).toBe('i')
        expect(buf.getCell(0, 1)?.char).toBe('i')
    })

    test('ul with background fills list region', async () => {
        const buf = await renderCSS(
            `.list { width: 10; height: 2; background: blue; }
             .item { width: 10; height: 1; }`,
            h('ul', { class: 'list' },
                h('li', { class: 'item' }, 'a'),
                h('li', { class: 'item' }, 'b')
            )
        )
        expect(cellBg(buf, 0, 0)).toBe('blue')
    })
})

// ─── ol ──────────────────────────────────────────────────────────────────────

describe('ol: UA styles', () => {
    test('ol has no default bg or fg', async () => {
        const buf = await renderCSS(
            `.list { width: 20; height: 2; }
             .item { width: 20; height: 1; }`,
            h('ol', { class: 'list' },
                h('li', { class: 'item' }, 'item')
            )
        )
        expect(cellBg(buf, 0, 0)).toBeNull()
        expect(cellColor(buf, 0, 0)).toBeNull()
    })
})

describe('ol: list layout', () => {
    test('ol > li items stack vertically', async () => {
        const buf = await renderCSS(
            `.list { width: 20; height: 3; display: flex; flex-direction: column; }
             .item { width: 20; height: 1; }`,
            h('ol', { class: 'list' },
                h('li', { class: 'item' }, 'one'),
                h('li', { class: 'item' }, 'two'),
                h('li', { class: 'item' }, 'three')
            )
        )
        expect(rowSlice(buf, 0, 0, 3)).toBe('one')
        expect(rowSlice(buf, 1, 0, 3)).toBe('two')
        expect(rowSlice(buf, 2, 0, 5)).toBe('three')
    })

    test('ol does not auto-number li children', async () => {
        const buf = await renderCSS(
            `.list { width: 20; height: 2; display: flex; flex-direction: column; }
             .item { width: 20; height: 1; }`,
            h('ol', { class: 'list' },
                h('li', { class: 'item' }, 'apple'),
                h('li', { class: 'item' }, 'banana')
            )
        )
        // First char of first li should be 'a' (no "1." prefix)
        expect(buf.getCell(0, 0)?.char).toBe('a')
        expect(buf.getCell(0, 1)?.char).toBe('b')
    })

    test('ol and ul behave identically', async () => {
        const css = `.list { width: 20; height: 2; display: flex; flex-direction: column; }
                     .item { width: 20; height: 1; }`
        const children = [h('li', { class: 'item' }, 'first'), h('li', { class: 'item' }, 'second')]

        const bufUl = await renderCSS(css, h('ul', { class: 'list' }, ...children))
        const bufOl = await renderCSS(css, h('ol', { class: 'list' }, ...children))

        expect(rowSlice(bufUl, 0, 0, 5)).toBe(rowSlice(bufOl, 0, 0, 5))
        expect(rowSlice(bufUl, 1, 0, 6)).toBe(rowSlice(bufOl, 1, 0, 6))
    })
})

// ─── Nested lists ─────────────────────────────────────────────────────────────

describe('lists: nested', () => {
    test('nested ul inside ul li renders text', async () => {
        const buf = await renderCSS(
            `.list { width: 20; height: 3; display: flex; flex-direction: column; }
             .item { width: 20; height: 1; }
             .nested { width: 18; height: 1; padding-left: 2; }`,
            h('ul', { class: 'list' },
                h('li', { class: 'item' }, 'parent'),
                h('ul', { class: 'list' },
                    h('li', { class: 'nested' }, 'child')
                )
            )
        )
        expect(rowSlice(buf, 0, 0, 6)).toBe('parent')
        // child is indented by padding-left:2
        expect(rowSlice(buf, 1, 2, 5)).toBe('child')
    })
})
