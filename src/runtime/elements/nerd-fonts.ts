/**
 * Nerd Fonts v3 codepoint map
 *
 * Semantic names → Unicode codepoints for the most commonly used icons.
 * All icons are 1 column wide unless noted otherwise in comments.
 *
 * Full reference: https://www.nerdfonts.com/cheat-sheet
 */

// ─── Powerline / Separators ────────────────────────────────────────────────
const powerline = {
    'nf-pl-left_hard_divider':        '\uE0B0', //
    'nf-pl-left_soft_divider':        '\uE0B1', //
    'nf-pl-right_hard_divider':       '\uE0B2', //
    'nf-pl-right_soft_divider':       '\uE0B3', //
    'nf-pl-left_hard_divider_round':  '\uE0B4', //
    'nf-pl-left_soft_divider_round':  '\uE0B5', //
    'nf-pl-right_hard_divider_round': '\uE0B6', //
    'nf-pl-right_soft_divider_round': '\uE0B7', //
    'nf-pl-branch':                   '\uE0A0', //
    'nf-pl-line_number':              '\uE0A1', //
    'nf-pl-read_only':                '\uE0A2', //
} as const

// ─── Font Awesome (subset) ─────────────────────────────────────────────────
const fa = {
    'nf-fa-home':          '\uF015', //
    'nf-fa-folder':        '\uF07B', //
    'nf-fa-folder_open':   '\uF07C', //
    'nf-fa-file':          '\uF15B', //
    'nf-fa-file_text':     '\uF15C', //
    'nf-fa-search':        '\uF002', //
    'nf-fa-gear':          '\uF013', //
    'nf-fa-cog':           '\uF013', // alias
    'nf-fa-terminal':      '\uF120', //
    'nf-fa-code':          '\uF121', //
    'nf-fa-check':         '\uF00C', //
    'nf-fa-times':         '\uF00D', //
    'nf-fa-close':         '\uF00D', // alias
    'nf-fa-x':             '\uF00D', // alias
    'nf-fa-plus':          '\uF067', //
    'nf-fa-minus':         '\uF068', //
    'nf-fa-ellipsis_h':    '\uF141', //
    'nf-fa-ellipsis_v':    '\uF142', //
    'nf-fa-arrow_left':    '\uF060', //
    'nf-fa-arrow_right':   '\uF061', //
    'nf-fa-arrow_up':      '\uF062', //
    'nf-fa-arrow_down':    '\uF063', //
    'nf-fa-chevron_left':  '\uF053', //
    'nf-fa-chevron_right': '\uF054', //
    'nf-fa-chevron_up':    '\uF077', //
    'nf-fa-chevron_down':  '\uF078', //
    'nf-fa-refresh':       '\uF021', //
    'nf-fa-spinner':       '\uF110', //
    'nf-fa-circle':        '\uF111', //
    'nf-fa-dot_circle':    '\uF192', //
    'nf-fa-star':          '\uF005', //
    'nf-fa-star_o':        '\uF006', //
    'nf-fa-heart':         '\uF004', //
    'nf-fa-warning':       '\uF071', //
    'nf-fa-info_circle':   '\uF05A', //
    'nf-fa-question':      '\uF128', //
    'nf-fa-lock':          '\uF023', //
    'nf-fa-unlock':        '\uF09C', //
    'nf-fa-key':           '\uF084', //
    'nf-fa-user':          '\uF007', //
    'nf-fa-users':         '\uF0C0', //
    'nf-fa-bug':           '\uF188', //
    'nf-fa-bolt':          '\uF0E7', //
    'nf-fa-fire':          '\uF06D', //
    'nf-fa-trash':         '\uF1F8', //
    'nf-fa-pencil':        '\uF040', //
    'nf-fa-edit':          '\uF044', //
    'nf-fa-copy':          '\uF0C5', //
    'nf-fa-paste':         '\uF0EA', //
    'nf-fa-cut':           '\uF0C4', //
    'nf-fa-save':          '\uF0C7', //
    'nf-fa-download':      '\uF019', //
    'nf-fa-upload':        '\uF093', //
    'nf-fa-cloud':         '\uF0C2', //
    'nf-fa-database':      '\uF1C0', //
    'nf-fa-server':        '\uF233', //
    'nf-fa-plug':          '\uF1E6', //
    'nf-fa-link':          '\uF0C1', //
    'nf-fa-globe':         '\uF0AC', //
    'nf-fa-clock':         '\uF017', //
    'nf-fa-calendar':      '\uF073', //
    'nf-fa-tag':           '\uF02B', //
    'nf-fa-tags':          '\uF02C', //
    'nf-fa-bookmark':      '\uF02E', //
    'nf-fa-list':          '\uF03A', //
    'nf-fa-th':            '\uF00A', //
    'nf-fa-bars':          '\uF0C9', //
    'nf-fa-sort':          '\uF0DC', //
    'nf-fa-filter':        '\uF0B0', //
    'nf-fa-expand':        '\uF065', //
    'nf-fa-compress':      '\uF066', //
    'nf-fa-eye':           '\uF06E', //
    'nf-fa-eye_slash':     '\uF070', //
    'nf-fa-play':          '\uF04B', //
    'nf-fa-pause':         '\uF04C', //
    'nf-fa-stop':          '\uF04D', //
    'nf-fa-step_forward':  '\uF051', //
    'nf-fa-step_backward': '\uF048', //
    'nf-fa-volume_up':     '\uF028', //
    'nf-fa-volume_down':   '\uF027', //
    'nf-fa-volume_mute':   '\uF026', //
} as const

