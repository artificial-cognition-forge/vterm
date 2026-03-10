import type { Cell } from './buffer'
import { cellsEqual, ScreenBuffer } from './buffer'
import { AnsiWriter } from './ansi'

/**
 * Style state tracker for minimizing style changes
 */
interface StyleState {
  color: string | null
  background: string | null
  bold: boolean
  underline: boolean
  italic: boolean
  inverse: boolean
  dim: boolean
}

/**
 * Creates a default style state
 */
function createStyleState(): StyleState {
  return {
    color: null,
    background: null,
    bold: false,
    underline: false,
    italic: false,
    inverse: false,
    dim: false,
  }
}

/**
 * Checks if two style states are equal
 */
function styleStatesEqual(a: StyleState, b: StyleState): boolean {
  return (
    a.color === b.color &&
    a.background === b.background &&
    a.bold === b.bold &&
    a.underline === b.underline &&
    a.italic === b.italic &&
    a.inverse === b.inverse &&
    a.dim === b.dim
  )
}

/**
 * Frame differ - compares two screen buffers and generates minimal ANSI output
 */
export class FrameDiffer {
  private writer: AnsiWriter = new AnsiWriter()
  private targetStyle: StyleState = createStyleState()

  /**
   * Diffs two buffers and generates ANSI codes
   * Returns the complete ANSI string to update the screen
   */
  diff(prev: ScreenBuffer | null, next: ScreenBuffer): string {
    this.writer.clear()

    // First render: clear screen and draw everything
    if (!prev) {
      return this.renderFull(next, true)
    }

    // Handle resize - render full but DON'T clear screen for smooth transition
    if (prev.width !== next.width || prev.height !== next.height) {
      return this.renderFull(next, false)
    }

    // Incremental update: only changed cells
    return this.renderIncremental(prev, next)
  }

  /**
   * Renders the full buffer (first render or after resize)
   * @param clearScreen - Whether to clear the screen first (only on initial render)
   */
  private renderFull(buffer: ScreenBuffer, clearScreen = true): string {
    if (clearScreen) {
      this.writer.clearScreen()
    }
    this.writer.moveCursor(0, 0)

    let currentStyle = createStyleState()
    const cells = buffer.getCells()

    for (let y = 0; y < buffer.height; y++) {
      const row = cells[y]
      if (!row) continue

      for (let x = 0; x < buffer.width; x++) {
        const cell = row[x]
        if (!cell) continue

        // Apply style changes (pass cell directly to avoid allocation)
        currentStyle = this.applyStyleChanges(currentStyle, cell)

        // Write character
        this.writer.write(cell.char)
      }
    }

    // Reset dirty flags for next frame
    buffer.resetDirtyFlags()

    this.writer.reset()
    return this.writer.flush()
  }

  /**
   * Renders only changed cells (incremental update)
   */
  private renderIncremental(prev: ScreenBuffer, next: ScreenBuffer): string {
    let currentStyle = createStyleState()
    const prevCells = prev.getCells()
    const nextCells = next.getCells()

    for (let y = 0; y < next.height; y++) {
      // Skip clean rows (optimization: only process rows that were modified)
      if (!next.isRowDirty(y)) {
        continue
      }

      const prevRow = prevCells[y]
      const nextRow = nextCells[y]
      if (!prevRow || !nextRow) continue

      let inRun = false
      let runStr = ''

      for (let x = 0; x < next.width; x++) {
        const prevCell = prevRow[x]
        const nextCell = nextRow[x]
        if (!prevCell || !nextCell) continue

        // Cell changed?
        if (!cellsEqual(prevCell, nextCell)) {
          // Start a new run
          if (!inRun) {
            this.writer.moveCursor(x, y)
            inRun = true
          }

          // Check if style changed
          if (
            runStr &&
            (currentStyle.color !== nextCell.color ||
              currentStyle.background !== nextCell.background ||
              currentStyle.bold !== nextCell.bold ||
              currentStyle.underline !== nextCell.underline ||
              currentStyle.italic !== nextCell.italic ||
              currentStyle.inverse !== nextCell.inverse ||
              currentStyle.dim !== nextCell.dim)
          ) {
            // Style changed, flush the run and apply new style
            this.writer.write(runStr)
            runStr = ''
            currentStyle = this.applyStyleChanges(currentStyle, nextCell)
            runStr = nextCell.char
          } else if (!runStr) {
            // First character in run, apply style
            currentStyle = this.applyStyleChanges(currentStyle, nextCell)
            runStr = nextCell.char
          } else {
            // Continue run with same style
            runStr += nextCell.char
          }
        } else {
          // End the run
          if (runStr) {
            this.writer.write(runStr)
            runStr = ''
          }
          inRun = false
        }
      }

      // Flush any remaining run
      if (runStr) {
        this.writer.write(runStr)
      }
    }

    // Reset dirty flags for next frame
    next.resetDirtyFlags()

    this.writer.reset()
    return this.writer.flush()
  }

  /**
   * Applies minimal style changes by reading cell fields directly
   * Reuses this.targetStyle to avoid allocations
   */
  private applyStyleChanges(current: StyleState, cell: Cell): StyleState {
    // Populate target style directly from cell (no allocation)
    const target = this.targetStyle
    target.color = cell.color
    target.background = cell.background
    target.bold = cell.bold
    target.underline = cell.underline
    target.italic = cell.italic
    target.inverse = cell.inverse
    target.dim = cell.dim

    // If styles are identical, nothing to do
    if (styleStatesEqual(current, target)) {
      return current
    }

    // Check if we should just reset and apply all new styles
    // This is often cheaper than toggling individual attributes
    const needsReset = this.shouldReset(current, target)

    if (needsReset) {
      this.writer.reset()
      current = createStyleState()
    }

    // Apply color changes
    if (current.color !== target.color) {
      this.writer.setForeground(target.color)
      current.color = target.color
    }

    if (current.background !== target.background) {
      this.writer.setBackground(target.background)
      current.background = target.background
    }

    // Apply attribute changes
    if (current.bold !== target.bold) {
      this.writer.setBold(target.bold)
      current.bold = target.bold
    }

    if (current.dim !== target.dim) {
      this.writer.setDim(target.dim)
      current.dim = target.dim
    }

    if (current.italic !== target.italic) {
      this.writer.setItalic(target.italic)
      current.italic = target.italic
    }

    if (current.underline !== target.underline) {
      this.writer.setUnderline(target.underline)
      current.underline = target.underline
    }

    if (current.inverse !== target.inverse) {
      this.writer.setInverse(target.inverse)
      current.inverse = target.inverse
    }

    return current
  }

  /**
   * Determines if we should reset styles instead of toggling attributes
   */
  private shouldReset(current: StyleState, target: StyleState): boolean {
    // Count how many attributes need to be turned OFF
    let disableCount = 0

    if (current.bold && !target.bold) disableCount++
    if (current.dim && !target.dim) disableCount++
    if (current.italic && !target.italic) disableCount++
    if (current.underline && !target.underline) disableCount++
    if (current.inverse && !target.inverse) disableCount++

    // Reset is cheaper if we need to disable 2+ attributes
    return disableCount >= 2
  }
}
