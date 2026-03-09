/**
 * CSS Compliance — Full Render Spec (Visual Truth Layer)
 * spec.md § all
 *
 * This file is the visual truth layer. Every test runs the FULL pipeline:
 *   CSS → layout engine → buffer renderer → ScreenBuffer cell assertions
 *
 * Purpose: prevent drift between what CSS says and what actually appears on
 * screen. Parser and layout tests can both pass while the renderer silently
 * discards a style. These tests catch that class of bug.
 *
 * Each scenario asserts exact characters AND styles at exact cell coordinates.
 *
 * Test structure:
 *   - Background fills (colors)
 *   - Text placement
 *   - Text alignment
 *   - Typography (bold, underline)
 *   - Borders (chars + colors)
 *   - Box model (padding + border + margin interact correctly)
 *   - Flex layout (final positions)
 *   - Display: none (nothing rendered)
 *   - Nested layouts
 *   - Full component-like scenarios
 */

import { test, expect, describe } from 'bun:test'
import { h, renderCSS, rowSlice, cellColor, cellBg, expectRegionBg } from './helpers'

// ─── Background fills ─────────────────────────────────────────────────────────

describe('render: background fills', () => {
  test('solid background fills exact bounds — all four corners', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 4; background: blue; }`,
      h('div', { class: 'box' })
    )
    expect(cellBg(buf, 0, 0)).toBe('blue')   // top-left
    expect(cellBg(buf, 9, 0)).toBe('blue')   // top-right
    expect(cellBg(buf, 0, 3)).toBe('blue')   // bottom-left
    expect(cellBg(buf, 9, 3)).toBe('blue')   // bottom-right
    expect(cellBg(buf, 10, 0)).toBeNull()    // one past right edge
    expect(cellBg(buf, 0, 4)).toBeNull()     // one past bottom edge
  })

  test('hex color fills exact region', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 2; background: #ff0000; }`,
      h('div', { class: 'box' })
    )
    expectRegionBg(buf, 0, 0, 5, 2, '#ff0000')
  })

  test('two side-by-side boxes fill distinct non-overlapping regions', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; width: 20; height: 3; }
       .a { width: 10; height: 3; background: red; }
       .b { width: 10; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    expectRegionBg(buf, 0, 0, 10, 3, 'red')
    expectRegionBg(buf, 10, 0, 10, 3, 'blue')
  })

  test('background fills behind text characters', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; background: cyan; }`,
      h('div', { class: 'box' }, 'Hello')
    )
    // bg should appear on text cells too
    expect(cellBg(buf, 0, 0)).toBe('cyan')
    expect(cellBg(buf, 4, 0)).toBe('cyan')
  })
})

// ─── Text content placement ───────────────────────────────────────────────────

describe('render: text placement', () => {
  test('text appears at (0,0) by default', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 3; }`,
      h('div', { class: 'box' }, 'Hello')
    )
    expect(rowSlice(buf, 0, 0, 5)).toBe('Hello')
  })

  test('text clipped to content width', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 3; }`,
      h('div', { class: 'box' }, 'Hello World')
    )
    expect(rowSlice(buf, 0, 0, 5)).toBe('Hello')
    expect(buf.getCell(5, 0)?.char).toBe(' ')
  })

  test('text with padding starts at (paddingLeft, paddingTop)', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 10; padding: 2; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    expect(rowSlice(buf, 2, 2, 2)).toBe('Hi')
    expect(buf.getCell(0, 0)?.char).toBe(' ')  // padding area
    expect(buf.getCell(2, 1)?.char).toBe(' ')  // still padding (y=1, before content row)
  })

  test('text inside border starts at (1,1)', async () => {
    const buf = await renderCSS(
      `.box { width: 15; height: 5; border: 1px solid white; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    // content area starts at (1,1) inside border
    expect(rowSlice(buf, 1, 1, 2)).toBe('Hi')
  })

  test('multiline text (\\n) places lines on consecutive rows', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 5; }`,
      h('div', { class: 'box' }, 'Line1\nLine2')
    )
    expect(rowSlice(buf, 0, 0, 5)).toBe('Line1')
    expect(rowSlice(buf, 1, 0, 5)).toBe('Line2')
  })
})

// ─── Text alignment ───────────────────────────────────────────────────────────

describe('render: text-align', () => {
  test('left: "AB" starts at x=0 in 10-wide box', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; text-align: left; }`,
      h('div', { class: 'box' }, 'AB')
    )
    expect(buf.getCell(0, 0)?.char).toBe('A')
    expect(buf.getCell(1, 0)?.char).toBe('B')
  })

  test('center: "AB" centered in 10-wide box → x=4', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; text-align: center; }`,
      h('div', { class: 'box' }, 'AB')
    )
    // Math.floor((10 - 2) / 2) = 4
    expect(buf.getCell(4, 0)?.char).toBe('A')
    expect(buf.getCell(5, 0)?.char).toBe('B')
    expect(buf.getCell(3, 0)?.char).toBe(' ')
  })

  test('right: "AB" flush right in 10-wide box → x=8', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 2; text-align: right; }`,
      h('div', { class: 'box' }, 'AB')
    )
    expect(buf.getCell(8, 0)?.char).toBe('A')
    expect(buf.getCell(9, 0)?.char).toBe('B')
    expect(buf.getCell(7, 0)?.char).toBe(' ')
  })

  test('center in bordered box: content area is width-2', async () => {
    // Box: width=12, border=1 → content width=10, content starts at x=1
    // "AB" centered in 10: offset=4 → text at x=1+4=5
    const buf = await renderCSS(
      `.box { width: 12; height: 3; border: 1px solid white; text-align: center; }`,
      h('div', { class: 'box' }, 'AB')
    )
    expect(buf.getCell(5, 1)?.char).toBe('A')
    expect(buf.getCell(6, 1)?.char).toBe('B')
  })

  test('right in padded box: text flush to right of content area', async () => {
    // Box: width=14, padding-left=2, padding-right=2 → content width=10
    // "AB" right-aligned: starts at x=2+(10-2)=10
    const buf = await renderCSS(
      `.box { width: 14; height: 3; padding-left: 2; padding-right: 2; text-align: right; }`,
      h('div', { class: 'box' }, 'AB')
    )
    expect(buf.getCell(10, 0)?.char).toBe('A')
    expect(buf.getCell(11, 0)?.char).toBe('B')
  })
})