// ─── Git / Dev icons ────────────────────────────────────────────────────────
const dev = {
    'nf-dev-git':            '\uE702', //
    'nf-dev-git_branch':     '\uE725', //
    'nf-dev-git_commit':     '\uE729', //
    'nf-dev-git_merge':      '\uE727', //
    'nf-dev-git_pull_request': '\uE728', //
    'nf-dev-github':         '\uE709', //
    'nf-dev-github_badge':   '\uE70A', //
    'nf-dev-gitlab':         '\uF296', //
    'nf-dev-bitbucket':      '\uE703', //
    'nf-dev-vim':            '\uE62B', //
    'nf-dev-neovim':         '\uE736', //
    'nf-dev-terminal':       '\uE795', //
    'nf-dev-nodejs':         '\uE718', //
    'nf-dev-npm':            '\uE71E', //
    'nf-dev-react':          '\uE7BA', //
    'nf-dev-vue':            '\uFD42', //
    'nf-dev-typescript':     '\uE628', //
    'nf-dev-javascript':     '\uE74E', //
    'nf-dev-python':         '\uE73C', //
    'nf-dev-rust':           '\uE7A8', //
    'nf-dev-go':             '\uE724', //
    'nf-dev-docker':         '\uE7B0', //
    'nf-dev-kubernetes':     '\uFD31', //
    'nf-dev-linux':          '\uE712', //
    'nf-dev-apple':          '\uE711', //
    'nf-dev-windows':        '\uE70F', //
} as const

// ─── Octicons (GitHub) ─────────────────────────────────────────────────────
const oct = {
    'nf-oct-git_branch':     '\uE725', //
    'nf-oct-git_commit':     '\uE729', //
    'nf-oct-git_merge':      '\uE727', //
    'nf-oct-pull_request':   '\uE728', //
    'nf-oct-issue_opened':   '\uE7A6', //
    'nf-oct-issue_closed':   '\uE7A7', //
    'nf-oct-check':          '\uF00C', //
    'nf-oct-x':              '\uF00D', //
    'nf-oct-star':           '\uF005', //
    'nf-oct-repo':           '\uE702', //
    'nf-oct-file':           '\uF15B', //
    'nf-oct-file_directory': '\uF115', //
    'nf-oct-terminal':       '\uF120', //
    'nf-oct-search':         '\uF002', //
    'nf-oct-settings':       '\uF013', //
    'nf-oct-bell':           '\uF0F3', //
    'nf-oct-tag':            '\uF02B', //
    'nf-oct-clock':          '\uF017', //
    'nf-oct-alert':          '\uF071', //
    'nf-oct-info':           '\uF05A', //
} as const

