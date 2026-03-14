/**
 * VTerm Dev Logger
 *
 * Hooks into the existing console capture system and writes structured JSONL
 * to .vterm/dev.log.jsonl during dev mode. Zero changes required at call sites.
 */

import { appendFileSync, mkdirSync, writeFileSync } from "fs"
import { resolve } from "path"
import { setEventEmitter } from "./events"

export type LogLevel = "log" | "info" | "warn" | "error" | "debug"

export interface LogEntry {
    t: number
    level: LogLevel
    msg: string
    data?: unknown
    source?: string
}

let logPath: string | null = null
let _installed = false

/**
 * Extract a short source hint from the current call stack.
 * Skips vterm internals and returns the first user-relevant frame.
 */
function getSource(): string | undefined {
    const err = new Error()
    const lines = err.stack?.split("\n") ?? []
    // Skip: Error, writeEntry, console shim, logger internals
    for (const line of lines.slice(4)) {
        const trimmed = line.trim()
        if (!trimmed.startsWith("at ")) continue
        // Skip node internals and vterm's own logger/console files
        if (trimmed.includes("node:") || trimmed.includes("bun:")) continue
        if (trimmed.includes("logger.ts") || trimmed.includes("useConsole.ts")) continue
        // Extract file:line
        const match = trimmed.match(/\((.+)\)$/) ?? trimmed.match(/at (.+)$/)
        if (match) {
            // Shorten to just filename:line
            return match[1]!.replace(/.*[/\\]/, "").replace(/\?.*$/, "")
        }
    }
    return undefined
}

function writeEvent(level: LogLevel, msg: string) {
    if (!logPath) return
    const entry: LogEntry = { t: Date.now(), level, msg, source: getSource() }
    try {
        appendFileSync(logPath, JSON.stringify(entry) + "\n")
    } catch {}
}

function writeEntry(level: LogLevel, args: unknown[]) {
    if (!logPath) return
    const msg = (Array.isArray(args) ? args : [args]).map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")
    const entry: LogEntry = {
        t: Date.now(),
        level,
        msg,
        source: getSource(),
    }
    try {
        appendFileSync(logPath, JSON.stringify(entry) + "\n")
    } catch {
        // Never crash the app because logging failed
    }
}

/**
 * Install the file logger. Hooks into the already-intercepted console methods
 * set up by installConsoleCapture() — must be called after that.
 */
export function installFileLogger(vtermDir: string) {
    if (_installed) return
    _installed = true

    try {
        mkdirSync(vtermDir, { recursive: true })
        logPath = resolve(vtermDir, "dev.log.jsonl")
        // Clear on each boot so stale logs don't accumulate
        writeFileSync(logPath, "")
    } catch {
        return
    }

    // Wrap the already-intercepted console methods to also write to file
    const prev = {
        log: console.log,
        info: console.info,
        warn: console.warn,
        error: console.error,
        debug: (console as any).debug ?? console.log,
    }

    console.log = (...args) => { writeEntry("log", args); prev.log(...args) }
    console.info = (...args) => { writeEntry("info", args); prev.info(...args) }
    console.warn = (...args) => { writeEntry("warn", args); prev.warn(...args) }
    console.error = (...args) => { writeEntry("error", args); prev.error(...args) }
    ;(console as any).debug = (...args: unknown[]) => { writeEntry("debug", args); prev.debug(...args) }

    // Also capture uncaught errors directly to the log file
    process.on("uncaughtException", (err) => {
        writeEntry("error", [`[uncaughtException] ${err.message}`, err.stack ?? ""])
    })
    process.on("unhandledRejection", (reason) => {
        const msg = reason instanceof Error ? reason.message : String(reason)
        const stack = reason instanceof Error ? reason.stack ?? "" : ""
        writeEntry("error", [`[unhandledRejection] ${msg}`, stack])
    })

    // Wire up the typed event emitter
    setEventEmitter(writeEvent)

    writeEntry("log", ["[vterm] dev logger started"])
}

export function uninstallFileLogger() {
    _installed = false
    logPath = null
}
