# VTerm Render Correctness Specification

This document is the canonical record of what the **buffer renderer** is expected to produce
for a given layout tree. It covers visual output at the `ScreenBuffer` level — exact character
placement, color regions, borders, clipping, scrolling, and stacking.

These tests complement the CSS compliance suite. Where css-compliance verifies that CSS
properties parse and compute correctly, render-correctness verifies that the **final pixels**
(cells) on screen are in the right place with the right values.

---

## Testing Model

All tests in this suite hook into the pipeline at the `ScreenBuffer` level:

```
CSS string + VNode
  ↓ transformCSSToLayout()
  ↓ engine.buildLayoutTree()
  ↓ engine.computeLayout()
  ↓ renderer.render(root, buffer)
  ↓
buffer.getCell(x, y) → { char, color, background, bold, underline, italic, inverse, dim }
```

For scroll tests, the pipeline is split:

```
buildAndLayout(css, vnode) → root LayoutNode
root.scrollY = N           ← manual scroll state injection
renderTree(root)           → ScreenBuffer
```

### Coordinate System

- `(0, 0)` is top-left
- `x` increases rightward, `y` increases downward
- All units are character cells (1 cell = 1 char wide, 1 char tall)

---

## 1. Text Placement

**Test file:** `01-text-placement.test.ts`

Text content is placed inside the **content box** of its container (inside padding, inside border).

| Scenario                          | Expected                                              |
|----------------------------------|-------------------------------------------------------|
| Single char, no padding           | Appears at `(0, 0)`                                   |
| Text with `padding-left: 2`       | First char at `(2, 0)`                                |
| Text with `padding-top: 1`        | First char at `(0, 1)`                                |
| `text-align: left` (default)      | Text starts at content-left x                         |
| `text-align: center`              | Text centered within content width                    |
| `text-align: right`               | Text flush to content-right                           |
| `vertical-align: top` (default)   | Text at first row of content area                     |
| `vertical-align: middle`          | Text at vertical midpoint of content area             |
| `vertical-align: bottom`          | Text at last row of content area                      |
| Text longer than container width  | Clipped at container boundary, no overflow            |
| Multiple sibling text nodes       | Each at correct y row (stacked by layout)             |
| Nested containers                 | Inner text at sum of ancestor offsets                 |

---

## 2. Background Fill

**Test file:** `02-background-fill.test.ts`

`background-color` fills every cell in the element's **border box** (including padding, excluding
border characters themselves which get the border color).

| Scenario                                    | Expected                                              |
|--------------------------------------------|-------------------------------------------------------|
| `background: blue` on 4×3 element          | All 12 cells have `background: 'blue'`                |
| Background does not extend past element width | Cells beyond element width have no background      |
| Background does not extend past element height | Cells below element height have no background     |
| Child with different background             | Overwrites parent background in child's region        |
| Child with no background                   | Parent's background shows through                     |
| Element with border + background           | Background fills inside border; border cells not bg   |
| Adjacent elements with different backgrounds | Each fills exactly its own region                   |

---

## 3. Border Drawing

**Test file:** `03-border-drawing.test.ts`

Borders are rendered using unicode box-drawing characters (or ASCII). A border occupies 1 cell on
each edge. The content area starts at `(x+1, y+1)` for a top-left bordered element.

### Border character sets

| Style    | TL  | TR  | BL  | BR  | H   | V   |
|---------|-----|-----|-----|-----|-----|-----|
| `line`   | `┌` | `┐` | `└` | `┘` | `─` | `│` |
| `heavy`  | `┏` | `┓` | `┗` | `┛` | `━` | `┃` |
| `double` | `╔` | `╗` | `╚` | `╝` | `═` | `║` |
| `ascii`  | `+` | `+` | `+` | `+` | `-` | `|` |

