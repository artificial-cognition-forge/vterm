# VTerm

A terminal UI framework for building TUI apps with Vue SFCs, CSS, and flexbox layout. Runs on Bun. A minimal wrapper that achieves full basic parity with vue sfc html, css and js, working with all vue features such as v-model, reactive refs, computed template bindings and so on. Not full vue parity, but the base features should all be there. Vterm will also provide file based routing offering a number of primitives like useRouter. Vterms supports full features such as text selection and syntax highlighting out of the box. 

Vterm also provides a cli for running the dev server and building the project. We aim to support a deploy method which automates the deployment to npm.

Vterm is currently stabalizing the core set of functionality and tidying up the core logic so it stays maintainable as we iterate. Workers in this project should add suggestion features to the `TODO` section below.

## Overview

VTerm lets you write terminal apps using `.vue` single-file components with scoped CSS. The pipeline is:

```
Vue SFCs → Layout Renderer → Layout Engine → Screen Buffer → Frame Differ → ANSI → stdout
```

Key dependencies: `@vue/compiler-sfc`, `vue`, `postcss`, `sucrase`, `unimport`

## CLI Commands

```bash
vterm init [dir]    # Scaffold a new project
vterm dev           # Start dev server (watches for changes)
vterm build         # Generate .vterm/routes.ts and type declarations
```

Dev server loads `vterm.config.ts` by default. Override with `--config path/to/config.ts`.

## Userland Project Structure

This is what the vterm dev project looks like:

```
my-app/
  vterm.config.ts       # Config file
  app/
    app.vue             # Optional layout wrapper (renders <RouterView />)
    index.vue           # Entry point (if not using file-based routing)
    pages/              # File-based routing (auto-scanned)
      index.vue         # → /
      settings.vue      # → /settings
  .vterm/               # Auto-generated (do not edit)
    routes.ts           # Generated route manifest
    auto-imports.d.ts   # Auto-import type declarations
    tsconfig.json
```

## Docs App (`apps/docs/`)

A built-in VTerm application that serves as both the official documentation and a real-world CSS/HTML compliance testbed. It deliberately mirrors the style and structure of MDN Web Docs — a nav bar at the top, a categorized sidebar on the left (HTML, CSS, Vue, VTerm sections), and a scrollable content area on the right.

**Purpose (dual):**
1. Ship developer docs as a TUI users can run locally via `vterm dev` inside `apps/docs/`
2. Expose CSS edge cases early — every element page renders live examples, which makes rendering bugs obvious

**Layout:** `Navigation` (top bar, cyan border-bottom) → `Sidebar` (20-col, categorized nav links) → `content` (page slot, scrollable)

**Key files:**
- `apps/docs/vterm.config.ts` — config (title: "Mdn", quit: C-c)
- `apps/docs/app/layout/default.vue` — shared chrome (nav + sidebar + content slot)
- `apps/docs/app/components/sidebar.vue` — sidebar nav, driven by `useSidebar()`
- `apps/docs/app/components/navigation.vue` — top bar
- `apps/docs/app/composables/useSidebar.ts` — sidebar page state
- `apps/docs/app/pages/` — one page per element/feature (e.g. `tag-div.vue`, `tag-a.vue`, `tag-input.vue`)

**Page structure (each element page):** `<Header>` (element name + support badge) → Attributes section → split Example/Rendered section

**Adding new element coverage:** create `apps/docs/app/pages/tag-<name>.vue`, add a link entry in `sidebar.vue`'s `sidebarHtml` ref, then run `vterm build` inside `apps/docs/` to regenerate routes.

