import { inject, onUnmounted } from "vue"
import { ScreenSymbol } from "./useScreen"

/**
 * Hook into keyboard input for custom shortcuts and key bindings
 *
 * @param keys - Key names or array of key names (e.g., 'enter', ['left', 'h'])
 * @param handler - Callback function when key is pressed
 *
 * @example
 * ```ts
 * useKeys(['left', 'h'], () => moveCursor('left'))
 * useKeys('enter', () => submit())
 * ```
 */
export function useKeys(keys: string | string[], handler: (...args: any[]) => void) {
    const screen = inject(ScreenSymbol)
    if (!screen) {
        throw new Error("useKeys must be called within a vterm app context")
    }

    const keyArray = Array.isArray(keys) ? keys : [keys]

    // Register the key handler
    screen.key(keyArray, handler)

    // Cleanup on unmount
    onUnmounted(() => {
        // Unregister each key individually
        for (const key of keyArray) {
            screen.unkey(key, handler)
        }
    })
}
