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

async function ensureHighlighter(): Promise<Highlighter> {
    if (_highlighter) return _highlighter
    if (!_initPromise) {
        const allLangs = [...new Set([...COMMON_LANGS, ..._extraLangs])]
        _initPromise = createHighlighter({
            themes: [_theme],
            langs: allLangs as any,
        }).then(h => {
            _highlighter = h
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
    const key = `${lang}\x00${code}`
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
        const rawLines: ThemedToken[][] = h.codeToTokensBase(code, {
            lang: effectiveLang as any,
            theme: _theme,
        })

        const lines: HighlightedLine[] = rawLines.map(line =>
            line.map(token => ({
                content: token.content,
                color: token.color ?? null,
                // FontStyle bit flags: 1=italic, 2=bold, 4=underline
                bold: !!(token.fontStyle && token.fontStyle & 2),
                italic: !!(token.fontStyle && token.fontStyle & 1),
                underline: !!(token.fontStyle && token.fontStyle & 4),
            }))
        )

        _cache.set(key, lines)
        _pending.delete(key)
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
