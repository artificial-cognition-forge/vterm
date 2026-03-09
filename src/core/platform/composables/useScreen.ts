import { inject, type InjectionKey } from "vue"
import type { TerminalDriver } from "../../../runtime/terminal/driver"
import type { InteractionManager } from "../../../runtime/renderer/interaction"

/**
 * Injection key for terminal driver instance
 */
export const ScreenSymbol: InjectionKey<TerminalDriver> = Symbol("vterm-screen")

/**
 * Injection key for immediate render function
 */
export const RenderSymbol: InjectionKey<() => void> = Symbol("vterm-render")

/**
 * Injection key for interaction manager (focus, hover, active state)
 */
export const InteractionSymbol: InjectionKey<InteractionManager> = Symbol("vterm-interaction")

/**
 * Access the terminal driver instance for screen-level operations
 *
 * @returns The terminal driver instance
 *
 * @example
 * ```ts
 * const screen = useScreen()
 * screen.render() // Manual render
 * const width = screen.width // Screen dimensions
 * ```
 */
export function useScreen(): TerminalDriver {
    const screen = inject(ScreenSymbol)
    if (!screen) {
        throw new Error("useScreen must be called within a vterm app context")
    }
    return screen
}

/**
 * Access the immediate render function to bypass throttling
 *
 * Use this for interactive elements that need instant visual feedback
 * like text input, to avoid the render throttling delay.
 *
 * @returns Immediate render function that bypasses throttling
 *
 * @example
 * ```ts
 * const render = useRender()
 *
 * // Trigger immediate visual update
 * onSomeEvent(() => {
 *   updateState()
 *   render() // Immediate visual update
 * })
 * ```
 */
export function useRender(): () => void {
    const render = inject(RenderSymbol)
    if (!render) {
        throw new Error("useRender must be called within a vterm app context")
    }
    return render
}
