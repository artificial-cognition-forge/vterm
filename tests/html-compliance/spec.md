# VTerm HTML Element Compliance Specification

This document is the canonical record of how HTML elements behave in VTerm, what default
(UA) styles they receive, what parent/child relationships are supported, and what is
explicitly out of scope.

Tests in this directory use this spec as their contract. Each section maps to a test file.

---

## Rendering Model

VTerm maps HTML elements to one of two internal node types:

- **Box nodes** — containers with a border box, background fill, and optionally a content
  string rendered inside the padding area. All HTML container and form elements become box
  nodes.
- **Text nodes** (`type: 'text'`) — raw text placed at a computed `(x, y)` coordinate.
  Created when a template expression resolves to a plain string.

Elements with a registered `ElementBehavior` (input, textarea) get their content rendered
by `behavior.render()` instead of the generic box-content path.

### User-Agent (UA) Styles

VTerm applies built-in styles to certain elements regardless of user CSS. These are applied
in `BufferRenderer.getEffectiveStyle()` and can always be overridden by the user.

| Element    | UA `bg`  | UA `fg`  | UA `underline` |
|-----------|---------|---------|---------------|
| `button`  | `blue`  | —       | —             |
| `input`   | `grey`  | —       | —             |
| `textarea`| `grey`  | —       | —             |
| `select`  | `grey`  | —       | —             |
| `a`       | —       | `cyan`  | `true`        |
| All others| —       | —       | —             |

---

## Explicitly NOT Supported (will not be tested)

These HTML features are out of scope for VTerm. Tests that document broken behaviour are
marked `BUG:`.

| Feature                          | Reason / Status                                             |
|----------------------------------|-------------------------------------------------------------|
| `<dialog>`                       | DOM insertion/removal not implemented                       |
| `<hr>`                           | Does not render; no full-row separator character            |
| `<span>` text rendering          | BUG: inline text in span nodes is not rendered              |
| `<code>` syntax highlighting     | Requires shiki integration (planned)                        |
| `<select>` interaction           | No dropdown/overlay mechanism                               |
| `<form>` submission              | No form action or submit semantics                          |
| `<label>` for-association        | No id-based label linkage                                   |
| `<input type="checkbox/radio">`  | Only text input supported                                   |
| `<ol>` auto-numbering            | No automatic list counters                                  |
| `<ul>` bullet points             | No automatic bullet characters                              |
| `<h1>`–`<h6>` UA bold            | No UA bold; user must apply `font-weight: bold`             |
| `<strong>` / `<em>` UA styles    | No UA bold/italic; user must apply styles                   |
| `<a href>` navigation            | href attribute is ignored; no URL navigation                |
| `<pre>` whitespace preservation  | Same rendering as `p`; no tab or multi-space preservation   |

---

## 1. Generic Containers

**Test file:** `01-containers.test.ts`

Elements: `div`, `section`, `article`, `header`, `footer`, `main`, `nav`, `aside`

All of these render identically — as block-level box nodes with no UA styles.

| Behaviour                              | Expected                                             |
|----------------------------------------|------------------------------------------------------|
| No UA bg, fg, or underline             | Cells have null background, null color               |
| `display: block` by default            | Stacks vertically; fills 100% of parent width        |
| Can contain direct text content        | Text child rendered inside content area              |
| Can contain nested block children      | Children positioned at computed x, y                 |
| All semantic aliases are equivalent    | section/article/etc. behave identically to div       |
| Background fills full box region       | When `background` is set, all cells in box have that bg |
| Text + padding                         | Text starts at `(border + padding-left, border + padding-top)` |

---

## 2. Heading Elements

**Test file:** `02-headings.test.ts`