// ─── Material Design ────────────────────────────────────────────────────────
// MD icons use 5-digit codepoints (Supplementary PUA) — requires \u{} syntax.
// Note: these are 2-column wide glyphs in most terminals.
const md = {
    'nf-md-folder':          '\u{F024B}', // 󰉋
    'nf-md-folder_open':     '\u{F024D}', // 󰉍
    'nf-md-file':            '\u{F021B}', // 󰈛
    'nf-md-check':           '\u{F012C}', // 󰄬
    'nf-md-close':           '\u{F0156}', // 󰅖
    'nf-md-cog':             '\u{F0493}', // 󰒓
    'nf-md-terminal':        '\u{F0E6E}', // 󰹮
    'nf-md-magnify':         '\u{F0349}', // 󰍉
    'nf-md-bell':            '\u{F009A}', // 󰂚
    'nf-md-alert':           '\u{F0026}', // 󰀦
} as const

// ─── Shorthand aliases ─────────────────────────────────────────────────────
// Common short names for the most frequently used icons
const aliases = {
    'home':        '\uF015',
    'folder':      '\uF07B',
    'folder-open': '\uF07C',
    'file':        '\uF15B',
    'search':      '\uF002',
    'settings':    '\uF013',
    'terminal':    '\uF120',
    'code':        '\uF121',
    'check':       '\uF00C',
    'close':       '\uF00D',
    'x':           '\uF00D',
    'plus':        '\uF067',
    'minus':       '\uF068',
    'edit':        '\uF044',
    'trash':       '\uF1F8',
    'save':        '\uF0C7',
    'copy':        '\uF0C5',
    'download':    '\uF019',
    'upload':      '\uF093',
    'refresh':     '\uF021',
    'spinner':     '\uF110',
    'star':        '\uF005',
    'warning':     '\uF071',
    'error':       '\uF057',
    'info':        '\uF05A',
    'bug':         '\uF188',
    'bolt':        '\uF0E7',
    'lock':        '\uF023',
    'user':        '\uF007',
    'clock':       '\uF017',
    'tag':         '\uF02B',
    'link':        '\uF0C1',
    'globe':       '\uF0AC',
    'cloud':       '\uF0C2',
    'database':    '\uF1C0',
    'server':      '\uF233',
    'plug':        '\uF1E6',
    'play':        '\uF04B',
    'pause':       '\uF04C',
    'stop':        '\uF04D',
    'eye':         '\uF06E',
    'filter':      '\uF0B0',
    'list':        '\uF03A',
    'bars':        '\uF0C9',
    'arrow-left':  '\uF060',
    'arrow-right': '\uF061',
    'arrow-up':    '\uF062',
    'arrow-down':  '\uF063',
    // Git
    'branch':      '\uE0A0',
    'git':         '\uE702',
    'commit':      '\uE729',
    'merge':       '\uE727',
    'pr':          '\uE728',
} as const

/**
 * Full merged icon map: nf-* names + short aliases → Unicode codepoints
 */
export const NERD_FONT_ICONS: Record<string, string> = {
    ...powerline,
    ...fa,
    ...dev,
    ...oct,
    ...md,
    ...aliases,
}

// ─── Font name type ────────────────────────────────────────────────────────

/**
 * All officially patched Nerd Fonts v3 family names.
 * Use one of these as the `ui.nerdfonts` value in vterm.config.ts to get
 * type-safe autocomplete. Unknown strings are also accepted and treated as v3.
 *
 * Fonts marked [v2] ship codepoints that differ from v3 — use `'v2'` for those.
 */
