# @arcforge/vterm

> **Web-scale DX for terminal apps.** Write real `.vue` files, real CSS, real TypeScript — rendered to the terminal.

```bash
npx @arcforge/vterm init my-app
cd my-app
npx vterm dev
```

---

## Why this exists

Terminal UI has a scaling problem. The existing tools — `blessed`, `ink`, `bubbletea`, raw curses — are great for small apps. But push past ~10 interactive components and you hit a wall: state becomes unmanageable, layout logic leaks everywhere, and every new feature requires coordinating raw cursor positions or imperative DOM mutations by hand. The fundamental issue isn't the libraries — it's that **imperative rendering doesn't scale**.

The web solved this 15 years ago. Reactive component models — React, Vue — exist specifically because coordinating UI state imperatively falls apart at scale. You stop thinking about what pixels to update and start declaring what the UI *should look like* given the current state. The framework handles the rest. That's not a developer-experience nicety. It's the only architecture that makes complex, stateful UIs maintainable beyond a small team.

**Terminal apps need the same thing.** Especially now.

### The agent era

LLM-powered agents are driving a new generation of terminal applications. Tools that stream structured output, render live execution traces, manage multi-step workflows, display tool calls and results in real time, let users intervene mid-run — these are stateful, event-driven, deeply interactive UIs. They're not scripts. They're applications.

Building them with blessed or ink means wiring reactive data flows manually into imperative widget trees. The complexity compounds quickly. State synchronisation becomes the job. Layout becomes a coordinate negotiation. Adding a new panel means touching rendering code that has nothing to do with your feature.

VTerm is a different approach: **bring the web component model to the terminal, fully**. Not as a thin wrapper — as a proper rendering engine with a CSS flexbox layout system, a Vue custom renderer, scoped styles, file-based routing, and first-class reactivity. The same architecture that lets web teams build Figma and Linear in the browser, applied to the terminal.

### Built to power Axon

