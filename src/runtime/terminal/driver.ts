import { ScreenBuffer } from "./buffer"
import { FrameDiffer } from "./differ"
import { AnsiWriter } from "./ansi"
import type { InputParser, KeyEvent } from "./input"
import { EventEmitter } from "node:events"

export interface TerminalDriverOptions {
    /**
     * Input parser for keyboard events (optional)
     */
    inputParser?: InputParser

    /**
     * Whether to use alternate screen buffer
     * @default true
     */
    alternateScreen?: boolean

    /**
     * Whether to hide cursor
     * @default true
     */
    hideCursor?: boolean

    /**
     * Whether to enable mouse tracking
     * @default true
     */
    enableMouse?: boolean

    /**
     * Cursor shape configuration
     */
    cursor?: {
        shape?: 'block' | 'line' | 'underline'
        blink?: boolean
    }
}

/**
 * Terminal Driver - manages terminal state and rendering
 */
export class TerminalDriver extends EventEmitter {
    private buffer: ScreenBuffer
    private prevBuffer: ScreenBuffer | null = null
    private differ: FrameDiffer
    private writer: AnsiWriter
    private inputParser?: InputParser
    private options: Required<Omit<TerminalDriverOptions, 'cursor'>> & { cursor?: TerminalDriverOptions['cursor'] }
    private initialized = false
    private resizeHandler: () => void
    private resizeTimeoutId: NodeJS.Timeout | null = null

    public width: number
    public height: number
    private cursorPos: { x: number; y: number } | null = null
    private keyHandlers = new Map<string, Set<(...args: any[]) => void>>()

    constructor(options: TerminalDriverOptions = {}) {
        super()

        this.options = {
            inputParser: options.inputParser!,
            alternateScreen: options.alternateScreen ?? true,
            hideCursor: options.hideCursor ?? true,
            enableMouse: options.enableMouse ?? true,
            cursor: options.cursor,
        }

        // Get terminal dimensions
        this.width = process.stdout.columns || 80
        this.height = process.stdout.rows || 24

        // Initialize components
        this.buffer = new ScreenBuffer(this.width, this.height)
        this.differ = new FrameDiffer()
        this.writer = new AnsiWriter()
        this.inputParser = options.inputParser

        // Wire up key() dispatch from input parser
        if (this.inputParser) {
            this.inputParser.on("keypress", (event: KeyEvent) => {
                const keyStr = event.ctrl ? `C-${event.name}` : event.name
                const handlers = this.keyHandlers.get(keyStr)
                if (handlers) {
                    for (const handler of handlers) {
                        handler(event)
                    }
                }
            })
        }

        // Handle resize
        this.resizeHandler = () => this.handleResize()
        process.stdout.on("resize", this.resizeHandler)

        // Handle cleanup on exit
        this.setupExitHandlers()
    }

    /**
     * Initializes the terminal (raw mode, alternate screen, etc.)
     */
    initialize(): void {
        if (this.initialized) return

        // Keep process alive by preventing stdin from closing
        process.stdin.resume()

        // Enable raw mode
        if (process.stdin.isTTY && process.stdin.setRawMode) {
            process.stdin.setRawMode(true)
        }

        // Start listening to input
        if (this.inputParser) {
            this.inputParser.start()
        }

        // Setup terminal
        if (this.options.alternateScreen) {
            this.writer.alternateScreen()
        }

        if (this.options.hideCursor) {
            this.writer.hideCursor()
        }

        if (this.options.enableMouse) {
            this.writer.enableMouse()
        }

        this.writer.clearScreen()
        this.writer.writeToStdout()

        this.initialized = true
    }

    /**
     * Sets cursor position for a focused input element.
     * Call after layout to position cursor at the right terminal cell.
     */
    setCursor(x: number, y: number): void {
        this.cursorPos = { x, y }
    }

    /**
     * Clears cursor position (hides cursor)
     */
    clearCursor(): void {
        this.cursorPos = null
    }

    /**
     * Register a handler for one or more key names (e.g. 'enter', 'C-c', 'shift-tab')
     */
    key(keys: string | string[], handler: (...args: any[]) => void): void {
        const keyArray = Array.isArray(keys) ? keys : [keys]
        for (const k of keyArray) {
            if (!this.keyHandlers.has(k)) {
                this.keyHandlers.set(k, new Set())
            }
            this.keyHandlers.get(k)!.add(handler)
        }
    }

