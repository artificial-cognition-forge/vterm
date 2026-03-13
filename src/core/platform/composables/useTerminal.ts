import { computed, inject, ref, watch, onMounted, onUnmounted } from "vue"
import { ScreenSymbol, BufferRendererSymbol, SelectionSymbol } from "./useScreen"
import { useConsole } from "./useConsole"

/**
 * Access the terminal state and reactive controls for cursor and scrollbar appearance.
 *
 * @returns Terminal state, dimensions, and style controls
 *
 * @example
 * ```ts
 * const terminal = useTerminal()
 * console.log(terminal.width.value)   // Current terminal width
 * console.log(terminal.height.value)  // Current terminal height
 *
 * // Change cursor shape reactively
 * terminal.cursor.shape.value = 'underline'
 * terminal.cursor.blink.value = false
 *
 * // Change scrollbar characters reactively
 * terminal.scrollbar.thumb.value = '▓'
 * terminal.scrollbar.track.value = '┆'
 * ```
 */
export function useTerminal() {
	const screen = inject(ScreenSymbol)
	if (!screen) {
		throw new Error("useTerminal must be called within a vterm app context")
	}

	const bufferRenderer = inject(BufferRendererSymbol)
	const selectionManager = inject(SelectionSymbol)

	// ── Dimensions ──────────────────────────────────────────────────────────────

	const terminalWidth = ref(screen.width)
	const terminalHeight = ref(screen.height)

	const handleResize = (event: any) => {
		terminalWidth.value = event.width
		terminalHeight.value = event.height
	}

	onMounted(() => {
		screen.on("resize", handleResize)
	})

	onUnmounted(() => {
		screen.off("resize", handleResize)
	})

	// ── Cursor controls ──────────────────────────────────────────────────────────

	const cursorShape = ref<'block' | 'line' | 'underline'>('block')
	const cursorBlink = ref<boolean>(true)

	watch(cursorShape, (shape) => {
		screen.setCursorOptions({ shape })
		screen.forceFullRedraw()
		screen.render()
	})

	watch(cursorBlink, (blink) => {
		screen.setCursorOptions({ blink })
		screen.forceFullRedraw()
		screen.render()
	})

	// ── Scrollbar controls ───────────────────────────────────────────────────────

	const scrollbarThumb = ref<string>('█')
	const scrollbarTrack = ref<string>('│')

	watch([scrollbarThumb, scrollbarTrack], ([thumb, track]) => {
		bufferRenderer?.setUIConfig({ scrollbar: { thumb, track } })
		screen.forceFullRedraw()
		screen.render()
	})

	// ── Public API ───────────────────────────────────────────────────────────────

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

		/**
		 * Reactive cursor controls. Assign to trigger a live update.
		 *
		 * @example
		 * terminal.cursor.shape.value = 'underline'
		 * terminal.cursor.blink.value = false
		 * terminal.cursor.set(3, 5)   // imperative position
		 * terminal.cursor.clear()     // hide cursor
		 */
		cursor: {
			/** Writable ref — 'block' | 'line' | 'underline' */
			shape: cursorShape,
			/** Writable ref — true to blink */
			blink: cursorBlink,
			/** Imperatively position cursor at (x, y) */
			set: (x: number, y: number) => screen.setCursor(x, y),
			/** Hide cursor */
			clear: () => screen.clearCursor(),
		},

		/**
		 * Reactive scrollbar character controls. Assign to trigger a live update.
		 *
		 * @example
		 * terminal.scrollbar.thumb.value = '▓'
		 * terminal.scrollbar.track.value = '┆'
		 */
		scrollbar: {
			/** Writable ref — character used for the scrollbar thumb */
			thumb: scrollbarThumb,
			/** Writable ref — character used for the scrollbar track */
			track: scrollbarTrack,
		},

		/**
		 * Terminal-level text selection (screen-coordinate drag selection).
		 * This is the global mouse-drag selection, independent of focused input elements.
		 *
		 * @example
		 * if (terminal.selection.hasSelection.value) {
		 *   const text = terminal.selection.getText()
		 *   terminal.selection.clear()
		 * }
		 */
		selection: {
			/** Reactive boolean — true when a visible drag selection exists */
			hasSelection: computed(() => selectionManager?.hasSelection() ?? false),
			/** Reactive boolean — true while the user is actively dragging */
			isDragging: computed(() => selectionManager?.isDragging() ?? false),
			/** Copy selected text to clipboard via OSC 52 */
			copy: () => {
				if (selectionManager) {
					selectionManager.copyToClipboard(screen.getBuffer())
				}
			},
			/** Get the currently selected text from the screen buffer */
			getText: () => selectionManager?.getSelectedText(screen.getBuffer()) ?? '',
			/** Clear the current selection */
			clear: () => {
				selectionManager?.clearSelection()
				screen.forceFullRedraw()
				screen.render()
			},
		},
	}
}
