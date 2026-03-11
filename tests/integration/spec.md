# VTerm Integration Test Specification

## Overview

This is the **master specification** for VTerm's integration test suite. Integration tests verify the complete rendering pipeline end-to-end: Vue SFC → VNode → LayoutTree → ScreenBuffer → ANSI output. They complement the existing compliance suites by testing real-world combinations of features.

**Goal:** Every CSS property, HTML element, layout behavior, interactive feature, and edge case in VTerm's spec should have at least one integration test exercising it through the full pipeline.

**Structure:**
- Each feature category has its own folder under `tests/integration/`
- Each folder contains:
  - `spec.md` — what scenarios should be tested (this file, comprehensive index)
  - One or more `.test.ts` files (will be created)
  - One or more `.vue` SFC files (test fixtures)

---

## Color & Styling (INT-COLOR)

### 1.1 Named Colors

```vue
<!-- tests/integration/color/named-colors.vue -->
<template>
  <div class="box red">Red</div>
  <div class="box blue">Blue</div>
  <div class="box cyan">Cyan</div>
  <div class="box brightgreen">Bright Green</div>
</template>

<script setup>
const colors = ['red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white', 'gray', 'black',
  'brightred', 'brightgreen', 'brightyellow', 'brightblue', 'brightmagenta', 'brightcyan', 'brightwhite']
</script>

<style scoped>
.box { width: 15; height: 1; }
.red { color: red; }
.blue { color: blue; }
.cyan { color: cyan; }
.brightgreen { color: brightgreen; }
</style>
```

**Tests to verify:**
- [ ] Each named color renders with correct foreground
- [ ] Bright variants render distinctly from base colors
- [ ] Each CSS color name from extended palette (aliceblue...yellowgreen) converts correctly
- [ ] Named colors work in `color`, `background-color`, `border-color`

### 1.2 Hex Colors

**Tests:**
- [ ] `#RGB` expands to `#RRGGBB` correctly
- [ ] `#RRGGBB` passes through unchanged
- [ ] `#RRGGBBAA` strips alpha, becomes `#RRGGBB`
- [ ] Invalid hex formats gracefully degrade

### 1.3 Functional Colors

**Tests:**
- [ ] `rgb(255, 0, 0)` → red with correct rendering
- [ ] `rgba(255, 0, 0, 0.5)` ignores alpha, renders red
- [ ] `hsl(0, 100%, 50%)` → red
- [ ] `hsl(240, 100%, 50%)` → blue
- [ ] `hsl(h, s%, l%)` with various s%, l% values

### 1.4 256-Color Index

**Tests:**
- [ ] Integer 0-255 passes through as string
- [ ] Common palette indices (16-231) render
- [ ] Out-of-range indices handled gracefully

### 1.5 Background Colors

**Tests:**
- [ ] `background: red` fills entire element box
- [ ] Child background overwrites parent in child's region
- [ ] Background doesn't fill border (only content + padding)
- [ ] Multiple nested backgrounds layer correctly

---

## Typography & Text Styles (INT-TEXT)

### 2.1 Text Alignment

```vue
<!-- tests/integration/typography/text-alignment.vue -->
<template>
  <div class="left">Left aligned text goes here</div>
  <div class="center">Centered text</div>
  <div class="right">Right aligned</div>
</template>

<style scoped>
div { width: 30; height: 1; background: grey; }
.left { text-align: left; }
.center { text-align: center; }
.right { text-align: right; }
</style>
```

**Tests:**
- [ ] `text-align: left` — text starts at content-left x
- [ ] `text-align: center` — text centered within content width
- [ ] `text-align: right` — text ends at content-right x
- [ ] Text alignment respects padding
- [ ] Text alignment respects border
- [ ] Text longer than width clips (not wrapped)

### 2.2 Vertical Alignment

```vue
<!-- tests/integration/typography/vertical-alignment.vue -->
<template>
  <div class="top">Top</div>
  <div class="middle">Middle</div>
  <div class="bottom">Bottom</div>
</template>

<style scoped>
div { width: 20; height: 5; background: blue; }
.top { vertical-align: top; }
.middle { vertical-align: middle; }
.bottom { vertical-align: bottom; }
</style>
```

**Tests:**
- [ ] `vertical-align: top` — text at first content row
- [ ] `vertical-align: middle` — text at vertical center
- [ ] `vertical-align: bottom` — text at last content row
- [ ] Vertical alignment respects padding

### 2.3 Font Weight

**Tests:**
- [ ] `font-weight: bold` sets `cell.bold = true`
- [ ] `font-weight: 700` sets bold
- [ ] `font-weight: 600` sets bold
- [ ] `font-weight: 400` (normal) no bold
- [ ] `bold: true` shorthand works
- [ ] Bold works in all text regions (content, borders, etc.)

### 2.4 Text Decoration

**Tests:**
- [ ] `text-decoration: underline` sets `cell.underline = true`
- [ ] `underline: true` shorthand works
- [ ] Underline works on all text (headings, paragraphs, links)
- [ ] Underline stacks with bold

### 2.5 Font Style

**Tests:**
- [ ] `font-style: italic` sets `cell.italic = true`
- [ ] `italic: true` shorthand works
- [ ] Italic stacks with bold and underline

---

## Spacing: Padding (INT-PADDING)

### 3.1 Uniform Padding

```vue
<!-- tests/integration/spacing/padding-uniform.vue -->
<template>
  <div class="box">Content</div>
</template>

<style scoped>
.box {
  width: 20;
  height: 5;
  padding: 1;
  background: blue;
  border: 1px solid white;
}
</style>
```

**Tests:**
- [ ] `padding: 1` applies all four sides uniformly
- [ ] Content starts at `(border + padding, border + padding)`
- [ ] Empty cells between border and content are padding (unfilled)