## Vterm Structure
```tree
├── CLAUDE.md
├── examples // various premade examples
│   ├── box-model
│   │   ├── app
│   │   │   └── index.vue
│   │   └── vterm.config.ts
│   ├── chat
│   │   ├── app
│   │   │   └── index.vue
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vterm.config.ts
│   ├── minimal
│   │   ├── app
│   │   │   └── index.vue
│   │   ├── tsconfig.json
│   │   └── vterm.config.ts
│   ├── pages
│   │   ├── app
│   │   │   ├── index.vue
│   │   │   └── pages
│   │   │       ├── hello.vue
│   │   │       ├── index.vue
│   │   │       └── world.vue
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── vterm.config.ts
│   ├── row
│   │   ├── app
│   │   │   └── index.vue
│   │   ├── test-debug.ts
│   │   └── vterm.config.ts
│   └── tall
│       ├── app
│       │   └── index.vue
│       ├── package.json
│       ├── tsconfig.json
│       └── vterm.config.ts
├── package.json
├── src // core logic
│   ├── build // setup phase
│   │   ├── auto-imports.ts
│   │   ├── config.ts
│   │   ├── exports.ts
│   │   ├── init.ts
│   │   ├── prepare.ts
│   │   ├── routes.ts
│   │   └── server.ts
│   ├── build.ts
│   ├── core // core rendering pipeline
│   │   ├── compiler
│   │   │   └── sfc-loader.ts
│   │   ├── css
│   │   │   ├── color-parser.ts
│   │   │   ├── declaration-transformer.ts
│   │   │   ├── exports.ts
│   │   │   ├── index.ts
│   │   │   ├── transformer.test.ts
│   │   │   ├── transformer.ts
│   │   │   └── types.ts
│   │   ├── layout
│   │   │   ├── box-model.test.ts
│   │   │   ├── box-model.ts
│   │   │   ├── flexbox.test.ts
│   │   │   ├── flexbox.ts
│   │   │   ├── index.test.ts
│   │   │   ├── index.ts
│   │   │   ├── README.md
│   │   │   ├── tree.test.ts
│   │   │   ├── tree.ts
│   │   │   ├── types.ts
│   │   │   ├── utils.test.ts
│   │   │   └── utils.ts
│   │   ├── platform
│   │   │   ├── composables
│   │   │   │   ├── exports.ts
│   │   │   │   ├── useFocus.ts
│   │   │   │   ├── useKeys.ts
│   │   │   │   ├── useScreen.ts
│   │   │   │   └── useTerminal.ts
│   │   │   ├── exports.ts
│   │   │   ├── pages
│   │   │   │   ├── 404.vue
│   │   │   │   ├── error.vue
│   │   │   │   └── index.vue
│   │   │   └── store
│   │   │       ├── exports.ts
│   │   │       ├── store-adapters.ts
│   │   │       └── store.ts
│   │   ├── router
│   │   │   ├── components.ts
│   │   │   ├── composables.ts
│   │   │   ├── index.ts
│   │   │   ├── matcher.ts
│   │   │   ├── router.test.ts
│   │   │   ├── router.ts
│   │   │   └── types.ts
│   │   └── vterm.ts
│   ├── dev.ts
│   ├── exports.ts
│   ├── index.ts
│   ├── init.ts
│   ├── runtime
│   │   ├── elements
│   │   │   ├── index.ts
│   │   │   ├── input.test.ts
│   │   │   ├── input.ts
│   │   │   ├── registry.ts
│   │   │   ├── textarea.test.ts
│   │   │   ├── textarea.ts
│   │   │   └── types.ts
│   │   ├── index.ts
│   │   ├── renderer
│   │   │   ├── buffer-renderer.ts
│   │   │   ├── index.ts
│   │   │   ├── interaction.ts
│   │   │   ├── layout-renderer.ts
│   │   │   ├── selection.test.ts
│   │   │   └── selection.ts
│   │   └── terminal
│   │       ├── ansi.ts
│   │       ├── buffer.ts
│   │       ├── differ.ts
│   │       ├── driver.test.ts
│   │       ├── driver.ts
│   │       ├── index.ts
│   │       ├── input.test.ts
│   │       └── input.ts
│   └── types
│       └── types.ts
└── tsconfig.json
```

## Config (`vterm.config.ts`)

```ts
import { defineVtermConfig } from '@arcforge/vterm'

export default defineVtermConfig({
  entry: './app/index.vue',        // Entry component (ignored if using pages/)
  layout: './app/app.vue',         // Layout wrapper (false to disable)
  screen: { title: 'My App' },     // Terminal screen options (default title: 'VTerm')
  quitKeys: ['C-c'],               // Keys that exit the app (default: ['C-c'])
  store: {
    dataDir: './data',             // Override store data directory
  },
  highlight: {
    theme: 'dark-plus',            // Syntax highlighting theme (default: 'dark-plus')
  },
  ui: {
    scrollbar: {
      thumb: '█',                  // Scrollbar thumb character (default: '█')
      track: '│',                  // Scrollbar track character (default: '│')
    },
    cursor: {
      shape: 'block',              // Cursor shape: 'block', 'line', 'underline' (default: 'block')
      blink: true,                 // Whether cursor blinks (default: true)
    },
  },
})
```

