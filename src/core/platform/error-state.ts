import { ref } from "vue"

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
}

export function clearVTermError(): void {
    vtermError.value = null
}