### 3.2 Directional Padding

**Tests:**
- [ ] `padding: 1 2` → top/bottom=1, left/right=2
- [ ] `padding: 1 2 3 4` → top=1, right=2, bottom=3, left=4
- [ ] `padding-top`, `padding-right`, `padding-bottom`, `padding-left` individual properties
- [ ] Padding affects text position

### 3.3 Padding with Border

**Tests:**
- [ ] Border is outside padding
- [ ] Content starts at `x + border-width + padding-left`
- [ ] Border doesn't count toward padding

---

## Spacing: Margin (INT-MARGIN)

### 4.1 Uniform Margin

```vue
<!-- tests/integration/spacing/margin-uniform.vue -->
<template>
  <div class="container">
    <div class="box">Box 1</div>
    <div class="box">Box 2</div>
  </div>
</template>

<style scoped>
.container { width: 20; height: 20; background: white; }
.box {
  width: 10;
  height: 3;
  margin: 1;
  background: blue;
}
</style>
```

**Tests:**
- [ ] `margin: 1` creates space around element
- [ ] Margin collapses between block siblings (top/bottom)
- [ ] First element margin-top is preserved
- [ ] Last element margin-bottom is preserved

### 4.2 Directional Margin

**Tests:**
- [ ] `margin: 1 2` → top/bottom=1, left/right=2
- [ ] `margin: 1 2 3 4` → top=1, right=2, bottom=3, left=4
- [ ] `margin-top`, `margin-right`, `margin-bottom`, `margin-left`

### 4.3 Auto Margins

**Tests:**
- [ ] `margin: auto` sets `marginAuto` flag
- [ ] Auto margins in flex containers may center (or not — spec-dependent)

---

## Border (INT-BORDER)

### 5.1 Border Style: Line

```vue
<!-- tests/integration/border/border-line.vue -->
<template>
  <div class="box">Content</div>
</template>

<style scoped>
.box {
  width: 15;
  height: 5;
  border: 1px solid cyan;
}
</style>
```

**Tests:**
- [ ] `border-style: solid` renders `┌─┐│└┘`
- [ ] Border corners at exact coordinates
- [ ] Horizontal edges `─` drawn correctly
- [ ] Vertical edges `│` drawn correctly
- [ ] Content starts at `(x+1, y+1)`

### 5.2 Border Style: Heavy

**Tests:**
- [ ] `border-style: heavy` renders `┏━┓┃┗┛`
- [ ] Heavy borders visually distinct

### 5.3 Border Style: Double

**Tests:**
- [ ] `border-style: double` renders `╔═╗║╚╝`

### 5.4 Border Style: ASCII

**Tests:**
- [ ] `border-style: ascii` renders `+-+|`

### 5.5 Border Color

**Tests:**
- [ ] `border-color: red` applies to all border characters
- [ ] Border color independent of text color
- [ ] Border color works with all styles (solid, heavy, double, ascii)

### 5.6 Border Width

**Tests:**
- [ ] `border-width: 0` → no border
- [ ] `border-width: 1` → one-character border
- [ ] Border width affects content offset

### 5.7 Shorthand

**Tests:**
- [ ] `border: 1px solid blue`
- [ ] `border: 1 line white`

---

## Dimensions (INT-DIMENSIONS)

### 6.1 Fixed Dimensions

```vue
<!-- tests/integration/dimensions/fixed.vue -->
<template>
  <div class="box20">W=20</div>
  <div class="box30">W=30</div>
</template>

<style scoped>
.box20 { width: 20; height: 2; background: blue; }
.box30 { width: 30; height: 2; background: cyan; }
</style>
```

**Tests:**
- [ ] `width: N` renders exactly N cells wide
- [ ] `height: N` renders exactly N cells tall
- [ ] Pixel units (`20px`) stripped to raw cell count
- [ ] `em` units treated as raw cell count (no font-size basis)
- [ ] `rem` units treated as raw cell count

### 6.2 Percentage Dimensions

```vue
<!-- tests/integration/dimensions/percentage.vue -->
<template>
  <div class="parent">
    <div class="half">50%</div>
    <div class="half">50%</div>
  </div>
</template>

<style scoped>
.parent { width: 80; height: 10; display: flex; }
.half { width: 50%; height: 100%; background: blue; }
</style>
```

**Tests:**
- [ ] `width: 50%` = half of parent width
- [ ] `height: 100%` = full parent height
- [ ] Percentages resolve at layout time
- [ ] Percentages work with flex children
- [ ] Percentages with padding/border computed correctly

### 6.3 `calc()` Expressions

```vue
<!-- tests/integration/dimensions/calc.vue -->
<template>
  <div class="container">
    <div class="sidebar">Side</div>
    <div class="content">Content</div>
  </div>
</template>

<style scoped>
.container { width: 80; height: 10; display: flex; }
.sidebar { width: 20; background: blue; }
.content { width: calc(100% - 20); background: cyan; }
</style>
```

**Tests:**
- [ ] `calc(100% - 2)` subtracts correctly
- [ ] `calc(50% + 5)` adds correctly
- [ ] `calc(100% / 2)` divides correctly
- [ ] Nested calc expressions (if supported)
- [ ] calc() with mixed units (% and fixed)

### 6.4 Min/Max Dimensions

**Tests:**
- [ ] `min-width: 10` enforces minimum
- [ ] `max-width: 50` enforces maximum
- [ ] `min-height: 2` enforces minimum
- [ ] `max-height: 20` enforces maximum
- [ ] Min/max work with percentage sizing

### 6.5 `shrink` Keyword

**Tests:**
- [ ] `width: shrink` sizes to content width
- [ ] `height: shrink` sizes to content height

---

## Display & Layout Modes (INT-DISPLAY)

### 7.1 Display: Block

