# VTerm CSS Compliance Specification

This document is the canonical record of what CSS is supported in VTerm, what it maps to in
terminal rendering, and what is explicitly out of scope. Test files in this directory use this
spec as their contract.

## Rendering Model

VTerm renders to a **character grid** (a 2D array of cells). Each cell has:

- `char` — a single unicode character
- `color` — foreground color (CSS: `color`)
- `background` — background color (CSS: `background-color`)
- `bold` — boolean
- `underline` — boolean
- `italic` — boolean (limited terminal support)
- `inverse` — boolean (swap fg/bg)
- `dim` — boolean

Key differences from the browser DOM:

- **No sub-character resolution** — everything is measured in character cells, not pixels.
  `1px` == `1 cell`. `px`/`em`/`rem` units are stripped and treated as raw cell counts.
- **No font sizing** — terminals use a monospace font at a fixed size.
- **No sub-pixel rendering, anti-aliasing, or blending.**
- **No compositing or z-index stacking** (last-painted wins).

---

## 1. Color

**Test file:** `01-color.test.ts`

> TODO: Add full support for opacity. Currently rgba opacity is ignored completely, and likely other formats. We should be able to get full css color parity with all css color inputs. The goal is to support all css color names and input types top to bottom.


### 1.1 Foreground color (`color`)

Sets the `color` field on rendered cells.

| Value type       | Support | Notes                                                      |
|-----------------|---------|-------------------------------------------------------------|
| Terminal names   | ✅      | `black red green yellow blue magenta cyan white gray grey`  |
| Bright variants  | ✅      | `brightblack brightred brightgreen brightyellow` etc        |
| Hex `#RRGGBB`    | ✅      | Passed through as-is                                        |
| Hex `#RGB`       | ✅      | Expanded to `#RRGGBB`                                       |
| Hex `#RRGGBBAA`  | ✅      | Alpha stripped → `#RRGGBB`                                  |
| `rgb(r, g, b)`   | ✅      | Converted to hex                                            |
| `rgba(r,g,b,a)`  | ✅      | Alpha ignored, converted to hex                             |
| `hsl(h, s%, l%)` | ✅      | Converted to hex via hslToRgb                               |
| CSS named colors | ✅      | Full CSS3 list (aliceblue … yellowgreen), converted to hex  |
| 256-color index  | ✅      | Integer 0-255, passed through as string                     |
| `transparent`    | ❌      | Not supported                                               |
| `currentColor`   | ❌      | Not supported                                               |
| `inherit`        | ❌      | Not supported                                               |

### 1.2 Background color (`background-color`, `background`)

Sets the `background` field on rendered cells. Same value support as foreground color.

The `background` shorthand only supports color values — not `background-image`, gradients, etc.

Background cells are filled across the entire element bounds when a `bg` color is set.

### Out of scope

- Gradients (`linear-gradient`, `radial-gradient`, etc.)
- `background-image`
- `background-repeat`, `background-size`, `background-position`

---

## 2. Dimensions

**Test file:** `02-dimensions.test.ts`

### 2.1 `width` / `height`

Sets the computed width/height of a node in character cells.

| Value      | Support | Notes                                                          |
|-----------|---------|----------------------------------------------------------------|
| Integer    | ✅      | `width: 20` → 20 cells wide                                   |
| `px` unit  | ✅      | `20px` → 20 cells (unit stripped)                             |
| `em`/`rem` | ✅      | Treated as raw cell count (unit stripped; no font-size basis) |
| `%`        | ✅      | Relative to parent container width or height                  |
| `calc()`   | ✅      | `calc(100% - 2)` resolved at layout time                      |
| `shrink`   | ✅      | Size to content (vterm-specific keyword)                      |
| `auto`     | ❌      | Not supported                                                  |

### 2.2 `min-width` / `min-height`

Lower bound for computed dimensions. Integer values only. Percentages not supported.

### 2.3 `max-width` / `max-height`

Upper bound for computed dimensions. Integer values only.

---

## 3. Padding

**Test file:** `03-padding.test.ts`

Padding adds space between the border and content. Measured in character cells.