## Writing Components

Components are standard Vue 3 SFCs. `ref` and `computed` are auto-imported — no explicit import needed.


```vue
<template>
  // native html/css support is critical
  <div class="container">
    // native vue bindings are critical
    <p class="title">Count: {{ count }}</p>
    <button @press="increment">Click me</button>
  </div>
</template>

<script setup lang="ts">
const count = ref(0)
const increment = () => count.value++
</script>

<style scoped>
// native css!
.container {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
}

.title { color: cyan; }
button { background: blue; color: white; }
button:hover { background: brightblue; }
button:focus { border: 1px solid white; }
</style>
```

### Event Handling

Use `@press` for button/interactive element clicks (not `@click`). Keyboard events via `useKeys`.

## Composables

All composables must be called inside a component `<script setup>` context.

### `useKeys(keys, handler)`

Bind keyboard shortcuts. Automatically unregistered on component unmount.

```ts
useKeys('enter', () => submit())
useKeys(['left', 'h'], () => moveCursor('left'))
useKeys('S-tab', () => focusPrevious())   // Shift+Tab
useKeys('C-c', () => quit())              // Ctrl+C
```

### `useScreen()`

Access the terminal driver for screen dimensions and manual control.

```ts
const screen = useScreen()
const width = screen.width
const height = screen.height
screen.key(['escape'], () => process.exit(0))
```

### `useTerminal()`

Access reactive terminal state (width and height). Use this in templates for responsive layouts.

```ts
const terminal = useTerminal()
// Reactive computed properties safe to use in templates
console.log(terminal.width)   // Computed ref (reactive)
console.log(terminal.height)  // Computed ref (reactive)

// In template:
// <p>Terminal is {{ terminal.width }} x {{ terminal.height }}</p>
```

### `useRender()`

Get the immediate render function (bypasses throttling). Use for interactive elements needing instant feedback.

```ts
const render = useRender()
// After updating state that needs immediate visual response:
render()
```

### `useStore(namespace, options?)`

Persistent key-value store backed by JSON or SQLite. Reactive `data` property for use in templates.

```ts
const store = useStore('my-app')           // JSON (default)
const store = useStore('db', { adapter: 'sqlite' })

await store.set('theme', 'dark')
await store.set('user.name', 'Alice')      // Nested paths supported
const theme = store.get('theme')
const name = store.get('user.name')

// Reactive access in templates
const theme = computed(() => store.data.theme)
```

### `useRouter()` / `useRoute()`

Navigate between pages (requires file-based routing setup).

```ts
const router = useRouter()
router.push('/settings')
router.back()

const route = useRoute()
// route.value.path, route.value.params, route.value.query
```

> **Note**: `useFocus()` is stubbed and not yet implemented. Tab-based focus navigation is planned.

## CSS Support

Scoped CSS with PostCSS (supports nesting via `postcss-nested`).

**Colors:** Named (`blue`, `cyan`, `yellow`, `white`, `red`, `green`, `brightblue`, `lightgrey`, etc.) and hex (`#rrggbb`).

**Pseudo-selectors:** `:hover`, `:focus`, `:active`

**Percentages:** `width: 50%`, `height: 100%` — relative to parent container.

**`calc()`:** `calc(100% - 2)` — resolved at layout time against parent container size.

### CSS Property Support Matrix

## Routing

File-based routing scans `app/pages/`. Run `vterm build` after adding/removing pages to regenerate `.vterm/routes.ts`.

Route naming follows the file path:
- `app/pages/index.vue` → `/`
- `app/pages/settings.vue` → `/settings`
- `app/pages/users/[id].vue` → `/users/:id`

Use `app/app.vue` as a layout wrapper with `<RouterView />` to share chrome across pages.

## Rendering Pipeline

