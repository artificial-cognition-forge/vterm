/**
 * HTML Compliance — Generic Container Elements
 *
 * Tests: div, section, article, header, footer, main, nav, aside
 *
 * All semantic container elements behave identically in VTerm — they are
 * block-level box nodes with no UA styles. Text content renders inside the
 * content area; children render at computed positions.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, cellBg, cellColor } from './helpers'

// ─── div ─────────────────────────────────────────────────────────────────────

describe('div: UA styles', () => {
    test('div has no default bg', async () => {
        const buf = await renderCSS(
            `.box { width: 10; height: 2; }`,
            h('div', { class: 'box' })
        )
        expect(cellBg(buf, 0, 0)).toBeNull()
    })

    test('div has no default fg', async () => {
        const buf = await renderCSS(
            `.box { width: 10; height: 2; }`,
            h('div', { class: 'box' })
        )
        expect(cellColor(buf, 0, 0)).toBeNull()
    })
})

describe('div: text content', () => {
    test('renders text content inside content area', async () => {
        const buf = await renderCSS(
            `.box { width: 10; height: 1; }`,
            h('div', { class: 'box' }, 'hello')
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('hello')
    })

    test('text with padding-left is offset', async () => {
        const buf = await renderCSS(
            `.box { width: 15; height: 1; padding-left: 3; }`,
            h('div', { class: 'box' }, 'hi')
        )
        expect(rowSlice(buf, 0, 0, 3)).toBe('   ')
        expect(rowSlice(buf, 0, 3, 2)).toBe('hi')
    })

    test('text with padding-top is offset downward', async () => {
        const buf = await renderCSS(
            `.box { width: 10; height: 3; padding-top: 1; }`,
            h('div', { class: 'box' }, 'hi')
        )
        expect(rowSlice(buf, 0, 0, 2)).toBe('  ')
        expect(rowSlice(buf, 1, 0, 2)).toBe('hi')
    })

    test('text longer than box is clipped at right edge', async () => {
        const buf = await renderCSS(
            `.box { width: 5; height: 1; }`,
            h('div', { class: 'box' }, 'toolongtext')
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('toolo')
        // No chars beyond x=4
        expect(buf.getCell(5, 0)?.char ?? ' ').toBe(' ')
    })
})

describe('div: background fill', () => {
    test('background fills all cells in box', async () => {
        const buf = await renderCSS(
            `.box { width: 4; height: 2; background: blue; }`,
            h('div', { class: 'box' })
        )
        for (let y = 0; y < 2; y++) {
            for (let x = 0; x < 4; x++) {
                expect(cellBg(buf, x, y)).toBe('blue')
            }
        }
    })

    test('background does not extend past box width', async () => {
        const buf = await renderCSS(
            `.box { width: 4; height: 1; background: red; }`,
            h('div', { class: 'box' })
        )
        expect(cellBg(buf, 4, 0)).toBeNull()
    })

    test('background does not extend past box height', async () => {
        const buf = await renderCSS(
            `.box { width: 4; height: 1; background: red; }`,
            h('div', { class: 'box' })
        )
        expect(cellBg(buf, 0, 1)).toBeNull()
    })
})

describe('div: children', () => {
    test('child div renders text at child y offset', async () => {
        const buf = await renderCSS(
            `.parent { width: 20; height: 4; display: flex; flex-direction: column; }
             .child  { width: 20; height: 2; }`,
            h('div', { class: 'parent' },
                h('div', { class: 'child' }, 'first'),
                h('div', { class: 'child' }, 'second')
            )
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('first')
        expect(rowSlice(buf, 2, 0, 6)).toBe('second')
    })

    test('nested div text is offset by parent padding', async () => {
        const buf = await renderCSS(
            `.parent { width: 20; height: 4; padding: 1; display: flex; flex-direction: column; }
             .child  { width: 18; height: 1; }`,
            h('div', { class: 'parent' },
                h('div', { class: 'child' }, 'inner')
            )
        )
        // Parent has padding:1, so child starts at (1, 1)
        expect(rowSlice(buf, 1, 1, 5)).toBe('inner')
    })

    test('two divs stack vertically by default', async () => {
        const buf = await renderCSS(
            `.box { width: 20; height: 1; }`,
            h('div', {},
                h('div', { class: 'box' }, 'row0'),
                h('div', { class: 'box' }, 'row1')
            )
        )
        expect(rowSlice(buf, 0, 0, 4)).toBe('row0')
        expect(rowSlice(buf, 1, 0, 4)).toBe('row1')
    })
})

// ─── Semantic aliases behave identically to div ───────────────────────────────

const semanticElements = ['section', 'article', 'header', 'footer', 'main', 'nav', 'aside']

for (const tag of semanticElements) {
    describe(`${tag}: behaves like div`, () => {
        test(`${tag} has no default bg or fg`, async () => {
            const buf = await renderCSS(
                `.box { width: 10; height: 1; }`,
                h(tag, { class: 'box' })
            )
            expect(cellBg(buf, 0, 0)).toBeNull()
            expect(cellColor(buf, 0, 0)).toBeNull()
        })

        test(`${tag} renders text content`, async () => {
            const buf = await renderCSS(
                `.box { width: 10; height: 1; }`,
                h(tag, { class: 'box' }, 'test')
            )
            expect(rowSlice(buf, 0, 0, 4)).toBe('test')
        })

        test(`${tag} renders with background when set`, async () => {
            const buf = await renderCSS(
                `.box { width: 5; height: 1; background: cyan; }`,
                h(tag, { class: 'box' })
            )
            expect(cellBg(buf, 0, 0)).toBe('cyan')
        })
    })
}
