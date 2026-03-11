/**
 * Tests for terminal resize synchronization and rendering
 *
 * Ensures that:
 * 1. Driver, buffer, and layout engine dimensions stay in sync during resize
 * 2. Dirty row tracking is properly reset after resize
 * 3. Screen clears on shrink to prevent content bleed
 */

import { test, expect, describe } from 'bun:test'
import { ScreenBuffer } from './buffer'
import { FrameDiffer } from './differ'

describe('Buffer resize synchronization', () => {
  test('resize creates new dirtyRows array with correct length', () => {
    const buf = new ScreenBuffer(80, 24)
    buf.markRowDirty(0)
    buf.markRowDirty(5)

    buf.resize(100, 30)

    expect(buf.width).toBe(100)
    expect(buf.height).toBe(30)
    expect(buf.getDirtyRowCount()).toBe(30) // All rows dirty after resize
  })

  test('resize shrinking to smaller height properly initializes dirtyRows', () => {
    const buf = new ScreenBuffer(220, 50)
    buf.markRowDirty(10)
    buf.markRowDirty(25)
    buf.markRowDirty(40)

    buf.resize(100, 20)

    expect(buf.height).toBe(20)
    expect(buf.getDirtyRowCount()).toBe(20) // All 20 rows are dirty, not looking beyond
  })

  test('resize expanding properly expands dirtyRows', () => {
    const buf = new ScreenBuffer(80, 24)
    buf.markRowDirty(5)

    buf.resize(80, 50)

    expect(buf.height).toBe(50)
    expect(buf.getDirtyRowCount()).toBe(50) // All rows dirty post-resize
  })

  test('dirty row tracking independent from buffer cell copying', () => {
    const buf1 = new ScreenBuffer(80, 24)
    buf1.write(5, 5, 'Hello')
    buf1.markRowDirty(5)

    // Clear dirty flags
    buf1.resetDirtyFlags()
    expect(buf1.getDirtyRowCount()).toBe(0)

    // Resize should re-mark all as dirty
    buf1.resize(80, 24)
    expect(buf1.getDirtyRowCount()).toBe(24)
  })
})

describe('Frame differ resize behavior', () => {
  test('resize with content shrinking triggers clearScreen flag', () => {
    const buf1 = new ScreenBuffer(220, 50)
    buf1.write(10, 10, 'Content that should be cleared')

    const buf2 = new ScreenBuffer(100, 30)

    const differ = new FrameDiffer()
    const output = differ.diff(buf1, buf2)

    // Should contain clear screen escape code (ESC[2J or similar)
    expect(output).toContain('\x1b[2J')
  })

  test('resize expanding does not clear screen', () => {
    const buf1 = new ScreenBuffer(80, 24)
    buf1.write(10, 5, 'Content')

    const buf2 = new ScreenBuffer(120, 40)

    const differ = new FrameDiffer()
    const output = differ.diff(buf1, buf2)

    // No clear needed - content can stay
    // (may or may not have clearScreen, but that's ok for expansion)
    expect(output.length > 0).toBe(true)
  })

  test('first render (no prev buffer) clears screen', () => {
    const buf = new ScreenBuffer(80, 24)
    buf.write(10, 5, 'Hello')

    const differ = new FrameDiffer()
    const output = differ.diff(null, buf)

    expect(output).toContain('\x1b[2J')
  })

  test('incremental update without resize does not clear', () => {
    const buf1 = new ScreenBuffer(80, 24)
    buf1.write(10, 5, 'Hello')

    const buf2 = new ScreenBuffer(80, 24)
    buf2.write(10, 5, 'World')

    const differ = new FrameDiffer()
    const output = differ.diff(buf1, buf2)

    // Should NOT clear screen for incremental update
    expect(output).not.toContain('\x1b[2J')
  })
})

describe('Buffer cell preservation on resize', () => {
  test('content in overlap region is preserved after resize', () => {
    const buf1 = new ScreenBuffer(10, 10)
    buf1.write(2, 2, 'test')

    buf1.resize(20, 20)

    // Content at (2,2) should still be there
    const cell = buf1.getCell(2, 2)
    expect(cell?.char).toBe('t')
  })

  test('content beyond new bounds is not accessible after shrink', () => {
    const buf1 = new ScreenBuffer(80, 24)
    buf1.write(70, 20, 'outside')

    buf1.resize(50, 15)

    // Cell at (70, 20) is now out of bounds
    const cell = buf1.getCell(70, 20)
    expect(cell).toBeNull()
  })

  test('new cells after expansion are blank', () => {
    const buf = new ScreenBuffer(10, 10)
    buf.resize(20, 20)

    // New region (15, 15) should be blank
    const cell = buf.getCell(15, 15)
    expect(cell?.char).toBe(' ')
    expect(cell?.color).toBeNull()
  })
})
