import { EventEmitter } from "node:events"

/**
 * Key event
 */
export interface KeyEvent {
    name: string
    sequence: string
    ctrl: boolean
    shift: boolean
    meta: boolean
    /** Set to true by a handler to prevent the key from reaching the focused element */
    consumed?: boolean
}

/**
 * Mouse event
 */
export interface MouseEvent {
    type: "mousedown" | "mouseup" | "mousemove" | "wheelup" | "wheeldown"
    button: "left" | "middle" | "right" | "back" | "forward" | "none"
    x: number // 0-indexed column
    y: number // 0-indexed row
    ctrl: boolean
    shift: boolean
    meta: boolean
}

/**
 * Key mappings for special keys
 */
const KEY_MAPPINGS: Record<string, string> = {
    "\r": "enter",
    "\n": "enter",
    "\t": "tab",
    "\x7f": "backspace",
    "\x1b": "escape",
    "\x1b[A": "up",
    "\x1b[B": "down",
    "\x1b[C": "right",
    "\x1b[D": "left",
    "\x1b[H": "home",
    "\x1b[F": "end",
    "\x1b[5~": "pageup",
    "\x1b[6~": "pagedown",
    "\x1b[2~": "insert",
    "\x1b[3~": "delete",
    "\x1b[Z": "shift-tab",
    // F1-F12
    "\x1bOP": "f1",
    "\x1bOQ": "f2",
    "\x1bOR": "f3",
    "\x1bOS": "f4",
    "\x1b[15~": "f5",
    "\x1b[17~": "f6",
    "\x1b[18~": "f7",
    "\x1b[19~": "f8",
    "\x1b[20~": "f9",
    "\x1b[21~": "f10",
    "\x1b[23~": "f11",
    "\x1b[24~": "f12",
}

/**
 * KEY_MAPPINGS sorted by sequence length descending so that the parser always
 * tries the longest (most specific) match first.  Without this, bare "\x1b"
 * would match before "\x1b[A" and arrow keys would be misread as escape.
 */
const SORTED_KEY_MAPPINGS = Object.entries(KEY_MAPPINGS).sort(
    ([a], [b]) => b.length - a.length
)

/**
 * Input Parser - parses raw stdin input into key events
 */
export class InputParser extends EventEmitter {
    private buffer = ""
    private listening = false
    private dataHandler: (chunk: Buffer) => void

    constructor() {
        super()

        // Bind handler
        this.dataHandler = (chunk: Buffer) => this.handleData(chunk)
    }

    /**
     * Starts listening to stdin
     */
    start(): void {
        if (this.listening) return

        process.stdin.on("data", this.dataHandler)
        this.listening = true
    }

    /**
     * Stops listening to stdin
     */
    stop(): void {
        if (!this.listening) return

        process.stdin.off("data", this.dataHandler)
        this.listening = false
    }

    /**
     * Handles raw data from stdin
     */
    private handleData(chunk: Buffer): void {
        const data = chunk.toString()
        this.buffer += data

        // Try to parse complete sequences
        this.parseBuffer()
    }

    /**
     * Parses the buffer for complete key sequences
     */
    private parseBuffer(): void {
        while (this.buffer.length > 0) {
            const parsed = this.parseNext()
            if (!parsed) break

            this.emit("keypress", parsed)
        }
    }