```vue
<!-- tests/integration/display/block.vue -->
<template>
  <div class="a">Block A</div>
  <div class="b">Block B</div>
  <div class="c">Block C</div>
</template>

<style scoped>
div { width: 20; height: 2; background: blue; }
</style>
```

**Tests:**
- [ ] `display: block` stacks vertically
- [ ] Block elements fill parent width (unless fixed)
- [ ] Block elements respect margin collapsing
- [ ] Block elements respect padding/border

### 7.2 Display: Flex

```vue
<!-- tests/integration/display/flex-row.vue -->
<template>
  <div class="container">
    <div class="item">A</div>
    <div class="item">B</div>
    <div class="item">C</div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  flex-direction: row;
  width: 30;
  height: 3;
}
.item { flex: 1; height: 3; background: blue; }
</style>
```

**Tests:**
- [ ] `display: flex` with `flex-direction: row` (default)
- [ ] `display: flex` with `flex-direction: column`
- [ ] `display: flex` with `flex-direction: row-reverse`
- [ ] `display: flex` with `flex-direction: column-reverse`
- [ ] Flex children sized correctly
- [ ] Flex children positioned correctly

### 7.3 Display: None

```vue
<!-- tests/integration/display/none.vue -->
<template>
  <div class="visible">Visible</div>
  <div class="hidden">Hidden</div>
  <div class="visible">Visible</div>
</template>

<style scoped>
.hidden { display: none; }
</style>
```

**Tests:**
- [ ] `display: none` hides element
- [ ] `display: none` takes no layout space
- [ ] `display: none` children also hidden
- [ ] Sibling after hidden element renders at correct position

### 7.4 Display: Inline

**Tests:**
- [ ] `display: inline` behavior (if supported)
- [ ] Inline elements in flow (if supported)

---

## Flexbox Container (INT-FLEXBOX-CONTAINER)

### 8.1 Flex Direction

**Tests (comprehensive matrix):**
- [ ] `flex-direction: row` — children left-to-right
- [ ] `flex-direction: column` — children top-to-bottom
- [ ] `flex-direction: row-reverse` — children right-to-left
- [ ] `flex-direction: column-reverse` — children bottom-to-top

### 8.2 Justify Content (Main Axis)

```vue
<!-- tests/integration/flexbox/justify-content.vue -->
<template>
  <div class="flex-start">
    <div class="item">A</div>
    <div class="item">B</div>
  </div>
  <div class="flex-end">
    <div class="item">A</div>
    <div class="item">B</div>
  </div>
  <div class="center">
    <div class="item">A</div>
    <div class="item">B</div>
  </div>
  <div class="space-between">
    <div class="item">A</div>
    <div class="item">B</div>
  </div>
</template>

<style scoped>
div[class] {
  width: 30;
  height: 2;
  display: flex;
  margin-top: 1;
}
.flex-start { justify-content: flex-start; }
.flex-end { justify-content: flex-end; }
.center { justify-content: center; }
.space-between { justify-content: space-between; }

.item {
  width: 5;
  height: 2;
  background: blue;
  margin: 0;
}
</style>
```

**Tests:**
- [ ] `justify-content: flex-start` — children at start
- [ ] `justify-content: flex-end` — children at end
- [ ] `justify-content: center` — children centered
- [ ] `justify-content: space-between` — children with equal space between
- [ ] `justify-content: space-around` — children with equal space around
- [ ] `justify-content: space-evenly` — children with equal space including edges

### 8.3 Align Items (Cross Axis)

```vue
<!-- tests/integration/flexbox/align-items.vue -->
<template>
  <div class="flex-start">
    <div class="item">A</div>
    <div class="item-tall">B</div>
    <div class="item">C</div>
  </div>
  <div class="center">
    <div class="item">A</div>
    <div class="item-tall">B</div>
    <div class="item">C</div>
  </div>
</template>

<style scoped>
div[class] {
  width: 30;
  height: 5;
  display: flex;
  margin-top: 1;
}
.flex-start { align-items: flex-start; }
.center { align-items: center; }

.item { width: 5; height: 2; background: blue; }
.item-tall { width: 5; height: 5; background: green; }
</style>
```

**Tests:**
- [ ] `align-items: flex-start` — all children top-aligned
- [ ] `align-items: flex-end` — all children bottom-aligned
- [ ] `align-items: center` — all children centered
- [ ] `align-items: stretch` — children stretch to container height
- [ ] `align-items: baseline` — treated as flex-start

### 8.4 Flex Wrap

```vue
<!-- tests/integration/flexbox/flex-wrap.vue -->
<template>
  <div class="nowrap">
    <div class="item">A</div>
    <div class="item">B</div>
    <div class="item">C</div>
  </div>
  <div class="wrap">
    <div class="item">A</div>
    <div class="item">B</div>
    <div class="item">C</div>
  </div>
</template>

<style scoped>
div[class] {
  width: 15;
  height: 10;
  display: flex;
  margin-top: 1;
}
.nowrap { flex-wrap: nowrap; }
.wrap { flex-wrap: wrap; }

.item { width: 8; height: 2; background: blue; }
</style>
```

**Tests:**
- [ ] `flex-wrap: nowrap` — children don't wrap (truncate if needed)
- [ ] `flex-wrap: wrap` — children wrap to next line
- [ ] `flex-wrap: wrap-reverse` — children wrap upward

### 8.5 Gap / Row Gap / Column Gap

```vue
<!-- tests/integration/flexbox/gap.vue -->
<template>
  <div class="row-gap">
    <div class="item">A</div>
    <div class="item">B</div>
  </div>
  <div class="col-gap">
    <div class="item">A</div>
    <div class="item">B</div>
  </div>
</template>

<style scoped>
.row-gap {
  display: flex;
  width: 30;
  height: 10;
  gap: 2;
}
.col-gap {
  display: flex;
  flex-direction: column;
  width: 10;
  height: 10;
  gap: 1;
}

.item { width: 10; height: 3; background: blue; }
</style>
```

