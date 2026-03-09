import { test, expect, describe } from 'bun:test'
import { SelectionManager } from './selection'
import { ScreenBuffer } from '../terminal/buffer'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeManager() {
    return new SelectionManager()
}

function mousedown(x: number, y: number) {
    return { type: 'mousedown' as const, button: 'left' as const, x, y, ctrl: false, shift: false, meta: false }
}

function mousemove(x: number, y: number) {
    return { type: 'mousemove' as const, button: 'left' as const, x, y, ctrl: false, shift: false, meta: false }
}

function mouseup(x: number, y: number) {
    return { type: 'mouseup' as const, button: 'left' as const, x, y, ctrl: false, shift: false, meta: false }
}

function drag(mgr: SelectionManager, x1: number, y1: number, x2: number, y2: number) {
    mgr.handleMouseEvent(mousedown(x1, y1))
    mgr.handleMouseEvent(mousemove(x2, y2))
    mgr.handleMouseEvent(mouseup(x2, y2))
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

describe('SelectionManager - initial state', () => {
    test('starts with no selection', () => {
        const mgr = makeManager()
        expect(mgr.hasSelection()).toBe(false)
        expect(mgr.isDragging()).toBe(false)
        expect(mgr.getNormalized()).toBeNull()
    })

    test('isSelected returns false everywhere before any event', () => {
        const mgr = makeManager()
        expect(mgr.isSelected(0, 0)).toBe(false)
        expect(mgr.isSelected(5, 5)).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// Mouse lifecycle
// ---------------------------------------------------------------------------

describe('SelectionManager - mouse lifecycle', () => {
    test('mousedown starts dragging, hasSelection is false until mousemove', () => {
        const mgr = makeManager()
        mgr.handleMouseEvent(mousedown(3, 2))
        expect(mgr.isDragging()).toBe(true)
        expect(mgr.hasSelection()).toBe(false)
    })

    test('mousemove while dragging sets active and creates a selection', () => {
        const mgr = makeManager()
        mgr.handleMouseEvent(mousedown(3, 2))
        mgr.handleMouseEvent(mousemove(7, 2))
        expect(mgr.hasSelection()).toBe(true)
        expect(mgr.isDragging()).toBe(true)
    })

    test('mouseup finalizes the selection and stops dragging', () => {
        const mgr = makeManager()
        drag(mgr, 2, 1, 8, 1)
        expect(mgr.hasSelection()).toBe(true)
        expect(mgr.isDragging()).toBe(false)
    })

    test('plain click (mousedown + mouseup at same spot, no mousemove) clears selection', () => {
        const mgr = makeManager()
        // First create a real selection
        drag(mgr, 0, 0, 5, 0)
        expect(mgr.hasSelection()).toBe(true)
        // Then click without dragging
        mgr.handleMouseEvent(mousedown(3, 3))
        mgr.handleMouseEvent(mouseup(3, 3))
        expect(mgr.hasSelection()).toBe(false)
    })

    test('second mousedown clears the previous selection', () => {
        const mgr = makeManager()
        drag(mgr, 0, 0, 5, 0)
        expect(mgr.isSelected(3, 0)).toBe(true)

        mgr.handleMouseEvent(mousedown(10, 5))
        // Old selection should be gone
        expect(mgr.hasSelection()).toBe(false)
        expect(mgr.isSelected(3, 0)).toBe(false)
    })

    test('right-button mousedown does not start a selection', () => {
        const mgr = makeManager()
        mgr.handleMouseEvent({ type: 'mousedown', button: 'right', x: 3, y: 3, ctrl: false, shift: false, meta: false })
        expect(mgr.isDragging()).toBe(false)
        expect(mgr.hasSelection()).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// isSelected — single-row
// ---------------------------------------------------------------------------

describe('SelectionManager - isSelected single row', () => {
    test('cells inside single-row selection are selected', () => {
        const mgr = makeManager()
        drag(mgr, 3, 2, 7, 2)
        expect(mgr.isSelected(3, 2)).toBe(true)
        expect(mgr.isSelected(5, 2)).toBe(true)
        expect(mgr.isSelected(7, 2)).toBe(true)
    })

    test('cells outside single-row selection are not selected', () => {
        const mgr = makeManager()
        drag(mgr, 3, 2, 7, 2)
        expect(mgr.isSelected(2, 2)).toBe(false)
        expect(mgr.isSelected(8, 2)).toBe(false)
        expect(mgr.isSelected(5, 1)).toBe(false)
        expect(mgr.isSelected(5, 3)).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// isSelected — direction normalization
// ---------------------------------------------------------------------------

describe('SelectionManager - drag direction normalization', () => {
    test('right-to-left drag produces same selection as left-to-right', () => {
        const ltr = makeManager()
        drag(ltr, 3, 2, 7, 2)

        const rtl = makeManager()
        drag(rtl, 7, 2, 3, 2)

        for (let x = 0; x <= 10; x++) {
            expect(ltr.isSelected(x, 2)).toBe(rtl.isSelected(x, 2))
        }
    })

    test('bottom-to-top drag produces same selection as top-to-bottom', () => {
        const ttb = makeManager()
        drag(ttb, 2, 1, 8, 3)

        const btt = makeManager()
        drag(btt, 8, 3, 2, 1)

        for (let y = 0; y <= 4; y++) {
            for (let x = 0; x <= 10; x++) {
                expect(ttb.isSelected(x, y)).toBe(btt.isSelected(x, y))
            }
        }
    })
})

// ---------------------------------------------------------------------------
// isSelected — multi-row linear model
// ---------------------------------------------------------------------------

describe('SelectionManager - multi-row linear selection', () => {
    // Selection from col 4, row 1  →  col 6, row 3
    // Row 1: only x >= 4 selected
    // Row 2: full row selected
    // Row 3: only x <= 6 selected

    function multiRowMgr() {
        const mgr = makeManager()
        drag(mgr, 4, 1, 6, 3)
        return mgr
    }

    test('first row: only chars from start column rightward', () => {
        const mgr = multiRowMgr()
        expect(mgr.isSelected(3, 1)).toBe(false) // before anchor
        expect(mgr.isSelected(4, 1)).toBe(true)  // anchor
        expect(mgr.isSelected(9, 1)).toBe(true)  // after anchor, same row
    })

    test('middle rows are fully selected', () => {
        const mgr = multiRowMgr()
        expect(mgr.isSelected(0, 2)).toBe(true)
        expect(mgr.isSelected(50, 2)).toBe(true)
    })

    test('last row: only chars up to end column', () => {
        const mgr = multiRowMgr()
        expect(mgr.isSelected(6, 3)).toBe(true)   // active.x
        expect(mgr.isSelected(7, 3)).toBe(false)  // beyond active.x
        expect(mgr.isSelected(0, 3)).toBe(true)   // left edge
    })

    test('rows outside the selection range are not selected', () => {
        const mgr = multiRowMgr()
        expect(mgr.isSelected(5, 0)).toBe(false)
        expect(mgr.isSelected(5, 4)).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// getSelectedText
// ---------------------------------------------------------------------------

describe('SelectionManager - getSelectedText', () => {
    function makeBuffer(lines: string[]): ScreenBuffer {
        const width = Math.max(...lines.map(l => l.length), 1)
        const buf = new ScreenBuffer(width, lines.length)
        lines.forEach((line, y) => buf.write(0, y, line))
        return buf
    }

    test('returns correct text for a single-row selection', () => {
        const buf = makeBuffer(['Hello, World!'])
        const mgr = makeManager()
        drag(mgr, 7, 0, 11, 0) // "World"
        expect(mgr.getSelectedText(buf)).toBe('World')
    })

    test('returns correct text for multi-row selection', () => {
        const buf = makeBuffer(['Hello', 'World', 'Foo'])
        const mgr = makeManager()
        drag(mgr, 2, 0, 2, 2) // from col 2 row 0, to col 2 row 2
        const text = mgr.getSelectedText(buf)
        expect(text).toBe('llo\nWorld\nFoo')
    })

    test('trims trailing spaces from each line', () => {
        const buf = new ScreenBuffer(20, 1)
        buf.write(0, 0, 'Hi') // remaining cols are spaces (buffer default)
        const mgr = makeManager()
        drag(mgr, 0, 0, 19, 0)
        expect(mgr.getSelectedText(buf)).toBe('Hi')
    })

    test('returns empty string when no selection', () => {
        const buf = makeBuffer(['Hello'])
        const mgr = makeManager()
        expect(mgr.getSelectedText(buf)).toBe('')
    })
})

// ---------------------------------------------------------------------------
// clearSelection
// ---------------------------------------------------------------------------

describe('SelectionManager - clearSelection', () => {
    test('clears an active selection', () => {
        const mgr = makeManager()
        drag(mgr, 0, 0, 5, 5)
        expect(mgr.hasSelection()).toBe(true)
        mgr.clearSelection()
        expect(mgr.hasSelection()).toBe(false)
        expect(mgr.isDragging()).toBe(false)
        expect(mgr.isSelected(3, 3)).toBe(false)
    })
})

// ---------------------------------------------------------------------------
// applyHighlight
// ---------------------------------------------------------------------------

describe('SelectionManager - applyHighlight', () => {
    test('selected cells get a blended background color', () => {
        const buf = new ScreenBuffer(10, 3)
        buf.write(0, 1, 'Hello     ')

        const mgr = makeManager()
        drag(mgr, 0, 1, 4, 1) // select "Hello"
        mgr.applyHighlight(buf)

        // Selected cells should have a hex background (blended) and inverse unchanged
        for (let x = 0; x <= 4; x++) {
            const cell = buf.getCell(x, 1)
            expect(cell?.background).toMatch(/^#[0-9a-f]{6}$/)
            expect(cell?.inverse).toBe(false)
        }
    })

    test('non-selected cells are not modified', () => {
        const buf = new ScreenBuffer(10, 3)
        buf.write(0, 0, 'unchanged ')

        const mgr = makeManager()
        drag(mgr, 0, 1, 4, 1) // select row 1 only
        mgr.applyHighlight(buf)

        // Row 0 untouched — background and inverse remain at defaults
        for (let x = 0; x < 10; x++) {
            expect(buf.getCell(x, 0)?.background).toBe(null)
            expect(buf.getCell(x, 0)?.inverse).toBe(false)
        }
        // Cells past col 4 on row 1 untouched
        for (let x = 5; x < 10; x++) {
            expect(buf.getCell(x, 1)?.background).toBe(null)
        }
    })

    test('does nothing when there is no selection', () => {
        const buf = new ScreenBuffer(10, 3)
        buf.write(0, 0, 'some text ')

        const mgr = makeManager()
        mgr.applyHighlight(buf) // no selection

        for (let x = 0; x < 10; x++) {
            expect(buf.getCell(x, 0)?.background).toBe(null)
        }
    })

    test('blended color uses the cell existing background as base', () => {
        const buf = new ScreenBuffer(10, 1)
        // Red background cell
        buf.writeCell(3, 0, { char: 'X', color: null, background: '#cc0000', bold: false, underline: false, italic: false, inverse: false, dim: false })

        const mgr = makeManager()
        drag(mgr, 3, 0, 3, 0)
        mgr.applyHighlight(buf)

        const cell = buf.getCell(3, 0)
        // Should be a blended hex, not pure red and not the selection color
        expect(cell?.background).toMatch(/^#[0-9a-f]{6}$/)
        expect(cell?.background).not.toBe('#cc0000')
        expect(cell?.inverse).toBe(false)
    })

    test('custom selection color and opacity are applied', () => {
        const buf = new ScreenBuffer(10, 1)
        buf.write(0, 0, 'hello     ')

        // Fully opaque green selection — result should be pure green
        const mgr = new SelectionManager(undefined, { color: '#00ff00', opacity: 1.0 })
        drag(mgr, 0, 0, 4, 0)
        mgr.applyHighlight(buf)

        for (let x = 0; x <= 4; x++) {
            expect(buf.getCell(x, 0)?.background).toBe('#00ff00')
        }
    })
})

// ---------------------------------------------------------------------------
// onChanged callback
// ---------------------------------------------------------------------------

describe('SelectionManager - onChanged callback', () => {
    test('callback fires on mousedown', () => {
        let calls = 0
        const mgr = new SelectionManager(() => { calls++ })
        mgr.handleMouseEvent(mousedown(0, 0))
        expect(calls).toBeGreaterThan(0)
    })

    test('callback fires on mousemove while dragging', () => {
        let calls = 0
        const mgr = new SelectionManager(() => { calls++ })
        mgr.handleMouseEvent(mousedown(0, 0))
        const before = calls
        mgr.handleMouseEvent(mousemove(5, 0))
        expect(calls).toBeGreaterThan(before)
    })

    test('callback fires on mouseup', () => {
        let calls = 0
        const mgr = new SelectionManager(() => { calls++ })
        mgr.handleMouseEvent(mousedown(0, 0))
        mgr.handleMouseEvent(mousemove(5, 0))
        const before = calls
        mgr.handleMouseEvent(mouseup(5, 0))
        expect(calls).toBeGreaterThan(before)
    })
})
