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
│   │   │   │   └── useScreen.ts
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
1. Layout Renderer  — Vue component tree → LayoutNodes (via custom Vue renderer)
2. Layout Engine    — Compute positions/dimensions (flexbox, box model)
3. Buffer Renderer  — LayoutNodes → ScreenBuffer (character grid)
4. Frame Differ     — Diff previous/current buffer → minimal ANSI codes
5. Terminal Driver  — Write ANSI escape codes to stdout
```

- Layout engine is platform-agnostic and fully unit testable
- Render is throttled by `renderInterval` (default 100ms); bypass with `useRender()`
- Terminal resizes trigger automatic reflow

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

# TODO

> Claude may add sections to this project TODO for things that remove technical debt or add structure to the project. No features only engineering insights that take place while working. They may be removed or accepted by the user.

## Test Suite Iteration Guide

The test suite is organized in three layers. Work through them in order — lower layers (CSS transformer) should be near-perfect before tuning higher ones (buffer renderer).

### Test files and their scope

| File | Layer | What it tests |
|---|---|---|
| `src/core/css/transformer.test.ts` | 1 — Parser | CSS string → `LayoutProperties`. All property parsing. |
| `src/core/css/css-pipeline.test.ts` | 1+2+3 — Full pipeline | CSS string → rendered `ScreenBuffer`. Highest signal. |
| `src/core/layout/flexbox.test.ts` | 2 — Layout | Flex algorithm: grow, shrink, wrap, alignment. |
| `src/core/layout/box-model.test.ts` | 2 — Layout | Padding, margin, border math. |
| `src/core/layout/nested-layout.test.ts` | 2 — Layout | Nested structures, real-world patterns, known bugs. |
| `src/core/layout/index.test.ts` | 2 — Layout | Full layout engine integration from VNodes. |
| `src/runtime/renderer/buffer-renderer.test.ts` | 3 — Renderer | LayoutNode tree → ScreenBuffer cell assertions. |

### How to add new tests

1. **Pick the right file** — if you're testing a CSS property end-to-end, use `css-pipeline.test.ts`. If testing a layout algorithm detail, use `nested-layout.test.ts`. If testing rendering output, use `buffer-renderer.test.ts`.

2. **Test behavior, not implementation** — assert what appears at `buffer.getCell(x, y)` or what `node.layout.x/y/width/height` computes to. Never reach into internal state.

3. **Mark bugs explicitly** — if a test documents a known bug, prefix the describe/test name with `BUG:` and add a comment explaining the root cause and where to fix it. This makes the failing tests useful rather than just red.

4. **Run a single file while working**: `bun test src/core/css/css-pipeline.test.ts`

5. **Full suite before committing**: `bun test` — 538 tests, all passing as of the flex auto-height fix.

# Task 001 = [ ] Initiate the css compliance strategy

We want to make a css compliance test suite. This is a layer that will ensure all
supported features are tested thouroughly.

First we will document which features are supported in, we will need to redesign the spec.md from the ground up to be our record of where were at, what we support and so on: /home/cody/git/arclabs/libs/vterm/tests/css-compliance/spec.md
We will aim to support most basic css features that carry over directly to terminal rendering. Ofcourse some do not carry nicely, such as font size. But we will aim to support all main position types, display, color and background and anything like that. Most of the basic css spec. In the spec.md we will give each item space to describe what exactly were supporting. For example under color we could say we support any hex hsl or rgb for example. Then we know for each item what exactly is supported and what is not. We need to define a clear seperation between what were aiming to support and what we dont.

Then we will go through each supported feature and give it its own test file. At first we will just make a list of all test files, then fill them with content after all compliance test files are in place. Treat this first task as primarily a setup phase for the css compliance test suite. We need to find a clean strategy that will ensure this covers all edge cases. Small gaps in coverage could be pretty harsh bugs so testing is our main tool with this project.

There are already layout and css tests in place this new suite will serve to superseed them. We will work as if they dont exist so we get the full suite redesigned from top to bottom. This ensures we are free to choose the most robust approach to this complaince suite.

> Before beginning, report to the user your understanding of the task. A high level overview of how you decide to approach this css pipeline robustness challenge. How you propose to solve this challenge robustly.Layout your proposed strategy for testing the css/layout pipeline and how you will manage to catch most edge cases.

# Task 002 = [ ] Catch all errors

Vterm should catch all errors and display them within the screen rather than the screen crashing. We need to implment some tests that enforce this behaviour and add a primitive component for displaying the error on the screen. Currently it throws the error and disappears when i move my mouse because it rerenders or blocks all keyboard input controls, breaking the app. 

