import type { App } from "vue"
import type { BundledTheme, BundledLanguage } from "shiki"
import type { TerminalDriver } from "../runtime/terminal/driver"
import type { NerdFontName } from "../runtime/elements/nerd-fonts"

/**
 * Text selection highlight configuration
 */
export interface SelectionConfig {
    /** Selection highlight color — hex (#rrggbb) or named terminal color (default: '#4a7bc4') */
    color?: string
    /** Blend opacity 0–1: 0 = fully transparent, 1 = solid color (default: 0.4) */
    opacity?: number
}

/**
 * Syntax highlighting configuration (powered by Shiki)
 */
export interface HighlightConfig {
    /** Shiki theme to use for syntax highlighting (default: 'dark-plus') */
    theme?: BundledTheme
    /** Additional languages to preload beyond the built-in common set */
    langs?: BundledLanguage[]
}

/**
 * Scrollbar appearance configuration
 */
export interface ScrollbarConfig {
    /** Character to use for scrollbar thumb (default: '█') */
    thumb?: string
    /** Character to use for scrollbar track (default: '│') */
    track?: string
}

/**
 * Cursor appearance configuration
 */
export interface CursorConfig {
    /** Cursor shape: 'block', 'line', or 'underline' (default: 'block') */
    shape?: 'block' | 'line' | 'underline'
    /** Whether cursor should blink (default: true) */
    blink?: boolean
}

/**
 * UI customization options (non-CSS features)
 */
export interface UIConfig {
    /** Scrollbar appearance (characters, colors) */
    scrollbar?: ScrollbarConfig
    /** Cursor appearance (shape, blinking) */
    cursor?: CursorConfig
    /**
     * Nerd Fonts support.
     *
     * - Font name string (e.g. `'JetBrainsMono Nerd Font'`) — enables v3 codepoints,
     *   documents which font is in use. Autocompletes all official Nerd Fonts names.
     * - `'v3'`   — explicit v3 codepoints (default).
     * - `'v2'`   — legacy codepoints for older patched fonts.
     * - `false`  — disabled; `<icon>` elements fall back to rendering the raw name.
     */
    nerdfonts?: NerdFontName | false
}

/**
 * Terminal screen configuration options
 */
export interface ScreenOptions {
    title?: string
    smartCSR?: boolean
    fullUnicode?: boolean
    dockBorders?: boolean
    ignoreDockContrast?: boolean
    [key: string]: any
}

/**
 * Configuration file format for vterm.config.ts
 * Used by the CLI dev server
 */
export interface VTermConfig {
    /** Path to Vue SFC entry point (ignored if using file-based routing with app/pages) */
    entry?: string

    /** Optional path to layout component (default: app/app.vue if it exists) */
    layout?: string | false

    /** Optional terminal screen configuration */
    screen?: ScreenOptions

    /** Quit keys (default: ['C-c']) */
    quitKeys?: string[]

    /** Storage configuration */
    store?: {
        /** Custom data directory for stores (overrides platform defaults) */
        dataDir?: string
    }

    /** Error pages configuration */
    errorPages?: {
        /** Path to custom 404 error page component (default: built-in 404 component) */
        notFound?: string
        /** Path to custom 500 error page component (default: built-in 500 component) */
        serverError?: string
    }

    /** Syntax highlighting configuration */
    highlight?: HighlightConfig

    /** Text selection highlight style */
    selection?: SelectionConfig

    /** UI customization (scrollbar, cursor, etc.) */
    ui?: UIConfig

    /** npm deployment configuration */
    npm?: {
        /** npm package name (defaults to package.json name) */
        name?: string
        /** npm registry URL (default: https://registry.npmjs.org) */
        registry?: string
        /** Package access level (default: 'public') */
        access?: 'public' | 'restricted'
    }
}

/**
 * Metadata for a page component.
 * Passed to definePageMeta() in page scripts.
 *
 * The `layout` property is NOT declared here — it is added exclusively by the
 * generated .vterm/layouts.d.ts via module augmentation, with the exact union
 * of layout names found in app/layout/. This ensures the IDE shows the narrow
 * type ('default' | false) rather than the wide string fallback.
 *
 * Other per-page metadata can be added via additional module augmentations.
 */
