import {
    createHighlighter,
    type Highlighter,
    type ThemedToken,
    type BundledTheme,
    type BundledLanguage,
} from "shiki"

export interface HighlightedToken {
    content: string
    color: string | null
    bold: boolean
    italic: boolean
    underline: boolean
}

export type HighlightedLine = HighlightedToken[]

const COMMON_LANGS = [
    "typescript",
    "javascript",
    "tsx",
    "jsx",
    "python",
    "bash",
    "sh",
    "shell",
    "json",
    "jsonc",
    "yaml",
    "toml",
    "css",
    "html",
    "vue",
    "markdown",
    "rust",
    "go",
    "java",
    "c",
    "cpp",
    "ruby",
    "php",
    "sql",
]

let _highlighter: Highlighter | null = null
let _initPromise: Promise<Highlighter> | null = null
let _renderCallback: (() => void) | null = null
let _theme: BundledTheme = "github-dark"
let _extraLangs: BundledLanguage[] = []
let _errorColor: string | null = null

// Cache key includes theme so old entries survive while a new theme loads.
// Format: `${theme}\x00${lang}\x00${code}`
const _cache = new Map<string, HighlightedLine[]>()
const _pending = new Set<string>()

export function setHighlightCallback(fn: () => void): void {
    _renderCallback = fn
}

export function configureHighlighter(config: {
    theme?: BundledTheme
    langs?: BundledLanguage[]
}): void {
    if (config.theme) _theme = config.theme
    if (config.langs) _extraLangs = config.langs
}

/**
 * Switch the active syntax highlight theme at runtime.
 *
 * The theme name is updated immediately so new `getHighlightedLines` calls
 * use the new theme key. Old cache entries (keyed by the previous theme) are
 * left in place — the renderer keeps showing them until the new theme's tokens
 * are ready, avoiding a flash of unhighlighted code.
 *
 * When the new theme finishes loading, the render callback fires and the
 * terminal repaints with the fresh tokens.
 */
export async function setHighlightTheme(theme: BundledTheme): Promise<void> {
    if (theme === _theme) return
    _theme = theme

    if (_highlighter) {
        // Load the new theme into the existing Shiki instance (no re-init).
        try {
            await _highlighter.loadTheme(theme)
            // Re-detect the error token colour for the new theme.
            const errTokens = _highlighter.codeToTokensBase('!@#invalid', { lang: 'json', theme })
            const errColor = errTokens.flat().find(t => t.color)?.color
            _errorColor = errColor ? errColor.toLowerCase() : null
        } catch { /* ignore */ }
    } else {
        // Not yet initialised — ensureHighlighter() will pick up _theme when it runs.
        _initPromise = null
        _errorColor = null
    }

    // Trigger a render so visible code re-requests its tokens under the new
    // theme key. Each cache miss kicks off highlightAsync, which fires the
    // render callback again once tokens are ready.
    _renderCallback?.()
}

/**
 * Returns the currently active highlight theme name.
 */
export function getHighlightTheme(): BundledTheme {
    return _theme
}

async function ensureHighlighter(): Promise<Highlighter> {
    if (_highlighter) return _highlighter
    if (!_initPromise) {
        const allLangs = [...new Set([...COMMON_LANGS, ..._extraLangs])]
        _initPromise = createHighlighter({
            themes: [_theme],
            langs: allLangs as any,
        }).then(h => {
            _highlighter = h
            // Detect the theme's error token color by highlighting intentionally invalid JSON
            try {
                const errTokens = h.codeToTokensBase('!@#invalid', { lang: 'json', theme: _theme })
                const errColor = errTokens.flat().find(t => t.color)?.color
                if (errColor) _errorColor = errColor.toLowerCase()
            } catch { /* ignore */ }
            return h
        })
    }
    return _initPromise
}

/**
 * Returns highlighted lines for code+lang, or null if not ready yet.
 * Starts async highlighting in the background on cache miss.
 */
export function getHighlightedLines(code: string, lang: string): HighlightedLine[] | null {
    const key = `${_theme}\x00${lang}\x00${code}`
    if (_cache.has(key)) return _cache.get(key)!
    if (_pending.has(key)) return null

    _pending.add(key)
    highlightAsync(code, lang, key)
    return null
}

async function highlightAsync(code: string, lang: string, key: string): Promise<void> {
    try {
        const h = await ensureHighlighter()

        // Try to load language if not already loaded
        const loaded = h.getLoadedLanguages()
        if (!loaded.includes(lang as any) && lang !== "text" && lang !== "plain") {
            try {
                await h.loadLanguage(lang as any)
            } catch {
                // Language not found — fall back to plain text
            }
        }

        // Allow common language aliases to map to the actual loaded language.
        // This helps when code blocks use shorthand identifiers like `ts` or `js`
        // which are frequently used in examples but are not always loaded as
        // separate languages in the highlighter dialects.
        const LANG_ALIASES: Record<string, string> = {
            ts: "typescript",
            tsx: "tsx",
            js: "javascript",
            json: "json",
            css: "css",
            html: "html",
            vue: "vue",
            rust: "rust",
            go: "go",
        }
        const aliasLang = (LANG_ALIASES[lang] ?? lang) as string
        const effectiveLang = h.getLoadedLanguages().includes(aliasLang as any) ? aliasLang : "text"
        // Extract the theme from the key so we always tokenize with the theme
        // that was requested — not whatever _theme happens to be now.
        const keyTheme = key.split('\x00')[0] as BundledTheme
        // Load the requested theme on demand if not already loaded.
        if (!h.getLoadedThemes().includes(keyTheme)) {
            try {
                await h.loadTheme(keyTheme)
            } catch { /* ignore */ }
        }
        const rawLines: ThemedToken[][] = h.codeToTokensBase(code, {
            lang: effectiveLang as any,
            theme: keyTheme,
        })

        const lines: HighlightedLine[] = rawLines.map(line =>
            line.map(token => {
                // Strip error-scope colors so invalid tokens during editing don't flash red
                // Only suppress error colors for the active theme — using keyTheme
                // here avoids a race where _errorColor was updated for a different theme.
                const activeErrorColor = keyTheme === _theme ? _errorColor : null
                const color = token.color
                    ? (activeErrorColor && token.color.toLowerCase() === activeErrorColor ? null : token.color)
                    : null
                return {
                    content: token.content,
                    color,
                    // FontStyle bit flags: 1=italic, 2=bold, 4=underline
                    bold: !!(token.fontStyle && token.fontStyle & 2),
                    italic: !!(token.fontStyle && token.fontStyle & 1),
                    underline: !!(token.fontStyle && token.fontStyle & 4),
                }
            })
        )

        _cache.set(key, lines)
        _pending.delete(key)

        // Evict stale-theme entries once the active theme's tokens land.
        // Only do this when we just cached a result for the current theme.
        if (keyTheme === _theme) {
            const activePrefix = `${_theme}\x00`
            for (const k of _cache.keys()) {
                if (!k.startsWith(activePrefix)) _cache.delete(k)
            }
        }

        _renderCallback?.()
    } catch {
        _pending.delete(key)
        // Cache a fallback so we don't retry on every render
        _cache.set(
            key,
            [{ content: code, color: null, bold: false, italic: false, underline: false }].map(
                t => [t]
            )
        )
    }
}
