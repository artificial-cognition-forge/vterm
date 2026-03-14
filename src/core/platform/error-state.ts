import { ref } from "vue"
import { vtermEvent } from "../../build/events"

export interface VTermError {
    message: string
    stack?: string
    source?: string
}

export const vtermError = ref<VTermError | null>(null)

export function setVTermError(error: unknown, source?: string): void {
    const err = error instanceof Error ? error : new Error(String(error))
    vtermError.value = {
        message: err.message,
        stack: err.stack,
        source,
    }
    vtermEvent("vterm:error", { source: source ?? "unknown", message: err.message })
}

export function clearVTermError(): void {
    vtermError.value = null
}
