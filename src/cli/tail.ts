/**
 * vterm tail — stream .vterm/dev.log.jsonl to stdout with pretty formatting
 *
 * Usage:
 *   vterm tail              # follow log (default)
 *   vterm tail --no-follow  # print existing entries and exit
 *   vterm tail --level error
 *   vterm tail --filter sometext
 */

import { existsSync, statSync, readFileSync, watchFile } from "fs"
import { resolve } from "path"
import type { LogLevel, LogEntry } from "../build/logger"

const COLORS: Record<LogLevel, string> = {
    log:   "\x1b[37m",   // white
    info:  "\x1b[36m",   // cyan
    warn:  "\x1b[33m",   // yellow
    error: "\x1b[31m",   // red
    debug: "\x1b[35m",   // magenta
}

const BADGES: Record<LogLevel, string> = {
    log:   " LOG  ",
    info:  " INFO ",
    warn:  " WARN ",
    error: " ERR  ",
    debug: " DBG  ",
}

const RESET = "\x1b[0m"
const DIM   = "\x1b[2m"
const BOLD  = "\x1b[1m"

function formatTime(ts: number): string {
    const d = new Date(ts)
    const h = String(d.getHours()).padStart(2, "0")
    const m = String(d.getMinutes()).padStart(2, "0")
    const s = String(d.getSeconds()).padStart(2, "0")
    const ms = String(d.getMilliseconds()).padStart(3, "0")
    return `${h}:${m}:${s}.${ms}`
}

function formatEntry(entry: LogEntry, filter?: string): string | null {
    const line = entry.msg
    if (filter && !line.toLowerCase().includes(filter.toLowerCase())) return null

    const color = COLORS[entry.level] ?? COLORS.log
    const badge = BADGES[entry.level] ?? BADGES.log
    const time = DIM + formatTime(entry.t) + RESET
    const src = entry.source ? DIM + ` ${entry.source}` + RESET : ""
    const msg = color + entry.msg + RESET

    return `${time} ${color}${BOLD}${badge}${RESET}${src}\n  ${msg}`
}

function parseLine(line: string): LogEntry | null {
    try {
        return JSON.parse(line) as LogEntry
    } catch {
        return null
    }
}

export async function tail(options: {
    level?: LogLevel
    filter?: string
    follow?: boolean
    cwd?: string
}) {
    const { level, filter, follow = true, cwd = process.cwd() } = options
    const logPath = resolve(cwd, ".vterm", "dev.log.jsonl")

    if (!existsSync(logPath)) {
        console.error(`No dev log found at ${logPath}`)
        console.error(`Start your app with \`vterm dev\` first.`)
        process.exit(1)
    }

    let offset = 0

    function flush() {
        const size = statSync(logPath).size
        if (size < offset) {
            // File was cleared (new dev session)
            offset = 0
            process.stdout.write("\x1b[2J\x1b[H") // clear screen
            process.stdout.write(DIM + "─── new session ───\n" + RESET)
        }
        if (size === offset) return

        const buf = readFileSync(logPath)
        const chunk = buf.slice(offset).toString("utf8")
        offset = size

        for (const raw of chunk.split("\n")) {
            const trimmed = raw.trim()
            if (!trimmed) continue
            const entry = parseLine(trimmed)
            if (!entry) continue
            if (level && entry.level !== level) continue
            const formatted = formatEntry(entry, filter)
            if (formatted) process.stdout.write(formatted + "\n")
        }
    }

    // Print existing entries
    flush()

    if (!follow) return

    process.stdout.write(DIM + `\n── following ${logPath} ──\n\n` + RESET)

    // Watch for changes
    watchFile(logPath, { interval: 100 }, flush)

    // Keep alive
    await new Promise(() => {})
}