VTerm was built as the rendering engine for **[Axon](https://axon.hexlabs.co.uk/)** — a fully terminal-native coding agent with its own custom LLM orchestration layer. Axon is a complex, multi-panel, deeply stateful TUI: live agent traces, streaming tool calls, session management, a command palette, multi-mode input, syntax-highlighted output, scrollable conversation history — all in the terminal.

Building that with any existing TUI library was a non-starter. The state management overhead alone would have made iteration prohibitively slow. VTerm was created so the Axon team could write agent UI the same way they'd write a web app: components, reactivity, CSS layout. Ship features without thinking about the renderer.

That constraint — *must scale to a real product* — is why VTerm is architecturally serious. It's not a prototype or an experiment. It runs in production.

---

## The approach

VTerm applies web conventions to the terminal character grid with as little translation as possible:

| Web | VTerm |
|-----|-------|
| HTML elements (`div`, `p`, `button`) | Same elements, rendered as character cells |
| CSS flexbox | Full flexbox algorithm, units in columns/rows |
| Vue 3 SFCs | Compiled and mounted via a custom Vue renderer |
| `<style scoped>` | PostCSS with nesting, scoped to component |
| File-based routing | `app/pages/` scanned automatically |
| `ref`, `computed`, `v-for`, `v-model` | Native Vue 3 reactivity, unmodified |

The pipeline:

```
Vue SFCs → Layout Renderer → Flexbox Engine → Screen Buffer → Frame Differ → ANSI → stdout
```

The layout engine is pure CSS-first: `display: flex`, `width`, `height`, `padding`, `gap`, `justify-content`, `border`, `overflow-y: scroll` — computed the same way a browser would, mapped to character-cell coordinates. Dimensions are in terminal columns and rows instead of pixels. Everything else is standard.

What you get out of the box, with zero configuration:
- Full Vue 3 SFC support — script setup, props, emits, slots, lifecycle hooks
- Scoped CSS with flexbox, box model, pseudo-classes, hex colors
- File-based routing with dynamic segments (`[id].vue`)
- Layout wrappers (`app.vue`) shared across all pages
- Persistent key-value store (JSON or SQLite) via `useStore()`
- Keyboard binding composable with automatic cleanup
- Text selection and clipboard copy
- Syntax highlighting via Shiki
- Hot reload in dev mode
- `vterm deploy` to publish directly to npm

---

## Installation

```bash
bun add @arcforge/vterm     # or npm / pnpm
```

Requires **Bun** as the runtime.

---

## Quick start

**`vterm.config.ts`**
```ts
import { defineVtermConfig } from '@arcforge/vterm'

export default defineVtermConfig({
  entry: './app/index.vue',
  screen: { title: 'My App' },
  quitKeys: ['C-c'],
})
```

**`app/index.vue`**
```vue
<template>
  <div class="container">
    <p class="title">Count: {{ count }}</p>
    <button @press="count++">increment</button>
  </div>
</template>

<script setup lang="ts">
const count = ref(0)
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  padding: 2;
  gap: 1;
}
.title { color: cyan; }
button { background: blue; color: white; width: 12; }
button:hover { background: brightblue; }
</style>
```

```bash
vterm dev
```

---

## CLI

```bash
vterm init [dir]    # scaffold a new project
vterm dev           # start dev server with hot reload
vterm build         # generate .vterm/routes.ts and type declarations
vterm deploy        # publish to npm (requires npm config in vterm.config.ts)
```

Pass `--config path/to/config.ts` to any command to override the default config location.

---

## Project structure

```
my-app/
  vterm.config.ts         # project config
  app/
    app.vue               # optional layout wrapper (renders <RouterView />)
    index.vue             # entry point (when not using pages/)
    pages/                # file-based routing
      index.vue           # → /
      settings.vue        # → /settings
      users/
        [id].vue          # → /users/:id
  .vterm/                 # auto-generated — do not edit
    routes.ts
    auto-imports.d.ts
    tsconfig.json
```

---

## Vue features

All standard Vue 3 reactivity works. `ref` and `computed` are auto-imported — no explicit import needed.

```vue
<script setup lang="ts">
const items = ref<string[]>([])
const count = computed(() => items.value.length)

watch(items, (next) => {
  console.log('items changed:', next)
})
</script>
```

**Supported:**
- `ref`, `reactive`, `computed`, `watch`, `watchEffect`
- `v-model`, `v-for`, `v-if` / `v-else`, `v-show`
- `defineProps`, `defineEmits`, `defineExpose`
- Component imports (including local and cross-file)
- `onMounted`, `onUnmounted`, lifecycle hooks
- `provide` / `inject`

---

## CSS

Scoped CSS with PostCSS. Nesting supported via `postcss-nested`.

```css
.sidebar {
  display: flex;
  flex-direction: column;
  width: 24;
  height: 100%;
  border: 1px solid grey;
  padding: 1;

  .item {
    color: white;
  }

  .item:hover {
    color: cyan;
  }
}
```

### Dimensions

Widths and heights are in **terminal columns/rows** (integers), not pixels.

```css
.panel { width: 40; height: 20; }         /* fixed */
.full  { width: 100%; height: 100%; }     /* relative to parent */
.split { width: calc(100% - 20); }        /* calc() supported */
```

### Colors

Named terminal colors and hex:

```css
color: white;
color: cyan;
color: grey;
color: red;
color: green;
color: yellow;
color: blue;
color: magenta;
color: brightblue;
color: lightgrey;
background: #1e1e2e;
background-color: #2a2a3e;
```

### Flexbox

Full flexbox algorithm — matches browser behavior:

```css
.row {
  display: flex;
  flex-direction: row;          /* row | column | row-reverse | column-reverse */
  justify-content: space-between; /* flex-start | flex-end | center | space-between | space-around | space-evenly */
  align-items: stretch;         /* flex-start | flex-end | center | stretch */
  flex-wrap: wrap;              /* nowrap | wrap | wrap-reverse */
  gap: 2;
  column-gap: 1;
  row-gap: 2;
}

.child {
  flex: 1;                      /* grow + shrink shorthand */
  flex-grow: 1;
  flex-shrink: 0;
  flex-basis: 20;
  align-self: flex-end;
}
```

### Box model

```css
padding: 1 2;                   /* top/bottom left/right */
padding-top: 1;
margin: 1;
border: 1px solid white;        /* renders as box-drawing characters */
border-color: cyan;
overflow: hidden;
overflow-y: scroll;             /* enables scrollable region */
```

### Text & visual

```css
font-weight: bold;
text-decoration: underline;
visibility: hidden;
opacity: 0;                     /* fully transparent */
```

### Pseudo-classes

```css
button:hover  { background: brightblue; }
button:focus  { border: 1px solid white; }
button:active { background: blue; }
```

---

## Composables

All composables must be called inside `<script setup>`.

### `useKeys(keys, handler)`

Bind keyboard shortcuts. Automatically cleaned up on unmount.

```ts
useKeys('enter', () => submit())
useKeys(['left', 'h'], () => moveCursor('left'))
useKeys('S-tab', () => focusPrevious())     // Shift+Tab
useKeys('C-s', () => save())               // Ctrl+S
useKeys('escape', () => closeModal())
```

Key names: `enter`, `escape`, `tab`, `backspace`, `delete`, `up`, `down`, `left`, `right`, `home`, `end`, `pageup`, `pagedown`, `f1`–`f12`. Modifiers: `C-` (ctrl), `S-` (shift).

> Handlers registered via `useKeys` run **before** the focused element receives the keypress. Returning from the handler without consuming the event passes it through to the input. Set `event.consumed = true` to prevent the focused element from seeing the key.

### `useScreen()`

Access terminal dimensions and the raw driver.

```ts
const screen = useScreen()

screen.width   // current terminal width in columns
screen.height  // current terminal height in rows
```

### `useRender()`

Get an immediate render function, bypassing the default throttle. Use for interactions that need instant visual feedback.

```ts
const render = useRender()

// after updating state that needs immediate response:
render()
```

### `useStore(namespace, options?)`

Persistent key-value store backed by JSON or SQLite. `data` is reactive.

```ts
const store = useStore('settings')
const db    = useStore('history', { adapter: 'sqlite' })

// write (auto-persists)
await store.set('theme', 'dark')
await store.set('user.name', 'Alice')   // nested dot-paths

// read
const theme = store.get('theme')        // 'dark'
const name  = store.get('user.name')   // 'Alice'

// reactive template binding
const theme = computed(() => store.data.theme)

// update with function
await store.update('count', (n) => (n ?? 0) + 1)

// check / delete
store.has('theme')          // true
await store.delete('theme')
await store.clear()
```

### `useRouter()` / `useRoute()`

Navigate between pages (requires file-based routing).

```ts
const router = useRouter()
router.push('/settings')
router.push('/users/42')
router.back()

const route = useRoute()
// route.value.path    → '/users/42'
// route.value.params  → { id: '42' }
// route.value.query   → { ... }
```

---

## File-based routing

Pages in `app/pages/` are auto-scanned. Run `vterm build` after adding or removing pages.

| File | Route |
|------|-------|
| `app/pages/index.vue` | `/` |
| `app/pages/settings.vue` | `/settings` |
| `app/pages/users/[id].vue` | `/users/:id` |

Use `app/app.vue` as a layout wrapper with `<RouterView />` to share chrome across all pages:

```vue
<!-- app/app.vue -->
<template>
  <nav class="nav">
    <a href="/">home</a>
    <a href="/settings">settings</a>
  </nav>
  <RouterView />
</template>
```

Set `layout: false` in `vterm.config.ts` to disable the layout wrapper.

---

## HTML elements

All standard block elements render. Use `@press` (not `@click`) for button interactions.

```
div, section, article, header, footer, main, nav, aside
p, h1–h6, ul, ol, li
button, input, textarea
a (with href for router navigation)
```

---

## Config reference

```ts
import { defineVtermConfig } from '@arcforge/vterm'

export default defineVtermConfig({
  // Entry component — ignored when using pages/
  entry: './app/index.vue',

  // Layout wrapper. Set false to disable.
  layout: './app/app.vue',

  // Terminal window title
  screen: { title: 'My App' },

  // Keys that exit the process (default: ['C-c'])
  quitKeys: ['C-c', 'C-q'],

  // Persistent store data directory
  store: {
    dataDir: './data',
  },

  // Syntax highlighting (for <code> elements, powered by Shiki)
  highlight: {
    theme: 'github-dark',
    langs: ['typescript', 'python'],
  },

  // Text selection highlight
  selection: {
    color: '#4a7bc4',
    opacity: 0.4,
  },

  // npm publish config (used by `vterm deploy`)
  npm: {
    name: '@my-scope/my-app',
    registry: 'https://registry.npmjs.org',
    access: 'public',
  },
})
```

---

## Programmatic API

Use `vterm()` directly if you need to integrate with an existing Bun process:

```ts
import { vterm } from '@arcforge/vterm'

const app = await vterm({
  entry: './app/index.vue',
  quitKeys: ['C-c'],
  onMounted(app) {
    console.log('mounted, terminal size:', app.screen.width, '×', app.screen.height)
  },
})

// Later:
app.unmount()
```

---

## Known limitations

- `display: grid` — not implemented
- `margin: auto` — horizontal centering not implemented
- `border-top/right/bottom/left` — individual sides not implemented; use `border` shorthand
- `<span>` — inline text flow not yet implemented
- `z-index` — depth ordering not implemented
- Mouse interaction on scrollbars — not yet implemented

---

## License

MIT