| Property         | Support |
|-----------------|---------|
| `padding`        | ✅      |
| `padding-top`    | ✅      |
| `padding-right`  | ✅      |
| `padding-bottom` | ✅      |
| `padding-left`   | ✅      |

**Shorthand expansion:**

- `padding: 2` → all four sides = 2
- `padding: 2 4` → top/bottom=2, left/right=4
- `padding: 1 2 3 4` → top=1, right=2, bottom=3, left=4
- `padding: 1 2 3` → 3-value shorthand is **not supported** (parsed as single value)

---

## 4. Margin

**Test file:** `04-margin.test.ts`

Margin adds space outside the border. Measured in character cells.

| Property        | Support | Notes                                           |
|----------------|---------|--------------------------------------------------|
| `margin`        | ✅      | Shorthand: 1 / 2 / 4 values                     |
| `margin-top`    | ✅      |                                                 |
| `margin-right`  | ✅      |                                                 |
| `margin-bottom` | ✅      |                                                 |
| `margin-left`   | ✅      |                                                 |
| `margin: auto`  | ⚠️      | Sets `marginAuto` flag; no layout centering effect |

**Shorthand:** Same rules as padding.

---

## 5. Border

**Test file:** `05-border.test.ts`

Borders are rendered with unicode box-drawing characters. A border consumes 1 cell on each side
(total: 2 columns and 2 rows of overhead).

### 5.1 Border types

| Type     | Corner / line chars    | CSS trigger                             |
|---------|------------------------|-----------------------------------------|
| `line`   | `┌─┐│└┘`              | `border-style: solid` or `border: 1px solid` |
| `heavy`  | `┏━┓┃┗┛`              | `border-style: heavy` (vterm-specific)  |
| `double` | `╔═╗║╚╝`              | `border-style: double`                  |
| `ascii`  | `+-+|`                | `border-style: ascii` (vterm-specific)  |

### 5.2 Properties

| Property        | Support | Notes                                           |
|----------------|---------|--------------------------------------------------|
| `border`        | ✅      | Shorthand: `1px solid blue`, `1 line white`      |
| `border-style`  | ✅      | `solid`→`line`, `double`, `none`                |
| `border-color`  | ✅      | Sets border fg color                            |
| `border-width`  | ✅      | `0` = no border, `1` = one-cell border           |

### Out of scope

- `border-radius` — cannot render curves in character grid
- Per-side borders (`border-top`, `border-left`, etc.) — not implemented
- `border-image` — not applicable

---

## 6. Display

**Test file:** `06-display.test.ts`

| Value     | Support | Notes                                                      |
|----------|---------|-------------------------------------------------------------|
| `flex`    | ✅      | Full flexbox layout engine                                  |
| `block`   | ✅      | Stacks vertically, full parent width                        |
| `none`    | ✅      | Node and all children are not rendered; take no space       |
| `inline`  | ⚠️      | Parsed; minimal layout effect (treated like block in most cases) |

---

## 7. Flexbox — Container

**Test file:** `07-flexbox-container.test.ts`

Properties that apply to a flex container (`display: flex`).

### 7.1 `flex-direction`

| Value             | Support |
|------------------|---------|
| `row`             | ✅      |
| `column`          | ✅      |
| `row-reverse`     | ✅      |
| `column-reverse`  | ✅      |

### 7.2 `justify-content` (main axis)

| Value           | Support |
|----------------|---------|
| `flex-start`   | ✅      |
| `flex-end`     | ✅      |
| `center`       | ✅      |
| `space-between`| ✅      |
| `space-around` | ✅      |
| `space-evenly` | ✅      |

### 7.3 `align-items` (cross axis, all items)

| Value        | Support | Notes               |
|-------------|---------|----------------------|
| `flex-start` | ✅      |                     |
| `flex-end`   | ✅      |                     |
| `center`     | ✅      |                     |
| `stretch`    | ✅      | Default behavior    |
| `baseline`   | ⚠️      | Treated like flex-start |

### 7.4 `flex-wrap`

| Value          | Support |
|---------------|---------|
| `nowrap`       | ✅      |
| `wrap`         | ✅      |
| `wrap-reverse` | ✅      |

### 7.5 `gap` / `row-gap` / `column-gap`

Integer cell count. Adds space between flex items.