// ─── Typography (cell flags) ──────────────────────────────────────────────────

describe('render: typography cell flags', () => {
  test('color: red sets color field on every character cell', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; color: red; }`,
      h('div', { class: 'box' }, 'Hello')
    )
    for (let x = 0; x < 5; x++) {
      expect(buf.getCell(x, 0)?.color).toBe('red')
    }
  })

  test('font-weight: bold sets bold=true on all text cells', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; font-weight: bold; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    expect(buf.getCell(0, 0)?.bold).toBe(true)
    expect(buf.getCell(1, 0)?.bold).toBe(true)
  })

  test('text-decoration: underline sets underline=true on all text cells', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; text-decoration: underline; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    expect(buf.getCell(0, 0)?.underline).toBe(true)
    expect(buf.getCell(1, 0)?.underline).toBe(true)
  })

  test('color + bold + underline all applied simultaneously', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 1; color: cyan; font-weight: bold; text-decoration: underline; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    const cell = buf.getCell(0, 0)
    expect(cell?.color).toBe('cyan')
    expect(cell?.bold).toBe(true)
    expect(cell?.underline).toBe(true)
  })
})

// ─── Borders (exact chars + colors) ──────────────────────────────────────────

describe('render: border exact characters', () => {
  test('line border: exact chars at all four corners and edges', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )
    // Corners
    expect(buf.getCell(0, 0)?.char).toBe('┌')
    expect(buf.getCell(9, 0)?.char).toBe('┐')
    expect(buf.getCell(0, 4)?.char).toBe('└')
    expect(buf.getCell(9, 4)?.char).toBe('┘')
    // Top/bottom edges (sample)
    expect(buf.getCell(1, 0)?.char).toBe('─')
    expect(buf.getCell(8, 0)?.char).toBe('─')
    expect(buf.getCell(1, 4)?.char).toBe('─')
    // Left/right edges (sample)
    expect(buf.getCell(0, 1)?.char).toBe('│')
    expect(buf.getCell(9, 2)?.char).toBe('│')
  })

  test('double border: exact chars at corners', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border-width: 1; border-style: double; }`,
      h('div', { class: 'box' })
    )
    expect(buf.getCell(0, 0)?.char).toBe('╔')
    expect(buf.getCell(9, 0)?.char).toBe('╗')
    expect(buf.getCell(0, 4)?.char).toBe('╚')
    expect(buf.getCell(9, 4)?.char).toBe('╝')
    expect(buf.getCell(1, 0)?.char).toBe('═')
    expect(buf.getCell(0, 1)?.char).toBe('║')
  })

  test('border color applied to all border cells', async () => {
    const buf = await renderCSS(
      `.box { width: 8; height: 4; border: 1px solid cyan; }`,
      h('div', { class: 'box' })
    )
    // Corners, edges
    expect(buf.getCell(0, 0)?.color).toBe('cyan')
    expect(buf.getCell(7, 0)?.color).toBe('cyan')
    expect(buf.getCell(0, 3)?.color).toBe('cyan')
    expect(buf.getCell(7, 3)?.color).toBe('cyan')
    expect(buf.getCell(3, 0)?.color).toBe('cyan')   // top edge
    expect(buf.getCell(0, 2)?.color).toBe('cyan')   // left edge
  })

  test('border does not bleed into content area', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1px solid white; background: blue; }`,
      h('div', { class: 'box' }, 'X')
    )
    // (1,1) is content — should have bg blue, not border char
    expect(buf.getCell(1, 1)?.char).toBe('X')
    expect(buf.getCell(0, 0)?.char).toBe('┌')       // border
  })
})

// ─── Box model (padding + border + margin) ────────────────────────────────────

describe('render: box model composition', () => {
  test('padding offsets content inside background region', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 10; padding: 2; background: blue; }`,
      h('div', { class: 'box' }, 'A')
    )
    // Background covers full box
    expect(cellBg(buf, 0, 0)).toBe('blue')
    expect(cellBg(buf, 19, 9)).toBe('blue')
    // Content 'A' at (2, 2)
    expect(buf.getCell(2, 2)?.char).toBe('A')
    // Padding area has bg but no text
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })

  test('border + padding: content starts at (border+paddingLeft, border+paddingTop)', async () => {
    // border=1, padding=2 → content at (3, 3)
    const buf = await renderCSS(
      `.box { width: 20; height: 12; border: 1px solid white; padding: 2; }`,
      h('div', { class: 'box' }, 'A')
    )
    expect(buf.getCell(3, 3)?.char).toBe('A')
    // Verify border at (0,0)
    expect(buf.getCell(0, 0)?.char).toBe('┌')
  })

  test('padding-top: 3, padding-left: 5 → content at (5, 3)', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 10; padding-top: 3; padding-left: 5; background: blue; }`,
      h('div', { class: 'box' }, 'Hi')
    )
    expect(buf.getCell(5, 3)?.char).toBe('H')
    expect(buf.getCell(6, 3)?.char).toBe('i')
    expect(buf.getCell(4, 3)?.char).toBe(' ')   // padding, not content
  })

  test('margin-top: 4 → element starts at y=4', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 3; margin-top: 4; background: red; }`,
      h('div', { class: 'box' })
    )
    expect(cellBg(buf, 0, 4)).toBe('red')
    expect(cellBg(buf, 0, 3)).toBeNull()
  })
})

