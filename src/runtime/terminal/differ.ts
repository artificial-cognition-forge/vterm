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
 * Extracts style from cell
 */
function cellToStyle(cell: Cell): StyleState {
  return {
    color: cell.color,
    background: cell.background,
    bold: cell.bold,
    underline: cell.underline,
    italic: cell.italic,
    inverse: cell.inverse,
    dim: cell.dim,
  }
}

/**
 * Frame differ - compares two screen buffers and generates minimal ANSI output
 */
export class FrameDiffer {
  /**
   * Diffs two buffers and generates ANSI codes
   * Returns the complete ANSI string to update the screen
   */
  diff(prev: ScreenBuffer | null, next: ScreenBuffer): string {
    const writer = new AnsiWriter()

    // First render: clear screen and draw everything
    if (!prev) {
      return this.renderFull(next, writer, true)
    }

    // Handle resize - render full but DON'T clear screen for smooth transition
    if (prev.width !== next.width || prev.height !== next.height) {
      return this.renderFull(next, writer, false)
    }

    // Incremental update: only changed cells
    return this.renderIncremental(prev, next, writer)
  }

  /**
   * Renders the full buffer (first render or after resize)
   * @param clearScreen - Whether to clear the screen first (only on initial render)
   */
  private renderFull(buffer: ScreenBuffer, writer: AnsiWriter, clearScreen = true): string {
    if (clearScreen) {
      writer.clearScreen()
    }
    writer.moveCursor(0, 0)

    let currentStyle = createStyleState()
    const cells = buffer.getCells()

    for (let y = 0; y < buffer.height; y++) {
      const row = cells[y]
      if (!row) continue

      for (let x = 0; x < buffer.width; x++) {
        const cell = row[x]
        if (!cell) continue

        // Apply style changes
        currentStyle = this.applyStyleChanges(
          writer,
          currentStyle,
          cellToStyle(cell)
        )

        // Write character
        writer.write(cell.char)
      }
    }

    writer.reset()
    return writer.flush()
  }

  /**
   * Renders only changed cells (incremental update)
   */
  private renderIncremental(
    prev: ScreenBuffer,
    next: ScreenBuffer,
    writer: AnsiWriter
  ): string {
    let currentStyle = createStyleState()
    const prevCells = prev.getCells()
    const nextCells = next.getCells()

    for (let y = 0; y < next.height; y++) {
      const prevRow = prevCells[y]
      const nextRow = nextCells[y]
      if (!prevRow || !nextRow) continue

      let inRun = false

      for (let x = 0; x < next.width; x++) {
        const prevCell = prevRow[x]
        const nextCell = nextRow[x]
        if (!prevCell || !nextCell) continue

        // Cell changed?
        if (!cellsEqual(prevCell, nextCell)) {
          // Start a new run
          if (!inRun) {
            writer.moveCursor(x, y)
            inRun = true
          }

          // Apply style changes
          currentStyle = this.applyStyleChanges(
            writer,
            currentStyle,
            cellToStyle(nextCell)
          )

          // Write character
          writer.write(nextCell.char)
        } else {
          // End the run
          inRun = false
        }
      }
    }

    writer.reset()
    return writer.flush()
  }

  /**
   * Applies minimal style changes between two states
   */
  private applyStyleChanges(
    writer: AnsiWriter,
    current: StyleState,
    target: StyleState
  ): StyleState {
    // If styles are identical, nothing to do
    if (styleStatesEqual(current, target)) {
      return current
    }

    // Check if we should just reset and apply all new styles
    // This is often cheaper than toggling individual attributes
    const needsReset = this.shouldReset(current, target)

    if (needsReset) {
      writer.reset()
      current = createStyleState()
    }

    // Apply color changes
    if (current.color !== target.color) {
      writer.setForeground(target.color)
      current.color = target.color
    }

    if (current.background !== target.background) {
      writer.setBackground(target.background)
      current.background = target.background
    }

    // Apply attribute changes
    if (current.bold !== target.bold) {
      writer.setBold(target.bold)
      current.bold = target.bold
    }

    if (current.dim !== target.dim) {
      writer.setDim(target.dim)
      current.dim = target.dim
    }

    if (current.italic !== target.italic) {
      writer.setItalic(target.italic)
      current.italic = target.italic
    }

    if (current.underline !== target.underline) {
      writer.setUnderline(target.underline)
      current.underline = target.underline
    }

    if (current.inverse !== target.inverse) {
      writer.setInverse(target.inverse)
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