export type NerdFontName =
    // Explicit version strings
    | 'v3'
    | 'v2'
    // ── All patched Nerd Fonts v3 family names ─────────────────────────────
    | '0xProto Nerd Font'
    | '3270 Nerd Font'
    | 'AdwaitaMono Nerd Font'
    | 'Agave Nerd Font'
    | 'AnonymousPro Nerd Font'
    | 'Arimo Nerd Font'
    | 'AtkinsonHyperlegible Nerd Font'
    | 'AurulentSansMono Nerd Font'
    | 'BigBlueTerminal Nerd Font'
    | 'BitstreamVeraSansMono Nerd Font'
    | 'CaskaydiaCove Nerd Font'       // patched CascadiaCode
    | 'CaskaydiaMono Nerd Font'       // patched CascadiaMono
    | 'CodeNewRoman Nerd Font'
    | 'ComicShannsMono Nerd Font'
    | 'CommitMono Nerd Font'
    | 'Cousine Nerd Font'
    | 'D2Coding Nerd Font'
    | 'DaddyTimeMono Nerd Font'
    | 'DepartureMono Nerd Font'
    | 'DejaVuSansMono Nerd Font'
    | 'DroidSansMono Nerd Font'
    | 'EnvyCodeR Nerd Font'
    | 'FantasqueSansMono Nerd Font'
    | 'FiraCode Nerd Font'
    | 'FiraMono Nerd Font'
    | 'GeistMono Nerd Font'
    | 'GoMono Nerd Font'
    | 'Gohu Nerd Font'
    | 'Hack Nerd Font'
    | 'Hasklug Nerd Font'             // patched Hasklig
    | 'HeavyData Nerd Font'
    | 'Hurmit Nerd Font'              // patched Hermit
    | 'iMWritingMono Nerd Font'       // patched iA-Writer
    | 'IBMPlexMono Nerd Font'
    | 'Inconsolata Nerd Font'
    | 'InconsolataGo Nerd Font'
    | 'InconsolataLGC Nerd Font'
    | 'IntelOneMono Nerd Font'
    | 'Iosevka Nerd Font'
    | 'IosevkaTerm Nerd Font'
    | 'IosevkaTermSlab Nerd Font'
    | 'JetBrainsMono Nerd Font'
    | 'Lekton Nerd Font'
    | 'LiberationMono Nerd Font'
    | 'Lilex Nerd Font'
    | 'MartianMono Nerd Font'
    | 'MesloLGM Nerd Font'
    | 'MesloLGL Nerd Font'
    | 'MesloLGS Nerd Font'
    | 'Monaspace Argon Nerd Font'
    | 'Monaspace Krypton Nerd Font'
    | 'Monaspace Neon Nerd Font'
    | 'Monaspace Radon Nerd Font'
    | 'Monaspace Xenon Nerd Font'
    | 'Monofur Nerd Font'
    | 'Monoid Nerd Font'
    | 'Mononoki Nerd Font'
    | 'MPlus Nerd Font'
    | 'Noto Nerd Font'
    | 'OpenDyslexic Nerd Font'
    | 'Overpass Nerd Font'
    | 'ProFont Nerd Font'
    | 'ProggyClean Nerd Font'
    | 'Recursive Mono Nerd Font'
    | 'RobotoMono Nerd Font'
    | 'SauceCodePro Nerd Font'        // patched SourceCodePro
    | 'ShareTechMono Nerd Font'
    | 'SpaceMono Nerd Font'
    | 'Terminess Nerd Font'           // patched Terminus
    | 'Tinos Nerd Font'
    | 'Ubuntu Nerd Font'
    | 'UbuntuMono Nerd Font'
    | 'UbuntuSans Nerd Font'
    | 'VictorMono Nerd Font'
    | 'ZedMono Nerd Font'
    // Allow any string for custom/unknown fonts (treated as v3)
    | (string & {})

/**
 * Resolve a NerdFontName to a codepoint version.
 * All current official fonts use v3 codepoints — v2 must be set explicitly.
 */
export function resolveNerdfontVersion(font: NerdFontName | false): 'v3' | 'v2' | false {
    if (font === false) return false
    if (font === 'v2') return 'v2'
    // 'v3' or any font name string → v3 codepoints
    return 'v3'
}

// ─── Runtime setting ───────────────────────────────────────────────────────

/**
 * Active nerd fonts mode. Set via useTerminal().nerdfonts or vterm.config.ts ui.nerdfonts.
 * Module-level so the icon element renderer can read it without Vue injection.
 */
let _nerdfontsSetting: 'v3' | 'v2' | false = 'v3'

/** Called by the runtime when UIConfig.nerdfonts changes */
export function setNerdfontsSetting(value: NerdFontName | false): void {
    _nerdfontsSetting = resolveNerdfontVersion(value)
}

/**
 * Resolve an icon name to its Unicode codepoint.
 * Returns an empty string when nerdfonts is disabled, or the raw name as
 * fallback when the icon is not found in the map.
 */
export function resolveIcon(name: string): string {
    if (_nerdfontsSetting === false) return name
    return NERD_FONT_ICONS[name] ?? name
}