---

## 8. Flexbox — Items

**Test file:** `08-flexbox-items.test.ts`

| Property      | Support | Notes                                                   |
|--------------|---------|----------------------------------------------------------|
| `flex`        | ✅      | Shorthand: `flex: 1` → grow=1 shrink=1 basis=0          |
| `flex-grow`   | ✅      | Numeric                                                 |
| `flex-shrink` | ✅      | Numeric                                                 |
| `flex-basis`  | ✅      | Integer, %, or `0`                                      |
| `align-self`  | ✅      | Per-item cross-axis override (all same values as align-items) |

**`flex` shorthand values:**

- `flex: none` → grow=0, shrink=0
- `flex: auto` → grow=1, shrink=1
- `flex: 1` → grow=1, shrink=1, basis=0
- `flex: 2 1 50%` → grow=2, shrink=1, basis=50%

---

## 9. Positioning

**Test file:** `09-position.test.ts`

| Property             | Support | Notes                                           |
|---------------------|---------|--------------------------------------------------|
| `position: relative` | ✅      | Default for all elements                        |
| `position: absolute` | ✅      | Positioned relative to nearest positioned ancestor |
| `top`                | ✅      | Integer or %                                   |
| `left`               | ✅      | Integer or %                                   |
| `right`              | ✅      | Integer or %                                   |
| `bottom`             | ✅      | Integer or %                                   |

### Out of scope

- `position: fixed` — no viewport scroll concept in terminal
- `position: sticky` — not implemented
- `z-index` — passthrough only; no actual depth ordering

---

## 10. Text Alignment

**Test file:** `10-text.test.ts`

### 10.1 `text-align`

Controls horizontal alignment of text content within its content box.

| Value    | Support | Notes                                    |
|---------|---------|------------------------------------------|
| `left`   | ✅      | Default; text starts at content-left x  |
| `center` | ✅      | Text centered in content width          |
| `right`  | ✅      | Text flush to content-right             |
| `justify`| ❌      | Not implemented                          |

### 10.2 `vertical-align`

Stored as `valign` on the node. Applies to box content.

| Value    | Support |
|---------|---------|
| `top`    | ✅      |
| `middle` | ✅      |
| `bottom` | ✅      |

---

## 11. Typography

**Test file:** `11-typography.test.ts`

| Property          | CSS value           | Cell effect              | Support |
|------------------|---------------------|--------------------------|---------|
| `font-weight`     | `bold` or `700`+    | `bold: true`             | ✅      |
| `bold`            | `true`/`1`          | `bold: true` (shorthand) | ✅      |
| `text-decoration` | `underline`         | `underline: true`        | ✅      |
| `underline`       | `true`/`1`          | `underline: true` (shorthand) | ✅ |
| `font-style`      | `italic`            | `italic: true`           | ✅      |

### Out of scope

- `font-size` — monospace terminal, no variable font size
- `font-family` — terminal uses system font
- `letter-spacing` / `word-spacing` — fixed character grid
- `line-height` — each row is one character cell
- `text-transform` — not implemented
- `text-shadow` — not applicable
- `text-overflow: ellipsis` — content is hard-clipped; no ellipsis
- `white-space` — not implemented

---

## 12. Overflow

**Test file:** `12-overflow.test.ts`

| Property     | Value           | Effect                                  | Support |
|-------------|----------------|------------------------------------------|---------|
| `overflow`   | `scroll`/`auto` | Makes element vertically scrollable     | ✅      |
| `overflow`   | `hidden`        | Content clipped (no scrollbar)          | ✅      |
| `overflow-y` | `scroll`/`auto` | Vertically scrollable                   | ✅      |
| `overflow-x` | `scroll`/`auto` | Marks `scrollableX` flag                | ⚠️      |

---

## 13. Pseudo-states

**Test file:** `13-pseudo-states.test.ts`

CSS pseudo-class selectors applied when an element is in a given interactive state.

| Selector  | Trigger                        | Support |
|----------|--------------------------------|---------|
| `:hover`  | Mouse cursor over element      | ✅      |
| `:focus`  | Element has keyboard focus     | ✅      |
| `:active` | Element is being pressed       | ✅      |

