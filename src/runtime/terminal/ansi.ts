/**
 * ANSI escape sequences for terminal control
 */

/**
 * Cache for hex color conversions (memoization)
 * Maps hex string → RGB tuple or null (for invalid hex)
 */
const hexToRgbCache = new Map<string, [number, number, number] | null>()

/**
 * ANSI color codes
 */
const COLORS: Record<string, number> = {
    black: 0,
    red: 1,
    green: 2,
    yellow: 3,
    blue: 4,
    magenta: 5,
    cyan: 6,
    white: 7,
    // Bright variants
    brightBlack: 8,
    gray: 8,
    grey: 8,
    brightRed: 9,
    brightGreen: 10,
    brightYellow: 11,
    brightBlue: 12,
    brightMagenta: 13,
    brightCyan: 14,
    brightWhite: 15,
}

/**
 * Converts hex color to RGB (with memoization)
 */
function hexToRgb(hex: string): [number, number, number] | null {
    const cached = hexToRgbCache.get(hex)
    if (cached !== undefined) return cached

    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    const rgb: [number, number, number] | null = result
        ? [parseInt(result[1]!, 16), parseInt(result[2]!, 16), parseInt(result[3]!, 16)]
        : null

    hexToRgbCache.set(hex, rgb)
    return rgb
}

/**
 * ANSI Writer - generates ANSI escape codes for terminal control
 */
export class AnsiWriter {
    private output: string[] = []

    /**
     * Clears the output buffer
     */
    clear(): void {
        this.output = []
    }

    /**
     * Gets the accumulated output and clears the buffer
     */
    flush(): string {
        const result = this.output.join("")
        this.output = []
        return result
    }

    /**
     * Moves cursor to position (1-indexed for ANSI)
     */
    moveCursor(x: number, y: number): this {
        this.output.push(`\x1b[${y + 1};${x + 1}H`)
        return this
    }

    /**
     * Moves cursor up by n lines
     */
    cursorUp(n = 1): this {
        if (n > 0) this.output.push(`\x1b[${n}A`)
        return this
    }

    /**
     * Moves cursor down by n lines
     */
    cursorDown(n = 1): this {
        if (n > 0) this.output.push(`\x1b[${n}B`)
        return this
    }

    /**
     * Moves cursor forward by n columns
     */
    cursorForward(n = 1): this {
        if (n > 0) this.output.push(`\x1b[${n}C`)
        return this
    }

    /**
     * Moves cursor backward by n columns
     */
    cursorBackward(n = 1): this {
        if (n > 0) this.output.push(`\x1b[${n}D`)
        return this
    }

    /**
     * Hides the cursor
     */
    hideCursor(): this {
        this.output.push("\x1b[?25l")
        return this
    }

    /**
     * Shows the cursor
     */
    showCursor(): this {
        this.output.push("\x1b[?25h")
        return this
    }

    /**
     * Clears the screen
     */
    clearScreen(): this {
        this.output.push("\x1b[2J")
        return this
    }

    /**
     * Clears from cursor to end of screen
     */
    clearToEnd(): this {
        this.output.push("\x1b[0J")
        return this
    }

    /**
     * Clears the current line
     */
    clearLine(): this {
        this.output.push("\x1b[2K")
        return this
    }

    /**
     * Enables alternate screen buffer
     */
    alternateScreen(): this {
        this.output.push("\x1b[?1049h")
        return this
    }

    /**
     * Disables alternate screen buffer
     */
    normalScreen(): this {
        this.output.push("\x1b[?1049l")
        return this
    }

    /**
     * Enables mouse tracking (SGR mode with all events)
     */
    enableMouse(): this {
        // Enable mouse tracking with SGR extended mode
        // \x1b[?1000h - Track button press and release
        // \x1b[?1002h - Track button press, release, and motion while button held
        // \x1b[?1003h - Track all motion events (hover)
        // \x1b[?1006h - SGR extended reporting (better for large terminals)
        this.output.push("\x1b[?1000h") // Basic mouse tracking
        this.output.push("\x1b[?1002h") // Track button motion
        this.output.push("\x1b[?1003h") // Track all motion events (for hover)
        this.output.push("\x1b[?1006h") // SGR extended mode
        return this
    }

    /**
     * Disables mouse tracking
     */
    disableMouse(): this {
        this.output.push("\x1b[?1006l") // Disable SGR mode
        this.output.push("\x1b[?1003l") // Disable all motion tracking
        this.output.push("\x1b[?1002l") // Disable button motion
        this.output.push("\x1b[?1000l") // Disable basic tracking
        return this
    }

    /**
     * Resets all styles
     */
    reset(): this {
        this.output.push("\x1b[0m")
        return this
    }

    /**
     * Sets foreground color
     */
    setForeground(color: string | null): this {
        // Reset/clear foreground when color is null
        if (!color) {
            this.output.push("\x1b[39m")
            return this
        }

        // Named color
        if (color in COLORS) {
            const code = COLORS[color]!
            if (code < 8) {
                this.output.push(`\x1b[3${code}m`)
            } else {
                this.output.push(`\x1b[9${code - 8}m`)
            }
            return this
        }

        // Hex color
        if (color.startsWith("#")) {
            const rgb = hexToRgb(color)
            if (rgb) {
                this.output.push(`\x1b[38;2;${rgb[0]};${rgb[1]};${rgb[2]}m`)
            }
            return this
        }

        return this
    }

    /**
     * Sets background color
     */
    setBackground(color: string | null): this {
        // Reset/clear background when color is null
        if (!color) {
            this.output.push("\x1b[49m")
            return this
        }

        // Named color
        if (color in COLORS) {
            const code = COLORS[color]!
            if (code < 8) {
                this.output.push(`\x1b[4${code}m`)
            } else {
                this.output.push(`\x1b[10${code - 8}m`)
            }
            return this
        }

        // Hex color
        if (color.startsWith("#")) {
            const rgb = hexToRgb(color)
            if (rgb) {
                this.output.push(`\x1b[48;2;${rgb[0]};${rgb[1]};${rgb[2]}m`)
            }
            return this
        }

        return this
    }

    /**
     * Sets bold
     */
    setBold(enabled: boolean): this {
        this.output.push(enabled ? "\x1b[1m" : "\x1b[22m")
        return this
    }

    /**
     * Sets dim
     */
    setDim(enabled: boolean): this {
        this.output.push(enabled ? "\x1b[2m" : "\x1b[22m")
        return this
    }

    /**
     * Sets italic
     */
    setItalic(enabled: boolean): this {
        this.output.push(enabled ? "\x1b[3m" : "\x1b[23m")
        return this
    }

    /**
     * Sets underline
     */
    setUnderline(enabled: boolean): this {
        this.output.push(enabled ? "\x1b[4m" : "\x1b[24m")
        return this
    }

    /**
     * Sets inverse (swap foreground/background)
     */
    setInverse(enabled: boolean): this {
        this.output.push(enabled ? "\x1b[7m" : "\x1b[27m")
        return this
    }

    /**
     * Writes text to output
     */
    write(text: string): this {
        this.output.push(text)
        return this
    }

    /**
     * Writes to stdout directly
     */
    writeToStdout(): void {
        const output = this.flush()
        if (output) {
            process.stdout.write(output)
        }
    }
}