**Tests:**
- [ ] `gap: 2` adds space between all items
- [ ] `row-gap: 1` adds space between rows (column flex)
- [ ] `column-gap: 2` adds space between columns (row flex)
- [ ] Gap doesn't apply to first item
- [ ] Gap works with wrap

---

## Flexbox Items (INT-FLEXBOX-ITEMS)

### 9.1 Flex Shorthand

```vue
<!-- tests/integration/flexbox/flex-shorthand.vue -->
<template>
  <div class="container">
    <div class="flex-1">flex: 1</div>
    <div class="flex-2">flex: 2</div>
    <div class="flex-auto">flex: auto</div>
    <div class="flex-none">flex: none</div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  width: 40;
  height: 3;
}
.flex-1 { flex: 1; background: red; }
.flex-2 { flex: 2; background: blue; }
.flex-auto { flex: auto; background: green; }
.flex-none { flex: none; width: 5; background: yellow; }
</style>
```

**Tests:**
- [ ] `flex: 1` → grow=1, shrink=1, basis=0
- [ ] `flex: 2` → grow=2, shrink=1, basis=0
- [ ] `flex: auto` → grow=1, shrink=1, basis=auto
- [ ] `flex: none` → grow=0, shrink=0
- [ ] `flex: 1 2 50%` → grow=1, shrink=2, basis=50%

### 9.2 Flex Grow / Shrink / Basis

**Tests:**
- [ ] `flex-grow: 2` distributes extra space
- [ ] `flex-shrink: 0` prevents shrinking
- [ ] `flex-basis: 0` sizes to grow allocation
- [ ] `flex-basis: 50%` sizes to percentage
- [ ] `flex-basis: 10` sizes to fixed

### 9.3 Align Self

```vue
<!-- tests/integration/flexbox/align-self.vue -->
<template>
  <div class="container">
    <div class="item">A</div>
    <div class="item align-end">B (end)</div>
    <div class="item">C</div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  width: 30;
  height: 5;
  align-items: flex-start;
}
.item { width: 8; height: 2; background: blue; }
.align-end { align-self: flex-end; }
</style>
```

**Tests:**
- [ ] `align-self: flex-start` overrides container
- [ ] `align-self: flex-end` overrides container
- [ ] `align-self: center` overrides container
- [ ] `align-self: stretch` overrides container

---

## Positioning (INT-POSITION)

### 10.1 Relative Positioning

```vue
<!-- tests/integration/position/relative.vue -->
<template>
  <div class="container">
    <div class="static">Static</div>
    <div class="relative">Relative</div>
    <div class="static">Static</div>
  </div>
</template>

<style scoped>
.container { width: 20; height: 10; }
.static { width: 10; height: 2; background: blue; }
.relative { width: 10; height: 2; background: green; position: relative; left: 5; top: 1; }
</style>
```

**Tests:**
- [ ] `position: relative` is default
- [ ] `top`, `left`, `right`, `bottom` offsets applied correctly
- [ ] Relative positioning doesn't affect siblings

### 10.2 Absolute Positioning

```vue
<!-- tests/integration/position/absolute.vue -->
<template>
  <div class="container">
    <div class="absolute">Absolute</div>
    <div class="flow">Flow</div>
  </div>
</template>

<style scoped>
.container {
  width: 30;
  height: 10;
  position: relative;
}
.absolute {
  position: absolute;
  top: 2;
  left: 5;
  width: 10;
  height: 2;
  background: green;
}
.flow {
  width: 10;
  height: 2;
  background: blue;
}
</style>
```

**Tests:**
- [ ] `position: absolute` removes from flow
- [ ] `top: N` positions from top of container
- [ ] `left: N` positions from left of container
- [ ] `right: N` positions from right of container
- [ ] `bottom: N` positions from bottom of container
- [ ] Absolute element positioned relative to nearest positioned ancestor
- [ ] Siblings unaffected by absolute element
- [ ] Absolute element renders on top of flow

---

## Overflow (INT-OVERFLOW)

### 11.1 Overflow: Hidden

```vue
<!-- tests/integration/overflow/hidden.vue -->
<template>
  <div class="container">
    <p>Line 1</p>
    <p>Line 2</p>
    <p>Line 3</p>
  </div>
</template>

<style scoped>
.container {
  width: 20;
  height: 3;
  overflow: hidden;
  background: blue;
}
p { width: 20; height: 1; }
</style>
```

**Tests:**
- [ ] `overflow: hidden` clips content at boundary
- [ ] No scrollbar rendered
- [ ] Content beyond height not visible

### 11.2 Overflow: Scroll / Auto

```vue
<!-- tests/integration/overflow/scroll.vue -->
<template>
  <div class="container">
    <p v-for="i in 10" :key="i">Line {{ i }}</p>
  </div>
</template>

<style scoped>
.container {
  width: 20;
  height: 5;
  overflow: scroll;
  background: blue;
}
p { width: 20; height: 1; }
</style>
```

**Tests:**
- [ ] `overflow: scroll` makes element scrollable
- [ ] `overflow: auto` makes element scrollable if needed
- [ ] Scrollbar renders on right side
- [ ] Content scrolls when scrollY changes
- [ ] Scrollbar position reflects scroll position

### 11.3 Overflow X

**Tests:**
- [ ] `overflow-x: scroll` marks `scrollableX` flag
- [ ] Horizontal scrolling (if supported)

---

## Pseudo-Classes (INT-PSEUDO)

### 12.1 Hover State