| Scenario                              | Expected                                              |
|--------------------------------------|-------------------------------------------------------|
| All four corners at exact coordinates | TL at (x,y), TR at (x+w-1,y), BL at (x,y+h-1), BR at (x+w-1,y+h-1) |
| Top edge horizontal chars            | H chars at (x+1..x+w-2, y)                           |
| Bottom edge horizontal chars         | H chars at (x+1..x+w-2, y+h-1)                       |
| Left edge vertical chars             | V chars at (x, y+1..y+h-2)                           |
| Right edge vertical chars            | V chars at (x+w-1, y+1..y+h-2)                       |
| Border color applies to all chars    | All border cells have correct `color`                 |
| Content starts inside border         | First content char at `(x+1, y+1)`                   |
| Nested bordered elements             | Inner border at correct offset from outer             |
| Border-only (no content)             | Interior cells are empty spaces                       |

---

## 4. Content Clipping

**Test file:** `04-clipping.test.ts`

Content is clipped to the element's bounds. Children that extend outside their parent's
layout box are not rendered beyond the parent boundary.

| Scenario                                       | Expected                                              |
|-----------------------------------------------|-------------------------------------------------------|
| Text longer than container clips at right edge | No chars past `(x+width-1)` for the element          |
| Child element wider than parent clips          | Child chars outside parent bounds are not rendered    |
| Child element taller than parent clips         | Child chars below parent bottom are not rendered      |
| `overflow: hidden` clips scrolled content      | Content offset by scrollY is hidden above container   |
| Nested clip boxes compound                     | Deep child clips to innermost container               |
| Sibling after clipped element is unaffected    | Sibling renders normally outside the clip region      |

---

## 5. Scroll Regions

**Test file:** `05-scroll.test.ts`

Scroll regions (`overflow: scroll`) show a window into content. Adjusting `scrollY` moves
the visible window. Content is not re-laid out — scroll is a pure rendering offset.

| Scenario                                          | Expected                                              |
|--------------------------------------------------|-------------------------------------------------------|
| `scrollY=0`: first content row at viewport top   | Row 0 of content visible at container's top y         |
| `scrollY=1`: second content row at top           | Row 1 of content at top; row 0 no longer visible      |
| `scrollY=N`: Nth content row at top              | Content rows 0..N-1 are above clip; not rendered      |
| Content rows within viewport window are visible  | Rows N..N+viewportH-1 rendered at correct screen y    |
| Content rows below viewport are clipped          | Rows past N+viewportH are not rendered                |
| `scrollY=0` with no overflow: all content visible| All rows visible, scrollbar absent                    |

---

## 6. Nested Flex Layout

**Test file:** `06-nested-flex.test.ts`

Flex children are placed at specific coordinates based on the layout algorithm. These tests
verify the actual rendered positions of characters within nested flex structures.

| Scenario                                          | Expected                                              |
|--------------------------------------------------|-------------------------------------------------------|
| Two `flex:1` siblings in row container           | Each occupies half the container width                |
| Three `flex:1` siblings in row                   | Each at x = 0, W/3, 2*W/3 respectively               |
| Column flex: children stacked at y=0,1,2,...     | Each child's content at correct y                     |
| Nested row inside column: inner items at correct x,y | Combines column offset with row x positions       |
| `gap: 2` between row siblings                    | Second child starts 2 cells after first ends          |
| `justify-content: center` in row                 | Combined child width centered in container            |
| `align-items: center` in column                  | Child text centered horizontally                      |
| Fixed width sidebar + `flex:1` content           | Content starts immediately after sidebar right edge   |

---

## 7. Absolute Positioning

**Test file:** `07-absolute-position.test.ts`

Absolutely positioned elements are placed relative to their nearest positioned ancestor.
They do not participate in flow layout (siblings ignore them).

| Scenario                                          | Expected                                              |
|--------------------------------------------------|-------------------------------------------------------|
| `position: absolute; top: 2; left: 5`            | Element top-left at `(5, 2)`                          |
| `position: absolute; right: 0; top: 0`           | Element top-right at `(containerW-width, 0)`          |
| `position: absolute; bottom: 0; left: 0`         | Element bottom-left at `(0, containerH-height)`       |
| Absolute element in positioned container         | Offset relative to container, not screen              |
| Flow siblings unaffected by absolute element     | Flow siblings render as if absolute didn't exist      |
| Absolute renders on top of flow content          | Absolute element chars overwrite any content beneath  |

---

## 8. Sidebar Layout Patterns

