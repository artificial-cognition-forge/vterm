import { computed, inject, ref, onMounted, onUnmounted } from "vue"
import { ScreenSymbol } from "./useScreen"
import { useConsole } from "./useConsole"

/**
 * Access the terminal state (width, height)
 *
 * @returns Terminal state and information
 *
 * @example
 * ```ts
 * const terminal = useTerminal()
 * console.log(terminal.width)   // Current terminal width
 * console.log(terminal.height)  // Current terminal height
 * ```
 */
export function useTerminal() {
	const screen = inject(ScreenSymbol)
	if (!screen) {
		throw new Error("useTerminal must be called within a vterm app context")
	}

	// Create reactive refs for terminal dimensions
	const terminalWidth = ref(screen.width)
	const terminalHeight = ref(screen.height)

	// Listen for resize events and update reactive refs
	const handleResize = (event: any) => {
		terminalWidth.value = event.width
		terminalHeight.value = event.height
	}

	// Register resize listener on mount, cleanup on unmount
	onMounted(() => {
		screen.on("resize", handleResize)
	})

	onUnmounted(() => {
		screen.off("resize", handleResize)
	})

	return {
		/**
		 * Current terminal width in columns (reactive)
		 */
		width: computed(() => terminalWidth.value),

		/**
		 * Current terminal height in rows (reactive)
		 */
		height: computed(() => terminalHeight.value),

		/**
		 * Captured console output — reactive refs for log, warn, info, error entries
		 */
		console: useConsole(),
	}
}