    /**
     * Parses a mouse event from the buffer (SGR extended mode)
     * Format: \x1b[<Cb;Cx;CyM or \x1b[<Cb;Cx;Cym
     * M = press, m = release
     */
    private parseMouseEvent(): MouseEvent | null {
        // Match SGR mouse sequence
        const match = this.buffer.match(/^\x1b\[<(\d+);(\d+);(\d+)([mM])/)
        if (!match) {
            // Check if it might be an incomplete sequence
            if (/^\x1b\[<\d*(;\d*)?(;\d*)?$/.test(this.buffer)) {
                return null // Wait for more data
            }
            // Invalid sequence, skip it
            this.buffer = this.buffer.slice(1)
            return null
        }

        const [fullMatch, cbStr, cxStr, cyStr, action] = match
        this.buffer = this.buffer.slice(fullMatch!.length)

        const cb = parseInt(cbStr!, 10)
        const x = parseInt(cxStr!, 10) - 1 // Convert to 0-indexed
        const y = parseInt(cyStr!, 10) - 1 // Convert to 0-indexed
        // Parse button and modifiers from cb
        const buttonCode = cb & 0x3f
        const shift = !!(cb & 0x04)
        const meta = !!(cb & 0x08)
        const ctrl = !!(cb & 0x10)
        const move = !!(cb & 0x20)
        const wheel = !!(cb & 0x40)

        // Determine event type
        let type: MouseEvent["type"]
        let button: MouseEvent["button"]

        // Wheel events (button 4 = scroll up, button 5 = scroll down)
        // In SGR mode, wheel events are encoded with cb values 64 and 65
        if (cb === 64 || cb === 65) {
            // Wheel event
            type = cb === 64 ? "wheelup" : "wheeldown"
            button = "none"
        } else if (cb === 8 || cb === 9) {
            // Back/forward mouse buttons (buttons 4 and 5 in X11 terminology)
            type = action === "M" ? "mousedown" : "mouseup"
            button = cb === 8 ? "back" : "forward"
        } else if (move) {
            // Move events
            type = "mousemove"
            button =
                (buttonCode & 0x03) === 0
                    ? "left"
                    : (buttonCode & 0x03) === 1
                      ? "middle"
                      : (buttonCode & 0x03) === 2
                        ? "right"
                        : "none"
        } else {
            // Click events
            type = action === "M" ? "mousedown" : "mouseup"
            button =
                (buttonCode & 0x03) === 0
                    ? "left"
                    : (buttonCode & 0x03) === 1
                      ? "middle"
                      : (buttonCode & 0x03) === 2
                        ? "right"
                        : "none"
        }

        return {
            type,
            button,
            x,
            y,
            ctrl,
            shift,
            meta,
        }
    }

    /**
     * Parses the next key from the buffer
     */
    private parseNext(): KeyEvent | null {
        if (this.buffer.length === 0) return null

        // Parse mouse events (SGR extended mode: \x1b[<...)
        if (this.buffer.startsWith("\x1b[<")) {
            const mouseEvent = this.parseMouseEvent()
            if (mouseEvent) {
                this.emit("mouse", mouseEvent)
                // Continue parsing next event
                return this.parseNext()
            } else {
                // Incomplete sequence, wait for more data
                return null
            }
        }

        // Filter out old-style mouse events (\x1b[M) - we only support SGR mode
        if (this.buffer.startsWith("\x1b[M")) {
            const match = this.buffer.match(/^\x1b\[M.../)
            if (match) {
                this.buffer = this.buffer.slice(match[0].length)
                return this.parseNext()
            }
            return null
        }

        // Try to match escape sequences — longest first so that e.g. "\x1b[A"
        // (up arrow) is matched before bare "\x1b" (escape).
        for (const [sequence, name] of SORTED_KEY_MAPPINGS) {
            if (this.buffer.startsWith(sequence)) {
                this.buffer = this.buffer.slice(sequence.length)
                return this.createKeyEvent(name, sequence)
            }
        }

        // Check for other unknown escape sequences - discard them
        if (this.buffer.startsWith("\x1b[") || this.buffer.startsWith("\x1b]")) {
            // Try to find the end (usually a letter or ~)
            const match = this.buffer.match(/^\x1b\[[0-9;]*[a-zA-Z~]/)
            if (match) {
                this.buffer = this.buffer.slice(match[0].length)
                // Skip unknown sequence, parse next
                return this.parseNext()
            }
            // Incomplete sequence, wait for more data
            return null
        }

        // Check for Ctrl combinations (ASCII 0-31)
        const charCode = this.buffer.charCodeAt(0)
        if (charCode > 0 && charCode < 32 && charCode !== 9 && charCode !== 13) {
            const char = String.fromCharCode(charCode + 96) // Convert to letter
            const sequence = this.buffer[0]!
            this.buffer = this.buffer.slice(1)
            return {
                name: char,
                sequence,
                ctrl: true,
                shift: false,
                meta: false,
            }
        }

        // Check for Meta/Alt combinations (ESC + char)
        if (this.buffer.startsWith("\x1b") && this.buffer.length > 1) {
            const nextChar = this.buffer[1]
            if (nextChar && nextChar !== "[" && nextChar !== "O") {
                const sequence = this.buffer.slice(0, 2)
                this.buffer = this.buffer.slice(2)
                return {
                    name: nextChar,
                    sequence,
                    ctrl: false,
                    shift: false,
                    meta: true,
                }
            }
        }

        // Regular character
        const char = this.buffer[0]!
        this.buffer = this.buffer.slice(1)

        // Check if it's uppercase (shift)
        const isUpper = char === char.toUpperCase() && char !== char.toLowerCase()

        return {
            name: char.toLowerCase(),
            sequence: char,
            ctrl: false,
            shift: isUpper,
            meta: false,
        }
    }

    /**
     * Creates a key event
     */
    private createKeyEvent(name: string, sequence: string): KeyEvent {
        // Check for shift modifier in name
        let shift = false
        let actualName = name

        if (name.startsWith("shift-")) {
            shift = true
            actualName = name.slice(6)
        }

        return {
            name: actualName,
            sequence,
            ctrl: false,
            shift,
            meta: false,
        }
    }
}

/**
 * Formats a key event as a string (for debugging/display)
 */
export function formatKeyEvent(key: KeyEvent): string {
    const parts: string[] = []

    if (key.ctrl) parts.push("ctrl")
    if (key.shift) parts.push("shift")
    if (key.meta) parts.push("meta")
    parts.push(key.name)

    return parts.join("+")
}