**Test file:** `08-sidebar-layout.test.ts`

Real-world sidebar patterns: fixed-width sidebar + flex content area. This is among the most
common TUI layout patterns and the most likely source of off-by-one rendering bugs.

| Scenario                                          | Expected                                              |
|--------------------------------------------------|-------------------------------------------------------|
| Sidebar `width:20` + content `flex:1` at 80 wide | Content starts at x=20, width=60                     |
| Sidebar chars render inside sidebar bounds        | No sidebar char at x >= 20                           |
| Content chars render in content area              | No content char at x < 20                            |
| Sidebar with border: content starts at x=21      | Border occupies x=20; content at x=21                |
| Nested sidebar item padding                       | Sidebar items indented by padding-left                |
| Content area fills remaining width exactly        | Last content char at x=79 (width-1)                  |
| Three-column layout (left, center, right)         | Each column starts at the correct x                  |

---

## 9. Paint Order (Stacking)

**Test file:** `09-stacking.test.ts`

The buffer renderer paints nodes in tree order: parents first, then children, then later
siblings. Last write wins at any given cell.

| Scenario                                          | Expected                                              |
|--------------------------------------------------|-------------------------------------------------------|
| Child renders over parent background              | Child's bg overwrites parent bg in child's region     |
| Later sibling renders over earlier sibling        | Where siblings overlap, later sibling wins            |
| Absolute element renders after flow content       | Absolute chars overwrite flow content beneath         |
| Deep child over parent and grandparent            | Deepest child's content on top                        |

---

## 10. Interactive State Rendering

**Test file:** `10-interactive-states.test.ts`

`:hover`, `:focus`, `:active` pseudo-classes change visual styles when an element is in the
corresponding interactive state. These styles are resolved by the buffer renderer via
`getEffectiveStyle()` and applied to all cells in the affected element.

| Scenario                                          | Expected                                              |
|--------------------------------------------------|-------------------------------------------------------|
| Default (no state): base color applied            | `color` / `background` from base style               |
| `:hover` active: hover bg/color applied           | Hover style overwrites base style                     |
| `:focus` active: focus border-color applied       | Focus border color on border cells                    |
| `:active` active: active bg applied               | Active background on all element cells                |
| Pseudo-state does not bleed to siblings           | Adjacent elements unaffected by sibling's state       |
| State removed: base style restored                | After state cleared, base style renders               |

---

## 11. Scrollbar Overlay

**Test file:** `11-scrollbar.test.ts`

When a scrollable element's `contentHeight > viewportHeight`, a scrollbar is painted on top of
the rightmost column of the viewport. It uses `│` for track and `█` for thumb.

| Scenario                                          | Expected                                              |
|--------------------------------------------------|-------------------------------------------------------|
| No overflow: no scrollbar rendered               | Rightmost column has normal content, not `│` or `█`   |
| Overflow present: track `│` at `x = viewport.x + viewport.width - 1` | Scrollbar column correct |
| `scrollY=0`: thumb `█` at top of track           | `█` at first scrollbar row                           |
| `scrollY=max`: thumb `█` at bottom of track      | `█` at last scrollbar row                            |
| Mid-scroll: thumb positioned proportionally       | Thumb position = round(scrollY/scrollRange * trackRange) |
| Scrollbar overlays content (not whitespace)       | Scrollbar char replaces any content at that column    |
| Scrollbar track color: `grey`                    | Track cells have `color: 'grey'`                      |
| Scrollbar thumb color: `white`                   | Thumb cells have `color: 'white'`                     |

---

## Out of Scope

These scenarios are intentionally not tested in this suite (see css-compliance/ for CSS parsing):

| Excluded scenario             | Reason                                                  |
|------------------------------|---------------------------------------------------------|
| CSS property parsing          | Covered by css-compliance suite                         |
| Layout dimension computation  | Covered by layout unit tests (flexbox, box-model)       |
| ANSI output format            | Covered by driver tests                                 |
| Frame diffing                 | Covered by differ tests                                 |
| Mouse/keyboard events         | Not a rendering concern                                 |
| Font rendering                | Terminal monospace; not applicable                      |