```vue
<!-- tests/integration/pseudo/hover.vue -->
<template>
  <div class="box">Hover me</div>
</template>

<script setup>
import { ref } from 'vue'
const isHovered = ref(false)
</script>

<style scoped>
.box {
  width: 20;
  height: 2;
  background: blue;
  color: white;
}
.box:hover {
  background: green;
  color: yellow;
}
</style>
```

**Tests:**
- [ ] `:hover` styles apply when mouse over
- [ ] `:hover` styles remove when mouse leaves
- [ ] `:hover` doesn't affect siblings

### 12.2 Focus State

```vue
<!-- tests/integration/pseudo/focus.vue -->
<template>
  <input class="input" />
</template>

<style scoped>
.input {
  width: 20;
  height: 1;
}
.input:focus {
  border-color: cyan;
  background: green;
}
</style>
```

**Tests:**
- [ ] `:focus` styles apply to focused element
- [ ] `:focus` styles remove when focus lost
- [ ] Only one element focused at a time

### 12.3 Active State

**Tests:**
- [ ] `:active` styles apply while pressed
- [ ] `:active` styles remove on release

---

## CSS Nesting (INT-NESTING)

### 13.1 Nested Selectors

```vue
<!-- tests/integration/nesting/nested-selectors.vue -->
<template>
  <div class="parent">
    Parent text
    <div class="child">Child text</div>
  </div>
</template>

<style scoped>
.parent {
  width: 20;
  height: 5;
  background: blue;
  color: white;

  .child {
    width: 10;
    height: 2;
    background: green;
    color: yellow;
  }
}
</style>
```

**Tests:**
- [ ] Nested selectors expand correctly
- [ ] Child selector inherits parent context

### 13.2 Parent Reference (`&`)

```vue
<!-- tests/integration/nesting/ampersand.vue -->
<template>
  <button>Click me</button>
</template>

<style scoped>
button {
  width: 15;
  height: 1;
  background: blue;

  &:hover {
    background: green;
  }

  &.active {
    background: red;
  }
}
</style>
```

**Tests:**
- [ ] `&:hover` expands to `button:hover`
- [ ] `&.class` expands to `button.class`

---

## HTML Elements (INT-HTML)

### 14.1 Container Elements

**Elements:** `div`, `section`, `article`, `header`, `footer`, `main`, `nav`, `aside`

```vue
<!-- tests/integration/html/containers.vue -->
<template>
  <header>Header</header>
  <nav>Navigation</nav>
  <main>
    <section>Section</section>
    <article>Article</article>
  </main>
  <footer>Footer</footer>
</template>

<style scoped>
header { width: 80; height: 2; background: blue; }
nav { width: 80; height: 2; background: cyan; }
main { width: 80; height: 20; display: flex; }
section { flex: 1; background: green; }
article { flex: 1; background: yellow; }
footer { width: 80; height: 2; background: red; }
</style>
```

**Tests:**
- [ ] Each element renders as block container
- [ ] No UA styles applied
- [ ] Can nest arbitrarily
- [ ] All behave identically to `div`

### 14.2 Heading Elements

**Elements:** `h1`, `h2`, `h3`, `h4`, `h5`, `h6`

```vue
<!-- tests/integration/html/headings.vue -->
<template>
  <h1>Heading 1</h1>
  <h2>Heading 2</h2>
  <h3>Heading 3</h3>
</template>

<style scoped>
h1 { font-weight: bold; width: 30; height: 1; }
h2 { font-weight: bold; width: 30; height: 1; }
h3 { font-weight: bold; width: 30; height: 1; }
</style>
```

**Tests:**
- [ ] Each heading renders text correctly
- [ ] No UA bold (user must apply CSS)
- [ ] All h1-h6 behave identically without CSS

### 14.3 Paragraph Elements

**Elements:** `p`, `pre`

```vue
<!-- tests/integration/html/paragraphs.vue -->
<template>
  <p>Paragraph 1</p>
  <p>Paragraph 2</p>
  <pre>Preformatted text</pre>
</template>

<style scoped>
p { width: 40; height: 1; }
pre { width: 40; height: 1; }
</style>
```

**Tests:**
- [ ] `p` renders text content
- [ ] `p` has block layout
- [ ] `pre` renders same as `p`
- [ ] Whitespace in `pre` NOT preserved (limitation)

### 14.4 List Elements

**Elements:** `ul`, `ol`, `li`

```vue
<!-- tests/integration/html/lists.vue -->
<template>
  <ul>
    <li>Item 1</li>
    <li>Item 2</li>
    <li>Item 3</li>
  </ul>
  <ol>
    <li>Item 1</li>
    <li>Item 2</li>
  </ol>
</template>

<style scoped>
li { width: 20; height: 1; padding: 1; }
</style>
```

**Tests:**
- [ ] `li` renders text content
- [ ] `li` items stack vertically
- [ ] No bullet characters (must add via CSS)
- [ ] No auto-numbering (must add via CSS)
- [ ] `ul` and `ol` behave identically

### 14.5 Anchor Element

**Element:** `a`

```vue
<!-- tests/integration/html/anchor.vue -->
<template>
  <a href="https://example.com">Link text</a>
</template>

<style scoped>
a { width: 15; height: 1; }

a:hover {
  color: white;
  background: blue;
}
</style>
```

**Tests:**
- [ ] `a` renders text content
- [ ] UA `color: cyan` applied by default
- [ ] UA `underline: true` applied by default
- [ ] User `color` overrides UA
- [ ] `href` attribute ignored (no navigation)

### 14.6 Button Element

**Element:** `button`

```vue
<!-- tests/integration/html/button.vue -->
<template>
  <button @press="handlePress">Click me</button>
</template>

<script setup>
const handlePress = () => {
  console.log('Pressed')
}
</script>

<style scoped>
button {
  width: 15;
  height: 1;
  color: white;
}

button:hover {
  background: brightblue;
}

button:focus {
  border-color: yellow;
}
</style>
```