```
.vue file
  → sfc-loader        compile SFC into Vue VNodes
  → layout-renderer   Vue VNode tree → LayoutNode tree (custom Vue renderer)
  → tree.ts           resolve CSS, build LayoutNode structure
  → rendering-pass    paint LayoutNodes to ScreenBuffer (two passes: background then text)
  → differ            diff previous/current ScreenBuffer → minimal ANSI sequences
  → driver            write ANSI to stdout
```

- Layout engine is platform-agnostic and fully unit testable
- Render is throttled by `renderInterval` (default 100ms); bypass with `useRender()`
- Terminal resizes trigger automatic reflow

## Pipeline Navigation

Where each stage lives. When a bug appears, start here:

```
src/
├── core/
│   ├── compiler/
│   │   └── sfc-loader.ts              Compile .vue files into VNodes
│   ├── css/
│   │   ├── transformer.ts             CSS string → LayoutProperties + VisualStyle
│   │   └── declaration-transformer.ts Per-property parsing (colors, flex, border…)
│   ├── layout/
│   │   ├── types.ts                 ★ Central types: LayoutNode, VisualStyle, LayoutProperties
│   │   ├── tree.ts                    VNode tree → LayoutNode tree (CSS resolved here)
│   │   ├── flexbox.ts                 Flex layout algorithm
│   │   ├── box-model.ts               Padding / margin / border computation
│   │   └── stacking-context.ts        Z-index render ordering
│   └── vterm.ts                       Runtime entry — wires the render loop together
│
└── runtime/
    ├── renderer/
    │   ├── layout-renderer.ts         Custom Vue renderer → LayoutNodes
    │   ├── rendering-pass.ts        ★ Two-pass paint: LayoutNodes → ScreenBuffer
    │   ├── buffer-renderer.ts         Public API that drives RenderingPass
    │   └── interaction.ts             Hit testing, focus, scroll, click/anchor routing
    ├── elements/
    │   ├── registry.ts                Element behavior registry (lookup by tag name)
    │   ├── input.ts                   <input> rendering + key handling
    │   ├── textarea.ts                <textarea> rendering + key handling
    │   ├── anchor.ts                  <a> keyboard navigation + external URL opening
    │   └── code.ts                    <code> syntax highlighting
    └── terminal/
        ├── buffer.ts                  ScreenBuffer — character grid with per-cell styles
        ├── differ.ts                  Diff two buffers → minimal ANSI escape sequences
        ├── driver.ts                  Write ANSI to stdout, handle terminal input
        └── input.ts                   Parse raw terminal key and mouse sequences
```

`★` = most relevant when debugging rendering or style behaviour.

### Test Locations

```
src/core/css/transformer.test.ts       CSS property parsing (unit)
src/core/layout/*.test.ts              Layout engine: flex, box model, tree (unit)
src/runtime/renderer/buffer-renderer.test.ts  Visual output correctness (unit)

tests/
├── css-compliance/    End-to-end CSS property coverage  (read spec.md first)
├── html-compliance/   Element UA styles and behaviour    (read spec.md first)
├── render-correctness/ Visual output scenarios           (read spec.md first)
└── performance/       Pipeline regression benchmarks
```

## Working in this Codebase

### Bug Fix Workflow

1. **Research first** — read the relevant source and tests before touching anything. Understand which pipeline stage is involved and why the behaviour is wrong.
2. **Write failing tests** — add tests to the appropriate compliance or unit suite that express correct behaviour. Run them and confirm they fail for the right reason.
3. **Fix the root cause** — make the tests pass. Never patch around a symptom.
4. **Run the full suite** — `bun test` must show the same pre-existing failure count. Zero new regressions.

### Code Quality Standards

**No dead code.** If a function, method, import, or constant is unreachable from any live path, remove it in the same pass as your fix. Private methods with no callers, imports that aren't used, and superseded implementations all qualify. The codebase is small enough that dead code is always a liability.

**Raise maintainability issues proactively.** When you identify a shadow implementation, a duplicate rendering path, a leaking abstraction, or a pattern that will silently break for a class of inputs — say so clearly in your report, before or after the fix. The goal is a pipeline that stays comprehensible as it grows, not just one that passes tests today.

**The rendering pipeline is the product.** Hold `src/runtime/renderer/` and `src/core/layout/` to a higher standard than CLI or build code. Confusion or duplication in those files has direct user-facing consequences.

