import { computed, inject, ref, watch, onMounted, onUnmounted } from "vue"
import { ScreenSymbol, BufferRendererSymbol, SelectionSymbol, HighlightSymbol, ExitSymbol, ReloadSymbol } from "./useScreen"
import { useConsole } from "./useConsole"
import type { NerdFontName } from "../../../runtime/elements/nerd-fonts"

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
	const highlightController = inject(HighlightSymbol)
	const exitFn = inject(ExitSymbol)
	const reloadFn = inject(ReloadSymbol)

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

	// ── Highlight theme ──────────────────────────────────────────────────────────

	const highlightTheme = ref<string>(highlightController?.getTheme() ?? 'github-dark')

	watch(highlightTheme, (theme) => {
		highlightController?.setTheme(theme as any)
	})

	// ── Scrollbar controls ───────────────────────────────────────────────────────

	const scrollbarThumb = ref<string>('█')
	const scrollbarTrack = ref<string>('│')

	watch([scrollbarThumb, scrollbarTrack], ([thumb, track]) => {
		bufferRenderer?.setUIConfig({ scrollbar: { thumb, track } })
		screen.forceFullRedraw()
		screen.render()
	})

	// ── Nerd Fonts ───────────────────────────────────────────────────────────

	const nerdfontsSetting = ref<NerdFontName | false>('v3')

	watch(nerdfontsSetting, (value) => {
		bufferRenderer?.setUIConfig({ nerdfonts: value })
	})

	// ── Paste / file drop ────────────────────────────────────────────────────────

	const pasteHandlers = new Set<(text: string) => void>()
	const dropHandlers = new Set<(path: string) => void>()

	const handlePaste = (text: string) => {
		// A file drop arrives as a path string, often shell-quoted: '/path/to/file'
		// Strip surrounding single quotes if present, then check if it looks like a path.
		const trimmed = text.trim()
		// Terminals shell-quote dropped paths: '/foo/bar' '/baz/qux'
		// Extract all quoted or unquoted path tokens.
		const pathTokens: string[] = []
		const quotedPaths = trimmed.match(/'([^']+)'/g)
		if (quotedPaths) {
			for (const q of quotedPaths) {
				pathTokens.push(q.slice(1, -1))
			}
		} else {
			// No quotes — treat entire trimmed string as a single path candidate
			pathTokens.push(trimmed)
		}

		const isPath = (s: string) => /^(~?\/|\.\.?\/|[a-zA-Z]:\\)/.test(s)
		const droppedPaths = pathTokens.filter(isPath)

		for (const h of pasteHandlers) h(text)
		for (const p of droppedPaths) {
			for (const h of dropHandlers) h(p)
		}
	}

	onMounted(() => {
		screen.on("paste", handlePaste)
	})

	onUnmounted(() => {
		screen.off("paste", handlePaste)
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
		 * Reactive syntax highlight theme control (Shiki).
		 * Assign `theme` to switch the active theme at runtime — the cache is
		 * cleared and all visible code re-highlights automatically.
		 *
		 * Theme names come from the Shiki `BundledTheme` type, e.g.
		 * 'github-dark', 'nord', 'dracula', 'one-dark-pro', 'vitesse-light'.
		 *
		 * @example
		 * terminal.highlight.theme.value = 'nord'
		 */
		highlight: {
			/** Writable ref — Shiki theme name */
			theme: highlightTheme,
		},

		/**
		 * Nerd Fonts support. Controls whether <icon> elements and resolveIcon()
		 * use Nerd Fonts codepoints. Assign to switch at runtime.
		 *
		 * @example
		 * terminal.nerdfonts.value = 'v3'   // default, recommended
		 * terminal.nerdfonts.value = 'v2'   // legacy patched fonts
		 * terminal.nerdfonts.value = false  // disable, show raw name fallback
		 */
		nerdfonts: nerdfontsSetting,

		/**
		 * Register a handler called whenever the user pastes text (or drops a file).
		 * The raw pasted string is passed to the handler.
		 * The returned function removes the handler (call it on unmount if needed).
		 *
		 * @example
		 * terminal.onPaste((text) => { inputText.value += text })
		 */
		onPaste: (handler: (text: string) => void) => {
			pasteHandlers.add(handler)
			return () => pasteHandlers.delete(handler)
		},

		/**
		 * Register a handler called when the user drops a file path into the terminal.
		 * Only fires when the pasted text looks like a file path (starts with / ~ ./ ../).
		 * The trimmed path string is passed to the handler.
		 * The returned function removes the handler.
		 *
		 * @example
		 * terminal.onDrop((path) => { inputText.value += path })
		 */
		onDrop: (handler: (path: string) => void) => {
			dropHandlers.add(handler)
			return () => dropHandlers.delete(handler)
		},

		/**
		 * Gracefully exit the application — unmounts the app and restores the terminal.
		 *
		 * @example
		 * terminal.exit()
		 */
		exit: () => exitFn?.(),

		/**
		 * Trigger a full hot reload of the application.
		 * Clears the component and auto-import caches and remounts the app.
		 *
		 * @example
		 * terminal.reload()
		 */
		reload: () => reloadFn?.(),

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
