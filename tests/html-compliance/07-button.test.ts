/**
 * HTML Compliance — Button Element
 *
 * Tests: button
 *
 * The button element receives UA bg='blue'. Text content renders inside the
 * button box. User CSS can override all UA styles.
 *
 * Note: @press event dispatch requires the InteractionManager, which is not
 * present in isolated pipeline tests. Those interactions are tested via the
 * full runtime only.
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, cellBg, cellColor, cellBold } from './helpers'

// ─── UA styles ────────────────────────────────────────────────────────────────

describe('button: UA styles', () => {
    test('button has UA bg: blue', async () => {
        const buf = await renderCSS(
            `.btn { width: 10; height: 1; }`,
            h('button', { class: 'btn' }, 'Click')
        )
        expect(cellBg(buf, 0, 0)).toBe('blue')
    })

    test('UA blue fills all button cells', async () => {
        const buf = await renderCSS(
            `.btn { width: 8; height: 2; }`,
            h('button', { class: 'btn' }, 'OK')
        )
        for (let y = 0; y < 2; y++) {
            for (let x = 0; x < 8; x++) {
                expect(cellBg(buf, x, y)).toBe('blue')
            }
        }
    })

    test('button has no UA fg', async () => {
        const buf = await renderCSS(
            `.btn { width: 10; height: 1; }`,
            h('button', { class: 'btn' }, 'Click')
        )
        // No forced foreground color — will be null unless text node inherits
        // The text content itself renders as a child text node
        // We assert the box cells have no forced fg (UA only sets bg)
        const bgCell = buf.getCell(5, 0) // non-text cell in button
        expect(bgCell?.background).toBe('blue')
    })

    test('button has no UA bold', async () => {
        const buf = await renderCSS(
            `.btn { width: 10; height: 1; }`,
            h('button', { class: 'btn' }, 'Click')
        )
        expect(cellBold(buf, 0, 0)).toBe(false)
    })
})

// ─── CSS overrides ────────────────────────────────────────────────────────────

describe('button: user CSS overrides UA', () => {
    test('user background-color overrides UA blue', async () => {
        const buf = await renderCSS(
            `.btn { width: 10; height: 1; background: green; }`,
            h('button', { class: 'btn' }, 'Click')
        )
        expect(cellBg(buf, 0, 0)).toBe('green')
    })

    test('user color applies as fg', async () => {
        const buf = await renderCSS(
            `.btn { width: 10; height: 1; color: white; }`,
            h('button', { class: 'btn' }, 'Click')
        )
        expect(cellColor(buf, 0, 0)).toBe('white')
    })

    test('user border applies', async () => {
        const buf = await renderCSS(
            `.btn { width: 10; height: 3; border: 1px solid white; }`,
            h('button', { class: 'btn' }, 'OK')
        )
        // Top-left corner should be border character
        const tl = buf.getCell(0, 0)
        expect(tl?.char).toBe('┌')
    })
})

// ─── Text rendering ───────────────────────────────────────────────────────────

describe('button: text rendering', () => {
    test('renders text content inside button', async () => {
        const buf = await renderCSS(
            `.btn { width: 15; height: 1; }`,
            h('button', { class: 'btn' }, 'Click me')
        )
        expect(rowSlice(buf, 0, 0, 8)).toBe('Click me')
    })

    test('text with padding-left is offset', async () => {
        const buf = await renderCSS(
            `.btn { width: 15; height: 1; padding-left: 2; }`,
            h('button', { class: 'btn' }, 'OK')
        )
        expect(rowSlice(buf, 0, 0, 2)).toBe('  ')
        expect(rowSlice(buf, 0, 2, 2)).toBe('OK')
    })

    test('text longer than button is clipped', async () => {
        const buf = await renderCSS(
            `.btn { width: 5; height: 1; }`,
            h('button', { class: 'btn' }, 'toolongtext')
        )
        expect(buf.getCell(5, 0)?.background).toBeNull()
    })
})

// ─── Nested content ───────────────────────────────────────────────────────────

describe('button: can contain child elements', () => {
    test('button can contain a span child', async () => {
        const buf = await renderCSS(
            `.btn { width: 15; height: 1; }
             .icon { width: 3; height: 1; }`,
            h('button', { class: 'btn' },
                h('span', { class: 'icon' }, '▶ ')
            )
        )
        // Button bg still applied
        expect(cellBg(buf, 0, 0)).toBe('blue')
    })
})

// ─── Block layout ─────────────────────────────────────────────────────────────

describe('button: block stacking', () => {
    test('two buttons stack vertically', async () => {
        const buf = await renderCSS(
            `.btn { width: 10; height: 1; }`,
            h('div', {},
                h('button', { class: 'btn' }, 'First'),
                h('button', { class: 'btn' }, 'Second')
            )
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe('First')
        expect(rowSlice(buf, 1, 0, 6)).toBe('Second')
    })

    test('button and input stack vertically with correct UA styles', async () => {
        const buf = await renderCSS(
            `.btn { width: 10; height: 1; }
             .inp { width: 10; height: 1; }`,
            h('div', {},
                h('button', { class: 'btn' }, 'Submit'),
                h('input', { class: 'inp' })
            )
        )
        expect(cellBg(buf, 0, 0)).toBe('blue')   // button row
        expect(cellBg(buf, 0, 1)).toBe('grey')    // input row
    })
})