**Tests:**
- [ ] `button` renders text content
- [ ] UA `background: blue` applied by default
- [ ] User `background` overrides UA
- [ ] User `color` applies to text
- [ ] Button can contain child elements
- [ ] `@press` handler fires (interaction test)

### 14.7 Input Element

**Element:** `input`

```vue
<!-- tests/integration/html/input.vue -->
<template>
  <input
    v-model="text"
    placeholder="Enter text"
    @change="handleChange"
  />
</template>

<script setup>
import { ref } from 'vue'
const text = ref('')
const handleChange = (value) => {
  console.log('Value:', value)
}
</script>

<style scoped>
input {
  width: 30;
  height: 1;
}
</style>
```

**Tests:**
- [ ] `input` renders with placeholder when empty
- [ ] UA `background: grey` applied
- [ ] User `background` overrides UA
- [ ] Text input renders correctly
- [ ] Text longer than width scrolls/clips
- [ ] Cursor renders at correct position
- [ ] Printable keys insert text
- [ ] Backspace/delete remove text
- [ ] Arrow keys move cursor
- [ ] Home/end move cursor to bounds
- [ ] `@change` fires on enter

### 14.8 Textarea Element

**Element:** `textarea`

```vue
<!-- tests/integration/html/textarea.vue -->
<template>
  <textarea
    v-model="text"
    @change="handleChange"
  ></textarea>
</template>

<script setup>
import { ref } from 'vue'
const text = ref('')
const handleChange = (value) => {
  console.log('Value:', value)
}
</script>

<style scoped>
textarea {
  width: 30;
  height: 10;
}
</style>
```

**Tests:**
- [ ] `textarea` renders multiline text
- [ ] UA `background: grey` applied
- [ ] First line at top
- [ ] Multiple lines render vertically
- [ ] Lines clip at width
- [ ] Content taller than height scrolls
- [ ] Cursor position correct
- [ ] Enter inserts newline
- [ ] Arrow keys navigate correctly
- [ ] `@change` fires

### 14.9 Code Element

**Element:** `code`

```vue
<!-- tests/integration/html/code.vue -->
<template>
  <code>const x = 5;</code>
</template>

<style scoped>
code {
  width: 30;
  height: 1;
  background: grey;
}
</style>
```

**Tests:**
- [ ] `code` renders text
- [ ] Syntax highlighting (if shiki integrated)

---

## Complex Layout Scenarios (INT-LAYOUT)

### 15.1 Sidebar + Content

```vue
<!-- tests/integration/layout/sidebar-content.vue -->
<template>
  <div class="layout">
    <div class="sidebar">
      <div class="item">Item 1</div>
      <div class="item">Item 2</div>
      <div class="item">Item 3</div>
    </div>
    <div class="content">
      <h1>Main Content</h1>
      <p>Content goes here</p>
    </div>
  </div>
</template>

<style scoped>
.layout {
  display: flex;
  width: 80;
  height: 30;
}
.sidebar {
  width: 20;
  background: blue;
  border-right: 1px solid white;
  overflow: scroll;
}
.item {
  width: 20;
  height: 2;
  padding: 1;
  border-bottom: 1px solid white;
}
.content {
  flex: 1;
  padding: 2;
  overflow: scroll;
}
</style>
```

**Tests:**
- [ ] Sidebar fixed width
- [ ] Content fills remaining width (flex)
- [ ] Each portion scrollable independently
- [ ] Text positions correct in each section
- [ ] Borders don't overlap

### 15.2 Grid-Like Layout

```vue
<!-- tests/integration/layout/grid.vue -->
<template>
  <div class="grid">
    <div v-for="i in 9" :key="i" class="cell">{{ i }}</div>
  </div>
</template>

<style scoped>
.grid {
  display: flex;
  flex-wrap: wrap;
  width: 30;
  height: 15;
}
.cell {
  width: 10;
  height: 5;
  background: blue;
  border: 1px solid white;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
```

**Tests:**
- [ ] Flex wrap creates multiple rows
- [ ] Each cell at correct position
- [ ] Gap spacing applied correctly

### 15.3 Deeply Nested Structure

```vue
<!-- tests/integration/layout/deep-nesting.vue -->
<template>
  <div class="l1">
    <div class="l2">
      <div class="l3">
        <div class="l4">
          <div class="l5">Deep content</div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.l1 { padding: 1; background: red; }
.l2 { padding: 1; background: blue; }
.l3 { padding: 1; background: green; }
.l4 { padding: 1; background: yellow; }
.l5 { padding: 1; background: cyan; }
</style>
```

**Tests:**
- [ ] Text at correct absolute position (sum of offsets)
- [ ] Each container's background visible in its region
- [ ] Padding accumulates correctly

---

## Edge Cases (INT-EDGE)

### 16.1 Empty Containers

```vue
<!-- tests/integration/edge/empty.vue -->
<template>
  <div class="box"></div>
</template>

<style scoped>
.box { width: 10; height: 5; background: blue; border: 1px solid white; }
</style>
```

**Tests:**
- [ ] Empty container with background fills area
- [ ] Border renders even with no content
- [ ] Padding still applies

### 16.2 Zero Dimensions

**Tests:**
- [ ] `width: 0; height: 0` → invisible
- [ ] `width: 0` → single-column width (at least border)
- [ ] `height: 0` → single-row height (at least border)

### 16.3 Negative Margins

```vue
<!-- tests/integration/edge/negative-margin.vue -->
<template>
  <div class="a">A</div>
  <div class="b">B</div>
</template>

<style scoped>
.a { width: 10; height: 3; background: blue; }
.b { width: 10; height: 3; background: green; margin-top: -1; }
</style>
```

