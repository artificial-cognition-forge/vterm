/**
 * Terminal cell representation (CSS-like naming)
 */
export interface Cell {
  char: string
  color: string | null // CSS: color (foreground)
  background: string | null // CSS: background-color
  bold: boolean // CSS: font-weight
  underline: boolean // CSS: text-decoration
  italic: boolean // CSS: font-style
  inverse: boolean // Terminal-specific: swap fg/bg
  dim: boolean // Terminal-specific: dimmed text
}

/**
 * Creates an empty cell
 */
export function createCell(char = ' '): Cell {
  return {
    char,
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
 * Creates a styled cell
 */
export function createStyledCell(
  char: string,
  style: Partial<Omit<Cell, 'char'>> = {}
): Cell {
  return {
    char,
    color: style.color ?? null,
    background: style.background ?? null,
    bold: style.bold ?? false,
    underline: style.underline ?? false,
    italic: style.italic ?? false,
    inverse: style.inverse ?? false,
    dim: style.dim ?? false,
  }
}

/**
 * Checks if two cells are equal
 */
export function cellsEqual(a: Cell, b: Cell): boolean {
  return (
    a.char === b.char &&
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
 * Screen buffer - 2D array of cells representing terminal state
 */
export class ScreenBuffer {
  private cells: Cell[][]
  public width: number
  public height: number

  constructor(width: number, height: number) {
    this.width = width
    this.height = height
    this.cells = this.createEmptyBuffer(width, height)
  }

  /**
   * Creates an empty buffer filled with blank cells
   */
  private createEmptyBuffer(width: number, height: number): Cell[][] {
    const buffer: Cell[][] = []
    for (let y = 0; y < height; y++) {
      buffer[y] = []
      for (let x = 0; x < width; x++) {
        buffer[y][x] = createCell()
      }
    }
    return buffer
  }

  /**
   * Clears the entire buffer (in-place mutation for performance)
   */
  clear(): void {
    for (let y = 0; y < this.height; y++) {
      const row = this.cells[y]!
      for (let x = 0; x < this.width; x++) {
        const cell = row[x]!
        cell.char = ' '
        cell.color = null
        cell.background = null
        cell.bold = false
        cell.underline = false
        cell.italic = false
        cell.inverse = false
        cell.dim = false
      }
    }
  }

  /**
   * Writes a single character at position
   */
  writeCell(x: number, y: number, cell: Cell): void {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return // Out of bounds, ignore
    }
    const row = this.cells[y]
    if (row) {
      row[x] = cell
    }
  }

  /**
   * Writes text at position with optional style
   */
  write(
    x: number,
    y: number,
    text: string,
    style: Partial<Omit<Cell, 'char'>> = {}
  ): void {
    if (y < 0 || y >= this.height) {
      return // Out of bounds
    }

    const row = this.cells[y]
    if (!row) return

    for (let i = 0; i < text.length; i++) {
      const charX = x + i
      if (charX >= 0 && charX < this.width) {
        // Preserve existing background when the style specifies none.
        // Text nodes should not clobber a parent's background color.
        const effectiveBg = style.background ?? row[charX]?.background ?? null
        row[charX] = createStyledCell(text[i]!, { ...style, background: effectiveBg })
      }
    }
  }

  /**
   * Fills a rectangular region with a character (in-place mutation for performance)
   */
  fill(
    x: number,
    y: number,
    width: number,
    height: number,
    cell: Cell
  ): void {
    const endX = Math.min(x + width, this.width)
    const endY = Math.min(y + height, this.height)
    const startX = Math.max(x, 0)
    const startY = Math.max(y, 0)

    // Destructure once to reduce property lookups
    const { char, color, background, bold, underline, italic, inverse, dim } = cell

    for (let row = startY; row < endY; row++) {
      const rowCells = this.cells[row]
      if (!rowCells) continue
      for (let col = startX; col < endX; col++) {
        const c = rowCells[col]!
        c.char = char
        c.color = color
        c.background = background
        c.bold = bold
        c.underline = underline
        c.italic = italic
        c.inverse = inverse
        c.dim = dim
      }
    }
  }

  /**
   * Gets a cell at position
   */
  getCell(x: number, y: number): Cell | null {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return null
    }
    const row = this.cells[y]
    return row?.[x] ?? null
  }

  /**
   * Gets a line as a string (useful for testing)
   */
  getLine(y: number): string {
    if (y < 0 || y >= this.height) {
      return ''
    }
    const row = this.cells[y]
    return row ? row.map((cell) => cell.char).join('') : ''
  }

  /**
   * Gets all lines as strings (useful for testing)
   */
  getLines(): string[] {
    return this.cells.map((row) => row.map((cell) => cell.char).join(''))
  }

  /**
   * Resizes the buffer
   */
  resize(width: number, height: number): void {
    const newCells = this.createEmptyBuffer(width, height)

    // Copy old content
    const copyHeight = Math.min(height, this.height)
    const copyWidth = Math.min(width, this.width)

    for (let y = 0; y < copyHeight; y++) {
      const oldRow = this.cells[y]
      const newRow = newCells[y]
      if (!oldRow || !newRow) continue

      for (let x = 0; x < copyWidth; x++) {
        const cell = oldRow[x]
        if (cell) {
          newRow[x] = cell
        }
      }
    }

    this.cells = newCells
    this.width = width
    this.height = height
  }

  /**
   * Creates a clone of this buffer
   */
  clone(): ScreenBuffer {
    const cloned = new ScreenBuffer(this.width, this.height)
    for (let y = 0; y < this.height; y++) {
      const srcRow = this.cells[y]
      const dstRow = cloned.cells[y]
      if (!srcRow || !dstRow) continue

      for (let x = 0; x < this.width; x++) {
        const cell = srcRow[x]
        if (cell) {
          dstRow[x] = { ...cell }
        }
      }
    }
    return cloned
  }

  /**
   * Direct access to cells (for differ)
   */
  getCells(): Cell[][] {
    return this.cells
  }
}