// ─── Flexbox layout positions ─────────────────────────────────────────────────

describe('render: flex layout final positions', () => {
  test('flex: 1 fills exact remaining width', async () => {
    // fixed=8, remaining=12; grow item fills exactly cols 8-19
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; width: 20; height: 3; }
       .fixed { width: 8; height: 3; background: red; }
       .grow  { flex: 1; height: 3; background: blue; }`,
      h('div', { class: 'p' },
        h('div', { class: 'fixed' }),
        h('div', { class: 'grow' })
      )
    )
    expectRegionBg(buf, 0, 0, 8, 3, 'red')
    expectRegionBg(buf, 8, 0, 12, 3, 'blue')
  })

  test('justify-content: space-between puts items at edges', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; justify-content: space-between; width: 20; height: 3; }
       .a { width: 4; height: 3; background: red; }
       .b { width: 4; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    expectRegionBg(buf, 0, 0, 4, 3, 'red')
    expectRegionBg(buf, 16, 0, 4, 3, 'blue')
  })

  test('gap: 3 between two items', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; gap: 3; width: 20; height: 3; }
       .a { width: 5; height: 3; background: red; }
       .b { width: 5; height: 3; background: blue; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }), h('div', { class: 'b' }))
    )
    expectRegionBg(buf, 0, 0, 5, 3, 'red')
    // gap: 3 → cols 5,6,7 are empty
    expect(cellBg(buf, 5, 0)).toBeNull()
    expect(cellBg(buf, 7, 0)).toBeNull()
    expectRegionBg(buf, 8, 0, 5, 3, 'blue')
  })

  test('align-items: center vertically centers items in row container', async () => {
    const buf = await renderCSS(
      `.p { display: flex; flex-direction: row; align-items: center; width: 20; height: 10; }
       .a { width: 5; height: 2; background: red; }`,
      h('div', { class: 'p' }, h('div', { class: 'a' }))
    )
    // 2-tall in 10-tall: centered at y=4,5
    expectRegionBg(buf, 0, 4, 5, 2, 'red')
    expect(cellBg(buf, 0, 3)).toBeNull()
    expect(cellBg(buf, 0, 6)).toBeNull()
  })
})

// ─── display: none ────────────────────────────────────────────────────────────

describe('render: display: none', () => {
  test('no cells rendered for hidden element', async () => {
    const buf = await renderCSS(
      `.box { display: none; width: 20; height: 5; background: red; color: white; }`,
      h('div', { class: 'box' }, 'Hidden')
    )
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 20; x++) {
        expect(cellBg(buf, x, y)).not.toBe('red')
        expect(cellColor(buf, x, y)).not.toBe('white')
      }
    }
  })

  test('sibling after hidden element renders at correct position', async () => {
    const buf = await renderCSS(
      `.container { display: flex; flex-direction: column; width: 20; height: 10; }
       .gone    { display: none; height: 5; }
       .sibling { width: 10; height: 3; background: blue; }`,
      h('div', { class: 'container' },
        h('div', { class: 'gone' }),
        h('div', { class: 'sibling' })
      )
    )
    // Sibling starts at y=0 — the hidden element takes no space
    expect(cellBg(buf, 0, 0)).toBe('blue')
  })
})

// ─── Nested layouts ────────────────────────────────────────────────────────────

describe('render: nested layouts', () => {
  test('child inside flex parent renders at correct absolute position', async () => {
    const buf = await renderCSS(
      `.outer { display: flex; flex-direction: row; width: 40; height: 10; }
       .left  { width: 20; height: 10; background: red; }
       .right { display: flex; flex-direction: column; width: 20; height: 10; }
       .top   { width: 20; height: 5; background: blue; }
       .bot   { width: 20; height: 5; background: green; }`,
      h('div', { class: 'outer' },
        h('div', { class: 'left' }),
        h('div', { class: 'right' },
          h('div', { class: 'top' }),
          h('div', { class: 'bot' })
        )
      )
    )
    expectRegionBg(buf, 0, 0, 20, 10, 'red')
    expectRegionBg(buf, 20, 0, 20, 5, 'blue')
    expectRegionBg(buf, 20, 5, 20, 5, 'green')
  })

  test('grandchild text renders at correct absolute coords', async () => {
    const buf = await renderCSS(
      `.outer { display: flex; flex-direction: row; width: 40; height: 5; }
       .pad   { width: 10; height: 5; }
       .inner { width: 30; height: 5; padding-left: 2; padding-top: 1; }`,
      h('div', { class: 'outer' },
        h('div', { class: 'pad' }),
        h('div', { class: 'inner' }, 'Hi')
      )
    )
    // inner starts at x=10, padding-left=2 → content at x=12
    // padding-top=1 → content at y=1
    expect(buf.getCell(12, 1)?.char).toBe('H')
    expect(buf.getCell(13, 1)?.char).toBe('i')
  })
})

// ─── Full component scenarios ─────────────────────────────────────────────────

describe('render: full component scenarios', () => {
  test('card: border + bg + padded text', async () => {
    // A typical card: 20-wide, 5-tall, line border, blue bg, white text, padding 1
    const buf = await renderCSS(
      `.card {
        width: 20; height: 5;
        border: 1px solid white;
        background: blue;
        padding: 1;
        color: white;
       }`,
      h('div', { class: 'card' }, 'Hello')
    )
    // Border corners
    expect(buf.getCell(0, 0)?.char).toBe('┌')
    expect(buf.getCell(19, 0)?.char).toBe('┐')
    expect(buf.getCell(0, 4)?.char).toBe('└')
    expect(buf.getCell(19, 4)?.char).toBe('┘')
    // Background inside border (but not on border cells)
    expect(cellBg(buf, 1, 1)).toBe('blue')
    expect(cellBg(buf, 18, 3)).toBe('blue')
    // Content: border=1, padding=1 → content at (2, 2)
    expect(buf.getCell(2, 2)?.char).toBe('H')
    expect(buf.getCell(2, 2)?.color).toBe('white')
  })

  test('toolbar: flex row with center-aligned label', async () => {
    const buf = await renderCSS(
      `.bar   { display: flex; flex-direction: row; width: 40; height: 1; background: grey; }
       .label { flex: 1; height: 1; text-align: center; color: white; }`,
      h('div', { class: 'bar' },
        h('div', { class: 'label' }, 'VTerm')
      )
    )
    // label fills full width, "VTerm" (5 chars) centered in 40 → offset 17
    // Math.floor((40 - 5) / 2) = 17
    expect(buf.getCell(17, 0)?.char).toBe('V')
    expect(buf.getCell(18, 0)?.char).toBe('T')
    expect(buf.getCell(21, 0)?.char).toBe('m')
    expect(buf.getCell(17, 0)?.color).toBe('white')
  })

  test('split pane: two flex children side by side, different colors', async () => {
    const buf = await renderCSS(
      `.layout { display: flex; flex-direction: row; width: 30; height: 10; }
       .pane-a { flex: 1; height: 10; background: #111111; }
       .pane-b { flex: 1; height: 10; background: #222222; }`,
      h('div', { class: 'layout' },
        h('div', { class: 'pane-a' }),
        h('div', { class: 'pane-b' })
      )
    )
    // Each pane = 15 cols
    expectRegionBg(buf, 0, 0, 15, 10, '#111111')
    expectRegionBg(buf, 15, 0, 15, 10, '#222222')
  })
})
