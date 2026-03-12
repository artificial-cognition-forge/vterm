import { ref } from "vue"

export interface ConsoleEntry {
    message: string
    timestamp: number
}

export interface ConsoleLog {
    log: ConsoleEntry[]
    warn: ConsoleEntry[]
    info: ConsoleEntry[]
    error: ConsoleEntry[]
}

// Module-level reactive state — shared across all components
const logs = ref<ConsoleEntry[]>([])
const warns = ref<ConsoleEntry[]>([])
const infos = ref<ConsoleEntry[]>([])
const errors = ref<ConsoleEntry[]>([])

let _installed = false

/**
 * Install global console overrides. Safe to call multiple times — only installs once.
 * Should be called early in the vterm() boot sequence.
 */
export function installConsoleCapture() {
    if (_installed) return
    _installed = true

    const originalLog = console.log.bind(console)
    const originalWarn = console.warn.bind(console)
    const originalInfo = console.info.bind(console)
    const originalError = console.error.bind(console)

    const fmt = (...args: any[]) =>
        args.map(a => (typeof a === "string" ? a : JSON.stringify(a))).join(" ")

    console.log = (...args: any[]) => {
        logs.value.push({ message: fmt(...args), timestamp: Date.now() })
    }
    console.warn = (...args: any[]) => {
        warns.value.push({ message: fmt(...args), timestamp: Date.now() })
    }
    console.info = (...args: any[]) => {
        infos.value.push({ message: fmt(...args), timestamp: Date.now() })
    }
    console.error = (...args: any[]) => {
        errors.value.push({ message: fmt(...args), timestamp: Date.now() })
    }

    // Keep originals accessible for internal vterm use
    ;(console as any)._vtermLog = originalLog
    ;(console as any)._vtermWarn = originalWarn
    ;(console as any)._vtermInfo = originalInfo
    ;(console as any)._vtermError = originalError
}

/**
 * Restore original console methods and clear captured state.
 */
export function uninstallConsoleCapture() {
    if (!_installed) return
    _installed = false

    if ((console as any)._vtermLog) console.log = (console as any)._vtermLog
    if ((console as any)._vtermWarn) console.warn = (console as any)._vtermWarn
    if ((console as any)._vtermInfo) console.info = (console as any)._vtermInfo
    if ((console as any)._vtermError) console.error = (console as any)._vtermError

    logs.value = []
    warns.value = []
    infos.value = []
    errors.value = []
}

/**
 * Access captured console output. Returns reactive refs for use in components.
 */
export function useConsole() {
    return {
        log: logs,
        warn: warns,
        info: infos,
        error: errors,
    }
}