    /**
     * Remove a previously registered key handler
     */
    unkey(key: string, handler: (...args: any[]) => void): void {
        this.keyHandlers.get(key)?.delete(handler)
    }

    /**
     * Forces a full redraw on the next render() call by discarding the
     * previous buffer snapshot. Use this after a route change to ensure
     * stale content from the old page is fully erased.
     */
    forceFullRedraw(): void {
        this.prevBuffer = null
    }

    /**
     * Renders the current buffer to the terminal
     */
    render(): void {
        if (!this.initialized) {
            this.initialize()
        }

        // Generate diff and write to stdout
        const output = this.differ.diff(this.prevBuffer, this.buffer)
        if (output) {
            process.stdout.write(output)
        }

        // Save current buffer as previous
        this.prevBuffer = this.buffer.clone()

        // Position and show cursor for focused inputs, otherwise hide
        if (this.cursorPos) {
            const shape = this.options.cursor?.shape ?? 'block'
            const blink = this.options.cursor?.blink ?? true
            this.writer.setCursorShape(shape, blink).showCursor().moveCursor(this.cursorPos.x, this.cursorPos.y)
        } else {
            this.writer.hideCursor()
        }
        this.writer.writeToStdout()
    }

    /**
     * Gets the current screen buffer for rendering
     */
    getBuffer(): ScreenBuffer {
        return this.buffer
    }

    /**
     * Clears the buffer
     */
    clearBuffer(): void {
        this.buffer.clear()
    }

    /**
     * Handles terminal resize
     */
    private handleResize(): void {
        // Debounce resize events to 16ms (60fps) for stability during resize drag
        if (this.resizeTimeoutId) {
            clearTimeout(this.resizeTimeoutId)
        }

        this.resizeTimeoutId = setTimeout(() => {
            this.resizeTimeoutId = null

            const newWidth = process.stdout.columns || 80
            const newHeight = process.stdout.rows || 24

            if (newWidth !== this.width || newHeight !== this.height) {
                // ATOMIC: Update all dimensions together to avoid races
                this.width = newWidth
                this.height = newHeight

                // Resize buffer (marks all rows dirty internally)
                this.buffer.resize(newWidth, newHeight)

                // Clear prevBuffer BEFORE emitting resize event.
                // This ensures the layout engine reflow happens with:
                // - Driver dimensions updated (this.width, this.height)
                // - Buffer dimensions updated (buffer.width, buffer.height)
                // - prevBuffer null (triggers full screen clear if shrinking)
                this.prevBuffer = null

                // Emit resize event - layout engine listens and refloes immediately
                this.emit("resize", { width: newWidth, height: newHeight })
            }
        }, 4) // 60fps - stable during resize drag
    }

    /**
     * Sets up exit handlers to clean up terminal state
     */
    private setupExitHandlers(): void {
        const cleanup = () => {
            this.cleanup()
        }

        process.on("exit", cleanup)
        process.on("SIGINT", () => {
            this.cleanup()
            process.exit(0)
        })
        process.on("SIGTERM", () => {
            this.cleanup()
            process.exit(0)
        })
    }

    /**
     * Cleans up terminal state
     */
    cleanup(): void {
        if (!this.initialized) return

        // Stop input parser
        if (this.inputParser) {
            this.inputParser.stop()
        }

        // Restore terminal
        this.writer.reset()

        if (this.options.enableMouse) {
            this.writer.disableMouse()
        }

        if (this.options.hideCursor) {
            this.writer.showCursor()
        }

        if (this.options.alternateScreen) {
            this.writer.normalScreen()
        }

        this.writer.writeToStdout()

        // Disable raw mode
        if (process.stdin.isTTY && process.stdin.setRawMode) {
            process.stdin.setRawMode(false)
        }

        // Pause stdin to allow process to exit
        process.stdin.pause()

        // Remove resize listener
        process.stdout.off("resize", this.resizeHandler)

        this.initialized = false
    }

    /**
     * Destroys the driver and cleans up
     */
    destroy(): void {
        this.cleanup()
        this.removeAllListeners()
    }
}