**Tests:**
- [ ] Negative margin pulls element up/left
- [ ] Overlapping elements render last-wins

### 16.4 Fractional Values

**Tests:**
- [ ] `width: 10.7` → rounded to 11
- [ ] `height: 5.3` → rounded to 5
- [ ] Flex basis with fractions

### 16.5 Very Long Text

```vue
<!-- tests/integration/edge/long-text.vue -->
<template>
  <div class="box">
    This is a very long line of text that exceeds the container width
  </div>
</template>

<style scoped>
.box { width: 20; height: 2; background: blue; }
</style>
```

**Tests:**
- [ ] Text clips at right edge
- [ ] No wrapping (hard clip)
- [ ] No overflow markers

### 16.6 Whitespace Handling

**Tests:**
- [ ] Multiple spaces rendered as-is (no collapsing)
- [ ] Leading/trailing spaces preserved
- [ ] Tabs rendered as single character

### 16.7 Unicode Characters

```vue
<!-- tests/integration/edge/unicode.vue -->
<template>
  <div>Emoji: 😀 Math: ∑ Greek: α β γ</div>
</template>

<style scoped>
div { width: 50; height: 1; }
</style>
```

**Tests:**
- [ ] Unicode renders (if terminal supports)
- [ ] Multi-byte chars positioned correctly
- [ ] Box-drawing chars render in borders

---

## Visibility & Layering (INT-VISIBILITY)

### 17.1 Display: None vs Visibility: Hidden

```vue
<!-- tests/integration/visibility/display-vs-visibility.vue -->
<template>
  <div class="a">A</div>
  <div class="b-hidden">B (hidden)</div>
  <div class="c">C</div>
  <div class="d">D</div>
  <div class="e-none">E (none)</div>
  <div class="f">F</div>
</template>

<style scoped>
div { width: 10; height: 1; background: blue; }
.b-hidden { visibility: hidden; }
.e-none { display: none; }
</style>
```

**Tests:**
- [ ] `visibility: hidden` → invisible but takes space
- [ ] `display: none` → invisible and takes no space

### 17.2 Z-Index Stacking

```vue
<!-- tests/integration/visibility/z-index.vue -->
<template>
  <div class="a">A</div>
  <div class="b">B</div>
  <div class="c">C</div>
</template>

<style scoped>
.a { position: absolute; top: 1; left: 1; width: 10; height: 3; background: red; z-index: 1; }
.b { position: absolute; top: 2; left: 5; width: 10; height: 3; background: green; z-index: 2; }
.c { position: absolute; top: 3; left: 9; width: 10; height: 3; background: blue; z-index: 3; }
</style>
```

**Tests:**
- [ ] Higher z-index renders on top
- [ ] Same z-index: last in tree order wins
- [ ] Negative z-index behind flow content

---

## Vue Integration (INT-VUE)

### 18.1 Reactivity

```vue
<!-- tests/integration/vue/reactivity.vue -->
<template>
  <button @press="increment">Count: {{ count }}</button>
  <div v-if="count > 5">Wow, high count!</div>
</template>

<script setup>
import { ref } from 'vue'
const count = ref(0)
const increment = () => count.value++
</script>

<style scoped>
button { width: 20; height: 1; background: blue; }
div { width: 20; height: 1; background: green; }
</style>
```

**Tests:**
- [ ] `ref()` bindings update render
- [ ] Template expressions evaluate
- [ ] Conditional rendering (v-if)
- [ ] Event handlers fire and update state
- [ ] Computed properties work

### 18.2 List Rendering

```vue
<!-- tests/integration/vue/v-for.vue -->
<template>
  <div class="list">
    <div v-for="item in items" :key="item.id" class="item">
      {{ item.text }}
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
const items = ref([
  { id: 1, text: 'Item 1' },
  { id: 2, text: 'Item 2' },
  { id: 3, text: 'Item 3' },
])
</script>

<style scoped>
.list { width: 20; height: 10; }
.item { width: 20; height: 1; background: blue; }
</style>
```

**Tests:**
- [ ] `v-for` renders list items
- [ ] Items stack vertically
- [ ] Key prop works
- [ ] List updates reactively

### 18.3 V-Model

```vue
<!-- tests/integration/vue/v-model.vue -->
<template>
  <input v-model="text" />
  <p>Value: {{ text }}</p>
</template>

<script setup>
import { ref } from 'vue'
const text = ref('')
</script>

<style scoped>
input { width: 30; height: 1; }
p { width: 30; height: 1; }
</style>
```

**Tests:**
- [ ] `v-model` binds input value
- [ ] Input changes update binding
- [ ] Binding changes update input

### 18.4 Slots & Components

```vue
<!-- tests/integration/vue/components.vue -->
<template>
  <MyComponent :title="title">
    <p>Slot content</p>
  </MyComponent>
</template>

<script setup>
import { ref } from 'vue'
import MyComponent from './MyComponent.vue'
const title = ref('My Component')
</script>

<style scoped>
p { width: 20; height: 1; }
</style>
```

```vue
<!-- tests/integration/vue/MyComponent.vue -->
<template>
  <div class="component">
    <div class="title">{{ title }}</div>
    <slot></slot>
  </div>
</template>

<script setup>
defineProps({
  title: String,
})
</script>

<style scoped>
.component { width: 40; height: 10; border: 1px solid white; }
.title { width: 40; height: 1; background: blue; }
</style>
```

**Tests:**
- [ ] Props pass through
- [ ] Slots render child content
- [ ] Nested components position correctly

---

## Special Cases (INT-SPECIAL)

### 19.1 Router Integration (if applicable)

Tests for routes, navigation, etc.

### 19.2 Store Integration (if applicable)

Tests for state management bindings.