## Testing

Run all tests:
```bash
bun test
```

Run a specific layer:
```bash
bun test src/core/css/          # CSS transformer tests
bun test src/core/layout/       # Layout engine tests
bun test src/runtime/renderer/  # Buffer renderer tests
```

### CSS Testing Strategy — Three Layers

The CSS pipeline has three independently testable layers. Each layer has its own test file and concern:

**Layer 1 — CSS Transformer** (`src/core/css/transformer.test.ts`)
- Input: CSS string
- Output: `LayoutProperties` object
- Tests: All property parsing, shorthand expansion, pseudo-classes, nested selectors
- Status: ✓ Good coverage (~40 tests)

**Layer 2 — Layout Engine** (`src/core/layout/`)
- Input: `LayoutNode` tree with `layoutProps`
- Output: Computed `x, y, width, height` for each node
- Tests: `flexbox.test.ts`, `box-model.test.ts`, `index.test.ts`, `tree.test.ts`
- Status: ✓ Core covered; gaps in display:block stacking, nested 3+ levels, margin:auto
- New needed: `layout-scenarios.test.ts` for complex real-world layout cases

**Layer 3 — Buffer Renderer** (`src/runtime/renderer/buffer-renderer.test.ts`)
- Input: `LayoutNode` tree with computed layout
- Output: `ScreenBuffer` — character grid with colors
- Tests: Text placement at exact coordinates, colors, borders, clipping, scroll
- Status: ✗ **No tests exist** — highest priority gap
- Pattern: create `ScreenBuffer`, create `BufferRenderer`, run `render()`, assert `buffer.getCell(x, y)`

The buffer renderer tests are the "truth tests" — they prove what actually appears on screen and catch renderer bugs that layout tests miss entirely (e.g., text-align not being applied).

## Key Files

- `src/core/vterm.ts` — Main `vterm()` runtime function
- `src/index.ts` — CLI entry point (`vterm` binary)
- `src/build/config.ts` — Config loader
- `src/build/routes.ts` — Route manifest generator
- `src/core/layout/` — Layout engine (flexbox, box model, tree)
- `src/core/css/` — CSS transformer (PostCSS → terminal styles)
- `src/core/compiler/sfc-loader.ts` — Vue SFC compiler
- `src/runtime/terminal/driver.ts` — Terminal I/O driver
- `src/runtime/terminal/differ.ts` — Frame differ
- `src/core/platform/composables/` — `useKeys`, `useScreen`, `useRender`
- `src/core/platform/store/store.ts` — `useStore` + `createStore`
- `src/core/router/` — Router + `useRouter`/`useRoute`
- `src/types/types.ts` — `VTermConfig`, `VTermOptions`, `VTermApp` types

# Vterm Features

**Vterm**
[x] - File based routing like nuxt
[x] - auto imports
[x] - dev server
[x] - build pipeline
[x] - hot reload on file change
[ ] - npm deployment config in `vterm.config.ts`.

**Vue Parity**
[x] - Full SFC rendering
[x] - Component Support
[x] - Full Component Props
[x] - Ref, reactive, computed, watch support
[x] - Template bindings
[x] - v-for, v-if, v-else supported
[x] - v-model support

**HTML Parity**
[x] - <div />
[x] - <p />
[x] - <h1 />
[x] - <h2 />
[x] - <h3 />
[x] - <h4 />
[x] - <h5 />
[x] - <h6 />
[x] - <button />
[x] - <section />
[x] - <article />
[x] - <header />
[x] - <footer />
[x] - <body />
[x] - <main />
[x] - <html />
[x] - <nav />
[x] - <ul />
[x] - <ol />
[x] - <li />
[ ] - <dialog /> // dialog support not working. We will need to be able to add and remove dialog from the dom.
[ ] - <icon name="git" /> // this will be a vterm compnoent that renders nerdfont icon

[ ] - <hr /> // doesnt render anything. This should be afull row of dashes.
      <hr>-</hr> should render a full row using the content within hr.

[ ] - <span /> // doesnt render text
[ ] - <input /> // mostly working
[ ] - <textarea /> // mostly working
[ ] - <a /> // needs full testing and default css behaviour
[ ] - <code /> // awaiting native shiki support
