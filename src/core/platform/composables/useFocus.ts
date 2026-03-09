import { inject } from "vue"
import { InteractionSymbol } from "./useScreen"

/**
 * Manage focus programmatically between interactive elements.
 *
 * Focusable elements are: button, input, textarea, select, and any element
 * with @press, @click, or @keypress handlers.
 *
 * @example
 * ```ts
 * const { focusNext, focusPrevious } = useFocus()
 * useKeys('tab', focusNext)
 * useKeys('shift-tab', focusPrevious)
 * ```
 */
export function useFocus() {
    const manager = inject(InteractionSymbol)
    if (!manager) {
        throw new Error("useFocus must be called within a vterm app context")
    }

    return {
        focusNext: () => manager.focusNext(),
        focusPrevious: () => manager.focusPrevious(),
        focusFirst: () => manager.focusFirst(),
        focusLast: () => manager.focusLast(),
    }
}