### 19.3 Keyboard Shortcuts

**Tests:**
- [ ] `useKeys()` shortcut binding
- [ ] Multiple shortcuts per component
- [ ] Shortcut modifiers (Shift, Ctrl)

### 19.4 Screen Resize Handling

**Tests:**
- [ ] Layout reflows on terminal resize
- [ ] Elements maintain proportions
- [ ] Text clipping adjusts

---

## Performance Baselines (INT-PERF)

These are measured, not tested, but documented:

- [ ] Medium app (80×24, ~60 nodes) renders in < 5ms
- [ ] Large app (220×50, ~200 nodes) renders in < 15ms
- [ ] No memory leaks over 1000 render cycles

---

## Summary of Test Artifacts

For each section above, the integration test suite should contain:

```
tests/integration/
├── color/
│   ├── spec.md
│   ├── named-colors.test.ts
│   ├── named-colors.vue
│   ├── hex-colors.test.ts
│   ├── hex-colors.vue
│   └── ...
├── typography/
│   ├── spec.md
│   ├── text-alignment.test.ts
│   ├── text-alignment.vue
│   ├── vertical-alignment.test.ts
│   ├── vertical-alignment.vue
│   └── ...
├── spacing/
│   ├── padding-uniform.test.ts
│   ├── padding-uniform.vue
│   ├── margin-uniform.test.ts
│   ├── margin-uniform.vue
│   └── ...
├── border/
│   ├── border-line.test.ts
│   ├── border-line.vue
│   ├── border-heavy.test.ts
│   └── ...
├── dimensions/
│   ├── fixed.test.ts
│   ├── percentage.test.ts
│   ├── calc.test.ts
│   └── ...
├── display/
│   ├── block.test.ts
│   ├── flex-row.test.ts
│   ├── flex-column.test.ts
│   ├── none.test.ts
│   └── ...
├── flexbox/
│   ├── flex-direction.test.ts
│   ├── justify-content.test.ts
│   ├── align-items.test.ts
│   ├── gap.test.ts
│   ├── flex-shorthand.test.ts
│   ├── align-self.test.ts
│   └── ...
├── position/
│   ├── relative.test.ts
│   ├── absolute.test.ts
│   └── ...
├── overflow/
│   ├── hidden.test.ts
│   ├── scroll.test.ts
│   └── ...
├── pseudo/
│   ├── hover.test.ts
│   ├── focus.test.ts
│   ├── active.test.ts
│   └── ...
├── nesting/
│   ├── nested-selectors.test.ts
│   ├── ampersand.test.ts
│   └── ...
├── html/
│   ├── containers.test.ts
│   ├── headings.test.ts
│   ├── paragraphs.test.ts
│   ├── lists.test.ts
│   ├── anchor.test.ts
│   ├── button.test.ts
│   ├── input.test.ts
│   ├── textarea.test.ts
│   ├── code.test.ts
│   └── ...
├── layout/
│   ├── sidebar-content.test.ts
│   ├── grid.test.ts
│   ├── deep-nesting.test.ts
│   └── ...
├── edge/
│   ├── empty.test.ts
│   ├── zero-dimensions.test.ts
│   ├── negative-margin.test.ts
│   ├── long-text.test.ts
│   └── ...
├── visibility/
│   ├── display-vs-visibility.test.ts
│   ├── z-index.test.ts
│   └── ...
├── vue/
│   ├── reactivity.test.ts
│   ├── v-for.test.ts
│   ├── v-model.test.ts
│   ├── components.test.ts
│   ├── MyComponent.vue
│   └── ...
├── special/
│   ├── keyboard.test.ts
│   ├── resize.test.ts
│   └── ...
└── helpers.ts  (shared test utilities)
```

---

## Testing Approach

Each `.test.ts` file should:

1. **Import** the SFC fixture and helper functions
2. **Render** the SFC through the full pipeline (or use renderCSS helper)
3. **Verify** exact cell properties at specific coordinates
4. **Check** borders, colors, text placement, clipping, scrolling, etc.
5. **Assert** no unexpected cells were modified
6. **Document** what pipeline stage is being tested

Example test structure:

```typescript
import { test, expect, describe } from 'bun:test'
import { renderSFC } from '../helpers'

describe('Text Alignment', () => {
  test('text-align: left aligns text to left edge', async () => {
    const buf = await renderSFC(import('./text-alignment.vue'))

    // Check left-aligned text at (0, 0)
    expect(buf.getCell(0, 0)?.char).toBe('L')
    expect(buf.getCell(1, 0)?.char).toBe('e')

    // Check centered text is offset
    expect(buf.getCell(15, 1)?.char).toBe('C') // Center position

    // Check right-aligned text
    expect(buf.getCell(29, 2)?.char).toBe('h') // Right edge
  })
})
```

---

## Acceptance Criteria

This integration test suite is **complete** when:

- [ ] All 19 sections have >= 1 test (minimum 19 test files)
- [ ] All CSS properties from `css-compliance/spec.md` covered
- [ ] All HTML elements from `html-compliance/spec.md` covered
- [ ] All rendering scenarios from `render-correctness/spec.md` covered
- [ ] 100+ integration tests total
- [ ] Each test verifies end-to-end (SFC → rendered output)
- [ ] Each test checks exact cell properties (char, color, background, bold, etc.)
- [ ] Edge cases identified and covered
- [ ] All tests pass with zero regressions
- [ ] Performance baselines established

---

## Next Steps

1. **Review this spec** — identify gaps or corrections needed
2. **Build test infrastructure** — shared helpers, utilities, assertion patterns
3. **Implement tests incrementally** — start with high-value features (color, flexbox, text)
4. **Validate coverage** — ensure every feature is exercised
5. **Profile performance** — measure real-world rendering latency
6. **Document results** — final coverage report