export interface PageMeta {
    [key: string]: any
}

/**
 * Define metadata for a page component.
 * This is a no-op at runtime — metadata is extracted at build time
 * and embedded in the route manifest (.vterm/routes.ts).
 */
export function definePageMeta(_meta: PageMeta): void {}

/**
 * Define a vterm config with sensible defaults.
 * Use this in your vterm.config.ts instead of a plain object.
 */
export function defineVtermConfig(config: Partial<VTermConfig> = {}): VTermConfig {
    return {
        ...config,
        screen: { title: 'VTerm', ...config.screen },
        quitKeys: config.quitKeys ?? ['C-c'],
        highlight: {
            theme: 'dark-plus',
            ...config.highlight,
        },
        ui: {
            ...config.ui,
            scrollbar: {
                thumb: '█',
                track: '│',
                ...config.ui?.scrollbar,
            },
            cursor: {
                shape: 'block',
                blink: true,
                ...config.ui?.cursor,
            },
        },
    }
}

/**
 * Runtime options for vterm() function
 */
export interface VTermOptions {
    /** Entry component — path string (dev) or pre-compiled component object (production) */
    entry?: string | object

    /** Layout component — path string (dev), pre-compiled component object (prod), or false */
    layout?: string | object | false

    /** Pre-compiled routes (production only). Each route must have .component set. */
    routes?: Array<{ path: string; component: object; name?: string; meta?: Record<string, any> }>

    /** Pre-extracted style blocks from compiled SFCs (production only). */
    styles?: Array<{ content: string; scoped: boolean; scopeId?: string }>[]

    /** Per-page layout components keyed by layout name (production only). */
    layouts?: Map<string, object>

    /** Called after the app is mounted */
    onMounted?: (app: VTermApp) => void

    /** Called when terminal.reload() is invoked — implement to trigger a full hot reload */
    onReload?: () => Promise<void>

    /** Quit keys (default: ['C-c']) */
    quitKeys?: string[]

    /** Storage configuration */
    store?: {
        /** Custom data directory for stores (overrides platform defaults) */
        dataDir?: string
    }

    /** Error pages configuration */
    errorPages?: {
        /** Path to custom 404 error page component */
        notFound?: string
        /** Path to custom 500 error page component */
        serverError?: string
    }

    /** Syntax highlighting configuration */
    highlight?: HighlightConfig

    /** Text selection highlight style */
    selection?: SelectionConfig

    /** UI customization (scrollbar, cursor, etc.) */
    ui?: UIConfig

    /**
     * Reactive values to inject into all components.
     * Each key is injectable via inject(key) inside any component.
     *
     * @example
     * const log = ref<string[]>([])
     * const app = await vterm({ entry: '...', context: { log } })
     * log.value.push('new event') // components see this instantly
     */
    context?: Record<string, unknown>
}

/**
 * Options for vtermApp.snapshot()
 */
export interface SnapshotOptions {
    /**
     * Output format:
     * - 'text' (default): plain characters, rows joined with '\n'
     * - 'ansi': ANSI-escaped string with colors/styles preserved
     */
    format?: 'text' | 'ansi'
}

/**
 * VTerm application instance
 */
export interface VTermApp {
    /** Terminal driver instance (for backwards compatibility, exposed as 'screen') */
    screen: TerminalDriver

    /** Vue app instance */
    app: App

    /** Unmount the app and cleanup */
    unmount: () => Promise<void>

    /** Manually trigger a screen render */
    render: () => void

    /**
     * Capture the current screen as a string snapshot.
     * Default format is plain text (characters only, rows joined with '\n').
     * Pass { format: 'ansi' } to include ANSI color/style escape codes.
     *
     * @example
     * const text = vtermApp.snapshot()
     * const styled = vtermApp.snapshot({ format: 'ansi' })
     */
    snapshot: (opts?: SnapshotOptions) => string
}

/**
 * Re-export store types for convenience
 */
export type { Store, StoreOptions } from "../core/platform/store/store"