Elements: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`

Headings are block-level elements with text content. VTerm does **not** apply any UA
`bold` style — this must be applied via CSS.

| Behaviour                          | Expected                                              |
|------------------------------------|-------------------------------------------------------|
| Renders text content               | Text chars appear at content-area coordinates         |
| No UA bold                         | `cell.bold` is `false/undefined` without explicit CSS |
| Block layout: fills parent width   | Width = parent content width (unless fixed)           |
| Block layout: stacks vertically    | h1 above h2 stacks with no gap                       |
| Accepts `font-weight: bold`        | When CSS bold applied, `cell.bold` is `true`          |
| h1–h6 all behave identically       | No hierarchy in rendered output without user CSS      |

---

## 3. Paragraph Elements

**Test file:** `03-paragraphs.test.ts`

Elements: `p`, `pre`

| Behaviour                        | Expected                                            |
|----------------------------------|-----------------------------------------------------|
| `p` renders text content         | Text chars at correct coordinates                   |
| `p` has block layout             | Full parent width, stack vertically                 |
| `p` has no UA styles             | Null bg, null fg                                    |
| `pre` renders text content       | Same as `p` in VTerm                               |
| `pre` whitespace                 | NOT SUPPORTED: tabs/multiple spaces not preserved   |
| Multiple `p` elements stack      | Second `p` below first with correct y offset        |

---

## 4. Inline Elements

**Test file:** `04-inline.test.ts`

Elements: `span`, `strong`, `em`

These are nominally inline elements, but VTerm treats all elements as block-level.
The rendering behaviour reflects this reality.

| Element  | Behaviour                      | Expected                                              |
|---------|--------------------------------|-------------------------------------------------------|
| `span`  | Text rendering                 | BUG: inline text may not render correctly             |
| `span`  | Child text node                | Content from child text node should appear            |
| `strong`| No UA bold                     | `cell.bold` is false without explicit CSS             |
| `strong`| `font-weight: bold` applies    | `cell.bold` is true with CSS                          |
| `em`    | No UA italic                   | `cell.italic` is false without explicit CSS           |
| `em`    | `font-style: italic` applies   | `cell.italic` is true with CSS                        |

---

## 5. List Elements

**Test file:** `05-lists.test.ts`

Elements: `ul`, `ol`, `li`

Lists are block containers with no UA bullet or numbering behaviour. List semantics
(markers, counters) are not implemented.

| Behaviour                                  | Expected                                          |
|------------------------------------------|----------------------------------------------------|
| `li` renders text content                 | Text chars at content area                        |
| `ul` > `li` stacks items vertically       | Each li at correct y offset                       |
| `ol` > `li` stacks items vertically       | Same as ul; no automatic numbers                  |
| No bullet characters                      | No `•`, `-`, `*` prepended to li content          |
| No auto-numbers                           | No `1.`, `2.` prepended in ol                     |
| `li` has no UA styles                     | Null bg, null fg                                  |
| `ul`/`ol` have no UA styles               | Null bg, null fg                                  |

---

## 6. Anchor Element

**Test file:** `06-anchor.test.ts`

Element: `a`

| Behaviour                         | Expected                                            |
|-----------------------------------|-----------------------------------------------------|
| UA fg: cyan                       | `cell.color === 'cyan'` on text cells               |
| UA underline: true                | `cell.underline === true` on text cells             |
| Renders text content              | Text chars at correct coordinates                   |
| User `color` overrides UA fg      | When CSS `color: white`, cells have `color: 'white'`|
| User `text-decoration` override   | When CSS `underline: false`, cells have no underline|
| `href` attribute ignored          | No navigation side-effect; attr stored in props only|

---

## 7. Button Element

**Test file:** `07-button.test.ts`

Element: `button`

| Behaviour                             | Expected                                              |
|---------------------------------------|-------------------------------------------------------|
| UA bg: blue                           | `cell.background === 'blue'` for all button cells    |
| Renders text content                  | Text chars appear inside button box                  |
| User `background` overrides UA        | When CSS `background: green`, cells have green bg    |
| User `color` applies                  | When CSS `color: white`, text cells have white fg    |
| `@press` handler invoked on press     | Requires interaction manager; not tested in isolation |
| Can contain nested children           | Child elements render inside button box               |

---

## 8. Input Element

**Test file:** `08-input.test.ts`

Element: `input`

### 8.1 Rendering

| Behaviour                            | Expected                                               |
|--------------------------------------|--------------------------------------------------------|
| UA bg: grey                          | `cell.background === 'grey'` on input cells            |
| Empty value: placeholder renders     | Placeholder text at content x, dim style               |
| Empty value: no placeholder: spaces  | Content area filled with spaces at base style          |
| Value renders inside content area    | Value chars at `(border + padding-left, border + padding-top)` |
| Value longer than width: scrolled    | Last `contentWidth` chars visible; early chars clipped |
| Content area respects padding        | Padding-left shifts value start x                      |
| Content area respects border         | Border adds 1-cell offset on each side                 |

### 8.2 Key Handling

| Key          | Behaviour                                              |
|--------------|--------------------------------------------------------|
| Printable    | Inserts char at cursor, advances cursor                |
| `backspace`  | Removes char before cursor, moves cursor back          |
| `delete`     | Removes char at cursor, cursor stays                   |
| `left`       | Moves cursor left, clamps at 0                         |
| `right`      | Moves cursor right, clamps at end                      |
| `home`       | Moves cursor to 0                                      |
| `end`        | Moves cursor to end of value                           |
| `enter`      | Fires `change` event with current value                |
| Ctrl+key     | No character insertion                                 |

### 8.3 Cursor Position

| Scenario                             | Expected                                               |
|--------------------------------------|--------------------------------------------------------|
| Cursor at pos N                      | Terminal cursor at `(contentX + N, contentY)`          |
| Cursor past viewport (long value)    | Terminal cursor clamped to rightmost visible position  |
| Layout not set                       | Returns null                                           |

---

## 9. Textarea Element

**Test file:** `09-textarea.test.ts`

Element: `textarea`

### 9.1 Rendering

| Behaviour                              | Expected                                             |
|----------------------------------------|------------------------------------------------------|
| UA bg: grey                            | `cell.background === 'grey'` on textarea cells       |
| Single line renders on first row       | Line 0 text at `contentY + 0`                        |
| Multiple lines render on correct rows  | Line N text at `contentY + N`                        |
| Lines wider than contentWidth clipped  | No chars past `contentX + contentWidth`              |
| Content taller than viewport: scrolled | Lines above scrollY are hidden                       |

### 9.2 Key Handling

| Key          | Behaviour                                                       |
|--------------|-----------------------------------------------------------------|
| Printable    | Inserts char at cursor                                          |
| `backspace`  | Removes char before cursor                                      |
| `delete`     | Removes char at cursor                                          |
| `left`/`right` | Moves cursor by one flat offset                              |
| `up`         | Moves cursor to same column on previous line; clamps to 0      |
| `down`       | Moves cursor to same column on next line; clamps to end        |
| `home`       | Moves to start of current line                                  |
| `end`        | Moves to end of current line                                    |
| `enter`      | Inserts `\n` at cursor position                                 |

### 9.3 Cursor Position

| Scenario                             | Expected                                              |
|--------------------------------------|-------------------------------------------------------|
| Cursor on visible line               | Terminal cursor at `(contentX + col, contentY + visibleLine)` |
| Cursor above scroll viewport         | Returns null                                          |
| Cursor below scroll viewport         | Returns null                                          |

---

## 10. Cross-Element Nesting

**Test file:** `10-nesting.test.ts`

Tests that elements work correctly when nested together in common real-world patterns.

| Pattern                                      | Expected                                              |
|----------------------------------------------|-------------------------------------------------------|
| `div > p > text`                             | Text at sum of ancestor offsets                       |
| `section > article > p > text`               | Text at sum of ancestor offsets                       |
| `nav > ul > li > text`                       | Text at sum of ancestor offsets                       |
| `main > div > input`                         | Input at correct position; UA grey bg                 |
| `header > h1` + `main > p`                   | h1 and p at correct y positions below header          |
| `div > button` + `div > input`               | Button above input; correct UA styles on each         |
| Deep nesting (5 levels)                      | Text at correct x, y accounting for all padding/borders |
| Container with border + inner container      | Inner content offset by outer border                  |
| Scrollable div > multiple p elements         | Each p at correct y in content space                  |

---

## Out of Scope for This Suite

| Feature                        | Covered by                                          |
|-------------------------------|-----------------------------------------------------|
| CSS property parsing           | `tests/css-compliance/`                             |
| Layout dimension computation   | `src/core/layout/*.test.ts`                         |
| Buffer rendering (visual cells)| `tests/render-correctness/`                         |
| ANSI output / terminal driver  | `src/runtime/terminal/driver.test.ts`               |
| Frame diffing                  | `src/runtime/terminal/differ.ts` tests              |
| Keyboard routing / focus mgmt  | `src/runtime/renderer/interaction.ts`               |
