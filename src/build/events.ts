/**
 * VTerm Event Registry
 *
 * Canonical registry of all internal vterm lifecycle events emitted to the
 * dev log. Add new events here — the type system will enforce consistency
 * everywhere they're used.
 */

import type { LogLevel } from "./logger"

// ── Event definitions ──────────────────────────────────────────────────────

export interface VTermEventMap {
    // Boot sequence
    "vterm:boot":             { cwd: string }
    "vterm:console:capture":  {}
    "vterm:driver:init":      { width: number; height: number }
    "vterm:highlight:config": { theme?: string }
    "vterm:layout:load":      { path: string | null }
    "vterm:routes:load":      { count: number; paths: string[] }
    "vterm:layouts:load":     { names: string[] }
    "vterm:component:build":  { mode: "entry" | "router" | "layout" }
    "vterm:app:create":       {}
    "vterm:app:mount":        {}
    "vterm:boot:complete":    { durationMs: number }

    // Teardown
    "vterm:shutdown":         {}

    // Runtime
    "vterm:error":            { source: string; message: string }
    "vterm:reload":           {}
    "vterm:resize":           { width: number; height: number }
    "vterm:navigate":         { from: string; to: string }
}

export type VTermEventName = keyof VTermEventMap

// Level assigned to each event — keeps noise low by default
const EVENT_LEVELS: Record<VTermEventName, LogLevel> = {
    "vterm:boot":             "info",
    "vterm:console:capture":  "debug",
    "vterm:driver:init":      "info",
    "vterm:highlight:config": "debug",
    "vterm:layout:load":      "debug",
    "vterm:routes:load":      "info",
    "vterm:layouts:load":     "debug",
    "vterm:component:build":  "debug",
    "vterm:app:create":       "debug",
    "vterm:app:mount":        "debug",
    "vterm:boot:complete":    "info",
    "vterm:shutdown":         "info",
    "vterm:error":            "error",
    "vterm:reload":           "info",
    "vterm:resize":           "info",
    "vterm:navigate":         "info",
}

// ── Emitter ────────────────────────────────────────────────────────────────

type Emitter = (level: LogLevel, msg: string, data?: unknown) => void

let _emit: Emitter | null = null

/**
 * Wire up the emitter — called once by installFileLogger.
 */
export function setEventEmitter(emit: Emitter) {
    _emit = emit
}

/**
 * Emit a typed vterm lifecycle event to the dev log.
 *
 * @example
 * vtermEvent("vterm:routes:load", { count: 3, paths: ["/", "/about"] })
 */
export function vtermEvent<K extends VTermEventName>(
    name: K,
    data?: VTermEventMap[K]
) {
    if (!_emit) return
    const level = EVENT_LEVELS[name]
    const msg = data && Object.keys(data).length > 0
        ? `${name} ${JSON.stringify(data)}`
        : name
    _emit(level, msg, undefined)
}
