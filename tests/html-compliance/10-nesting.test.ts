/**
 * HTML Compliance — Cross-Element Nesting
 *
 * Tests that different HTML elements compose correctly when nested together.
 * Covers common real-world patterns: nav/ul/li, header/h1, main/form, etc.
 *
 * All tests assert final rendered coordinates — text at the right (x, y)
 * accounting for all ancestor padding and border offsets.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, cellBg, cellColor, cellUnderline } from './helpers'

// ─── Basic nesting ─────────────────────────────────────────────────────────────

describe('nesting: div > p > text', () => {
    test('text renders at sum of ancestor offsets', async () => {
        const buf = await renderCSS(
            `.outer { width: 30; height: 3; padding: 1; display: flex; flex-direction: column; }
             .para  { width: 28; height: 1; }`,
            h('div', { class: 'outer' },
                h('p', { class: 'para' }, 'inner text')
            )
        )
        // outer padding=1 → child starts at (1, 1)
        expect(rowSlice(buf, 1, 1, 10)).toBe('inner text')
    })

    test('section > article > p text renders at correct depth', async () => {
        const buf = await renderCSS(
            `.s { width: 40; height: 5; padding: 1; display: flex; flex-direction: column; }
             .a { width: 38; height: 3; padding: 1; display: flex; flex-direction: column; }
             .p { width: 36; height: 1; }`,
            h('section', { class: 's' },
                h('article', { class: 'a' },
                    h('p', { class: 'p' }, 'deep text')
                )
            )
        )
        // section pad=1 → article at (1,1); article pad=1 → p at (2,2)
        expect(rowSlice(buf, 2, 2, 9)).toBe('deep text')
    })
})

// ─── List patterns ────────────────────────────────────────────────────────────

describe('nesting: nav > ul > li', () => {
    test('nav with ul and li items renders text at correct y', async () => {
        const buf = await renderCSS(
            `.nav  { width: 20; height: 3; display: flex; flex-direction: column; }
             .list { width: 20; height: 3; display: flex; flex-direction: column; }
             .item { width: 20; height: 1; }`,
            h('nav', { class: 'nav' },
                h('ul', { class: 'list' },
                    h('li', { class: 'item' }, 'Home'),
                    h('li', { class: 'item' }, 'About'),
                    h('li', { class: 'item' }, 'Contact')
                )
            )
        )
        expect(rowSlice(buf, 0, 0, 4)).toBe('Home')
        expect(rowSlice(buf, 1, 0, 5)).toBe('About')
        expect(rowSlice(buf, 2, 0, 7)).toBe('Contact')
    })

    test('nav with ul li padding-left indents items', async () => {
        const buf = await renderCSS(
            `.nav  { width: 20; height: 2; display: flex; flex-direction: column; }
             .list { width: 20; height: 2; display: flex; flex-direction: column; }
             .item { width: 20; height: 1; padding-left: 2; }`,
            h('nav', { class: 'nav' },
                h('ul', { class: 'list' },
                    h('li', { class: 'item' }, 'First'),
                    h('li', { class: 'item' }, 'Second')
                )
            )
        )
        expect(rowSlice(buf, 0, 0, 2)).toBe('  ')
        expect(rowSlice(buf, 0, 2, 5)).toBe('First')
    })
})

// ─── Page layout patterns ─────────────────────────────────────────────────────

describe('nesting: header + main layout', () => {
    test('header with h1 above main with p', async () => {
        const buf = await renderCSS(
            `.header { width: 40; height: 1; }
             .main   { width: 40; height: 3; display: flex; flex-direction: column; }
             .para   { width: 40; height: 1; }`,
            h('div', {},
                h('header', { class: 'header' },
                    h('h1', { class: 'header' }, 'My App')
                ),
                h('main', { class: 'main' },
                    h('p', { class: 'para' }, 'Welcome to my app'),
                    h('p', { class: 'para' }, 'Second paragraph')
                )
            )
        )
        expect(rowSlice(buf, 0, 0, 6)).toBe('My App')
        expect(rowSlice(buf, 1, 0, 17)).toBe('Welcome to my app')
        expect(rowSlice(buf, 2, 0, 16)).toBe('Second paragraph')
    })
})

// ─── Form elements inside containers ─────────────────────────────────────────

describe('nesting: form elements inside containers', () => {
    test('div > button + input stack vertically with correct UA styles', async () => {
        const buf = await renderCSS(
            `.btn { width: 15; height: 1; }
             .inp { width: 15; height: 1; }`,
            h('div', {},
                h('button', { class: 'btn' }, 'Submit'),
                h('input', { class: 'inp' })
            )
        )
        expect(cellBg(buf, 0, 0)).toBe('blue')
        expect(cellBg(buf, 0, 1)).toBe('grey')
    })

    test('main > div > input: input renders with UA grey', async () => {
        const buf = await renderCSS(
            `.main { width: 40; height: 3; display: flex; flex-direction: column; }
             .wrap { width: 40; height: 1; }
             .inp  { width: 20; height: 1; }`,
            h('main', { class: 'main' },
                h('div', { class: 'wrap' },
                    h('input', { class: 'inp' })
                )
            )
        )
        expect(cellBg(buf, 0, 0)).toBe('grey')
    })

    test('nav > a elements render with UA cyan color', async () => {
        const buf = await renderCSS(
            `.nav  { width: 40; height: 2; display: flex; flex-direction: column; }
             .link { width: 20; height: 1; }`,
            h('nav', { class: 'nav' },
                h('a', { class: 'link' }, 'home'),
                h('a', { class: 'link' }, 'settings')
            )
        )
        expect(cellColor(buf, 0, 0)).toBe('cyan')
        expect(cellUnderline(buf, 0, 0)).toBe(true)
        expect(cellColor(buf, 0, 1)).toBe('cyan')
    })

    test('div > textarea has grey UA bg at correct position', async () => {
        const buf = await renderCSS(
            `.wrap { width: 30; height: 5; padding: 1; display: flex; flex-direction: column; }
             .ta   { width: 28; height: 3; }`,
            h('div', { class: 'wrap' },
                h('textarea', { class: 'ta' })
            )
        )
        // textarea starts at (1,1) due to parent padding
        expect(cellBg(buf, 1, 1)).toBe('grey')
    })
})

// ─── Deep nesting ─────────────────────────────────────────────────────────────

describe('nesting: deep nesting (5 levels)', () => {
    test('text at 5-level nesting renders at correct offset', async () => {
        const buf = await renderCSS(
            `.l1 { width: 40; height: 10; padding-left: 1; display: flex; flex-direction: column; }
             .l2 { width: 39; height: 9;  padding-left: 1; display: flex; flex-direction: column; }
             .l3 { width: 38; height: 8;  padding-left: 1; display: flex; flex-direction: column; }
             .l4 { width: 37; height: 7;  padding-left: 1; display: flex; flex-direction: column; }
             .l5 { width: 36; height: 1; }`,
            h('div', { class: 'l1' },
                h('div', { class: 'l2' },
                    h('section', { class: 'l3' },
                        h('article', { class: 'l4' },
                            h('p', { class: 'l5' }, 'deep')
                        )
                    )
                )
            )
        )
        // Each level adds 1 to x; text at x=4, y=0
        expect(rowSlice(buf, 0, 4, 4)).toBe('deep')
    })
})

// ─── Container with border + inner container ──────────────────────────────────

describe('nesting: bordered container with inner content', () => {
    test('border on outer div offsets inner content', async () => {
        const buf = await renderCSS(
            `.outer { width: 20; height: 5; border: 1px solid white; display: flex; flex-direction: column; }
             .inner { width: 18; height: 1; }`,
            h('div', { class: 'outer' },
                h('p', { class: 'inner' }, 'inside')
            )
        )
        // Border is 1 cell wide → content starts at (1,1)
        expect(rowSlice(buf, 1, 1, 6)).toBe('inside')
    })

    test('nested borders accumulate offset', async () => {
        const buf = await renderCSS(
            `.outer { width: 22; height: 7; border: 1px solid white; display: flex; flex-direction: column; }
             .inner { width: 18; height: 3; border: 1px solid cyan; display: flex; flex-direction: column; }
             .text  { width: 16; height: 1; }`,
            h('div', { class: 'outer' },
                h('div', { class: 'inner' },
                    h('p', { class: 'text' }, 'nested')
                )
            )
        )
        // outer border +1 → inner at (1,1); inner border +1 → text at (2,2)
        expect(rowSlice(buf, 2, 2, 6)).toBe('nested')
    })
})

// ─── Sibling groups ───────────────────────────────────────────────────────────

describe('nesting: mixed sibling elements', () => {
    test('h1 + p + button render in order', async () => {
        const buf = await renderCSS(
            `.h { width: 30; height: 1; }
             .p { width: 30; height: 1; }
             .b { width: 30; height: 1; }`,
            h('div', {},
                h('h1', { class: 'h' }, 'Title'),
                h('p', { class: 'p' }, 'Paragraph'),
                h('button', { class: 'b' }, 'Action')
            )
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('Title')
        expect(rowSlice(buf, 1, 0, 9)).toBe('Paragraph')
        expect(rowSlice(buf, 2, 0, 6)).toBe('Action')
        // Button at y=2 should have blue bg
        expect(cellBg(buf, 0, 2)).toBe('blue')
    })
})