Pseudo-state styles can override any visual property (`color`, `background`, `bold`, `underline`,
`border-color`). They are stored as nested `hover`/`focus`/`active` objects on `LayoutProperties`.

---

## 14. Units & Values

**Test file:** `14-units.test.ts`

| Unit/Value  | Support | Notes                                           |
|------------|---------|--------------------------------------------------|
| Integer     | ✅      | `width: 20` → 20 cells                          |
| `px`        | ✅      | `20px` → 20 (unit stripped)                     |
| `em`        | ✅      | `2em` → 2 (no font-size basis; unit stripped)   |
| `rem`       | ✅      | `2rem` → 2 (unit stripped)                      |
| `%`         | ✅      | Relative to parent dimension                    |
| `calc()`    | ✅      | `calc(100% - 2)` resolved at layout time        |
| Negative    | ✅      | `-1` valid for margins                          |
| Float       | ✅      | `1.5` → rounded to `2` for cell dimensions      |

### Out of scope

- `vw` / `vh` — not implemented
- `ch` — character unit; not distinguished from px
- `fr` (grid fractions) — grid layout not supported
- CSS custom properties (`--var: value`) — not implemented

---

## 15. CSS Nesting

**Test file:** `15-nesting.test.ts`

VTerm uses `postcss-nested` to support nested CSS rules, processed before parsing.

```css
.parent {
  color: white;
  .child {
    color: cyan;
  }
  &:hover {
    background: blue;
  }
}
```

| Pattern           | Support | Notes                         |
|------------------|---------|-------------------------------|
| Nested selectors  | ✅      | `.parent .child { }` syntax   |
| `&` parent ref    | ✅      | `&:hover`, `& .child`         |
| Deep nesting (3+) | ✅      | Handled by postcss-nested     |

---

## 16. Visibility

**Test file:** `16-visibility.test.ts`

| Property     | Value      | Effect                                         | Support |
|-------------|-----------|------------------------------------------------|---------|
| `display`    | `none`    | Node takes no space and is not rendered        | ✅      |
| `visibility` | `hidden`  | Node is invisible (sets `invisible: true`)     | ✅      |
| `opacity`    | `< 1.0`   | Sets `transparent: true` (approximate)         | ⚠️      |
| `opacity`    | `1.0`     | No effect (fully opaque, default)              | ✅      |

---

## 17. Z Index : TODO!

> Z-index is not implemented. We want to add support ASAP for z-index.

**Test file:** `17-z-index.test.ts`

| Property     | Value      | Effect                                         | Support |
|-------------|-----------|------------------------------------------------|---------|
| z-index      | Integer    | Stacking order (higher = drawn later)          | ✅      |




## Out of Scope (will not be tested)

| Feature                            | Reason                                      |
|------------------------------------|---------------------------------------------|
| `animation` / `transition`         | Terminal rendering is synchronous           |
| `transform` (translate, rotate)    | No 2D transform support                     |
| `border-radius`                    | Cannot render curves in character grid      |
| `box-shadow` / `text-shadow`       | No layer compositing                        |
| `font-size` / `font-family`        | Monospace terminal; no font control         |
| `line-height`                      | Each row is one character cell              |
| `letter-spacing` / `word-spacing`  | Fixed character grid                        |
| `grid` layout                      | Not implemented                             |
| `float`                            | Not implemented                             |
| `clip-path` / `mask`               | Not applicable                              |
| `filter` (blur, contrast, etc.)    | Not applicable                              |
| `background-image` / gradients     | Not applicable                              |
| `pointer-events`                   | Not applicable                              |
| CSS custom properties (`--x`)      | Not implemented                             |
| `@media` queries                   | Not implemented                             |
| `@keyframes`                       | Not applicable                              |
| `position: fixed / sticky`         | No viewport scroll context                  |
| `text-overflow: ellipsis`          | Not implemented                             |
| `white-space`                      | Not implemented                             |
| `text-transform`                   | Not implemented                             |
| Combinators (`>`, `~`, `+`)        | Not implemented (postcss-nested only)       |
| Pseudo-elements (`::before`, etc.) | No pseudo-element nodes                     |
| `:nth-child`, `:not()`, etc.       | Not implemented                             |
