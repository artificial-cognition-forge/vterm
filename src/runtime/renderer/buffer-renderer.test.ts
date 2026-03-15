/**
 * Buffer Renderer Tests
 *
 * Tests the final rendering stage: LayoutNode tree → ScreenBuffer (character grid).
 * No TTY required — renders to an in-memory buffer and asserts cell content.
 *
 * Pattern:
 *   1. Build VNode tree with h()
 *   2. Apply CSS via styles Map
 *   3. Run layout engine (computeLayout)
 *   4. Run buffer renderer (render)
 *   5. Assert buffer.getCell(x, y) has correct char / color
 */

import { test, expect, describe } from 'bun:test'
import { h } from 'vue'
import { createLayoutEngine } from '../../core/layout'
import type { LayoutProperties } from '../../core/layout/types'
import { ScreenBuffer } from '../terminal/buffer'
import { BufferRenderer } from './buffer-renderer'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Build a rendered buffer from VNodes + styles. */
function render(
  width: number,
  height: number,
  vnode: ReturnType<typeof h>,
  styles: Record<string, LayoutProperties> = {}
) {
  const engine = createLayoutEngine(width, height)
  const stylesMap = new Map(Object.entries(styles))
  const tree = engine.buildLayoutTree(vnode, stylesMap)
  engine.computeLayout(tree)

  const buffer = new ScreenBuffer(width, height)
  const renderer = new BufferRenderer()
  renderer.render(tree, buffer)
  return buffer
}

/** Extract a row of characters from the buffer as a plain string. */
function rowChars(buffer: ScreenBuffer, y: number): string {
  let row = ''
  for (let x = 0; x < buffer.width; x++) {
    row += buffer.getCell(x, y)?.char ?? ' '
  }
  return row
}

/** Extract a substring of characters from a row. */
function rowSlice(buffer: ScreenBuffer, y: number, x: number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += buffer.getCell(x + i, y)?.char ?? ' '
  }
  return s
}

// ─── Text rendering ───────────────────────────────────────────────────────────

describe('BufferRenderer — text', () => {
  test('renders text content at the correct position', () => {
    const buf = render(20, 5, h('div', { class: 'box' }, 'Hello'), {
      '.box': { width: 20, height: 1 },
    })

    expect(rowSlice(buf, 0, 0, 5)).toBe('Hello')
  })

  test('respects padding when positioning text', () => {
    const buf = render(20, 5, h('div', { class: 'box' }, 'Hi'), {
      '.box': { width: 20, height: 3, padding: { top: 1, left: 2, right: 0, bottom: 0 } },
    })

    // Text should be at x=2, y=1 (padding left=2, padding top=1)
    expect(rowSlice(buf, 1, 2, 2)).toBe('Hi')
  })

  test('applies foreground color to text', () => {
    const buf = render(10, 1, h('div', { class: 'box' }, 'Hi'), {
      '.box': { width: 10, height: 1, visualStyles: { fg: 'cyan' } },
    })

    expect(buf.getCell(0, 0)?.color).toBe('cyan')
  })

  test('applies background color to container', () => {
    const buf = render(10, 3, h('div', { class: 'box' }), {
      '.box': { width: 10, height: 3, visualStyles: { bg: 'blue' } },
    })

    expect(buf.getCell(0, 0)?.background).toBe('blue')
    expect(buf.getCell(5, 1)?.background).toBe('blue')
  })

  test('clips text to container width', () => {
    // buffer is 10 wide, box is 5 wide — text beyond box width should not appear
    const buf = render(10, 1, h('div', { class: 'box' }, '123456789'), {
      '.box': { width: 5, height: 1 },
    })

    expect(rowSlice(buf, 0, 0, 5)).toBe('12345')
    // characters past the 5-char box boundary should be blank
    expect(buf.getCell(5, 0)?.char).toBe(' ')
  })

  test('renders multiline text', () => {
    const buf = render(10, 3, h('div', { class: 'box' }, 'line1\nline2\nline3'), {
      '.box': { width: 10, height: 3 },
    })

    expect(rowSlice(buf, 0, 0, 5)).toBe('line1')
    expect(rowSlice(buf, 1, 0, 5)).toBe('line2')
    expect(rowSlice(buf, 2, 0, 5)).toBe('line3')
  })
})

// ─── Border rendering ─────────────────────────────────────────────────────────

describe('BufferRenderer — borders', () => {
  test('renders a line border around a box', () => {
    const buf = render(10, 5, h('div', { class: 'box' }), {
      '.box': {
        width: 10, height: 5,
        border: { width: 1 },
        borderType: 'line',
      },
    })

    // Corners
    expect(buf.getCell(0, 0)?.char).toBe('┌')
    expect(buf.getCell(9, 0)?.char).toBe('┐')
    expect(buf.getCell(0, 4)?.char).toBe('└')
    expect(buf.getCell(9, 4)?.char).toBe('┘')

    // Top edge
    expect(buf.getCell(1, 0)?.char).toBe('─')
    // Left edge
    expect(buf.getCell(0, 1)?.char).toBe('│')
    // Right edge
    expect(buf.getCell(9, 1)?.char).toBe('│')
    // Bottom edge
    expect(buf.getCell(1, 4)?.char).toBe('─')
  })

  test('renders a double border', () => {
    const buf = render(10, 5, h('div', { class: 'box' }), {
      '.box': {
        width: 10, height: 5,
        border: { width: 1, type: 'double' },
      },
    })

    expect(buf.getCell(0, 0)?.char).toBe('╔')
    expect(buf.getCell(9, 0)?.char).toBe('╗')
    expect(buf.getCell(0, 4)?.char).toBe('╚')
    expect(buf.getCell(9, 4)?.char).toBe('╝')
    expect(buf.getCell(1, 0)?.char).toBe('═')
    expect(buf.getCell(0, 1)?.char).toBe('║')
  })

  test('renders a heavy border', () => {
    const buf = render(8, 4, h('div', { class: 'box' }), {
      '.box': { width: 8, height: 4, border: { width: 1, type: 'heavy' } },
    })

    expect(buf.getCell(0, 0)?.char).toBe('┏')
    expect(buf.getCell(7, 0)?.char).toBe('┓')
    expect(buf.getCell(0, 3)?.char).toBe('┗')
    expect(buf.getCell(7, 3)?.char).toBe('┛')
  })

  test('renders an ascii border', () => {
    const buf = render(8, 4, h('div', { class: 'box' }), {
      '.box': { width: 8, height: 4, border: { width: 1, type: 'ascii' } },
    })

    expect(buf.getCell(0, 0)?.char).toBe('+')
    expect(buf.getCell(7, 0)?.char).toBe('+')
    expect(buf.getCell(1, 0)?.char).toBe('-')
    expect(buf.getCell(0, 1)?.char).toBe('|')
  })

  test('applies border color', () => {
    const buf = render(10, 3, h('div', { class: 'box' }), {
      '.box': {
        width: 10, height: 3,
        border: { width: 1, fg: 'red' },
        borderType: 'line',
      },
    })

    expect(buf.getCell(0, 0)?.color).toBe('red')
  })
})

// ─── Layout positioning ───────────────────────────────────────────────────────

describe('BufferRenderer — flex layout positioning', () => {
  test('renders two flex children side by side (row)', () => {
    const buf = render(20, 1,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }, 'AAA'),
        h('div', { class: 'b' }, 'BBB'),
      ]),
      {
        '.row': { width: 20, height: 1, display: 'flex', flexDirection: 'row' },
        '.a': { width: 5, height: 1 },
        '.b': { width: 5, height: 1 },
      }
    )

    expect(rowSlice(buf, 0, 0, 3)).toBe('AAA')
    expect(rowSlice(buf, 0, 5, 3)).toBe('BBB')
  })

  test('renders two flex children stacked (column)', () => {
    const buf = render(10, 4,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }, 'AAA'),
        h('div', { class: 'b' }, 'BBB'),
      ]),
      {
        '.col': { width: 10, height: 4, display: 'flex', flexDirection: 'column' },
        '.a': { width: 10, height: 1 },
        '.b': { width: 10, height: 1 },
      }
    )

    expect(rowSlice(buf, 0, 0, 3)).toBe('AAA')
    expect(rowSlice(buf, 1, 0, 3)).toBe('BBB')
  })

  test('gap separates flex children', () => {
    const buf = render(15, 1,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }, 'AA'),
        h('div', { class: 'b' }, 'BB'),
      ]),
      {
        '.row': { width: 15, height: 1, display: 'flex', flexDirection: 'row', gap: 3 },
        '.a': { width: 2, height: 1 },
        '.b': { width: 2, height: 1 },
      }
    )

    expect(rowSlice(buf, 0, 0, 2)).toBe('AA')
    // gap of 3 means BB starts at x=5
    expect(rowSlice(buf, 0, 5, 2)).toBe('BB')
  })

  test('flex-column divs without explicit width render content (stretch default)', () => {
    // Regression: before fix, divs in flex-column had width=0 because alignItems
    // defaulted to flex-start instead of stretch. Text was invisible.
    const buf = render(20, 4,
      h('div', { class: 'col' }, [
        h('div', {}, 'Hello'),
        h('div', {}, 'World'),
      ]),
      {
        '.col': { width: 20, height: 4, display: 'flex', flexDirection: 'column' },
        // Note: NO explicit width on children — they should stretch to fill container
      }
    )

    // If width=0, text would never render. These assertions verify the bug is fixed.
    expect(rowSlice(buf, 0, 0, 5)).toBe('Hello')
    expect(rowSlice(buf, 1, 0, 5)).toBe('World')
  })

  test('flex-column containing flex-row: grandchildren render at correct positions', () => {
    // Regression: a flex-row inside a flex-column had its children computed with
    // containerWidth=0 (the pre-stretch width). After the outer flex-column expanded
    // the nav to full width, the nav's own children kept width=0 and were invisible.
    //
    // Structure: .outer(flex-col) → nav(flex-row) → a a a
    const buf = render(20, 4,
      h('div', { class: 'outer' }, [
        h('nav', { class: 'nav' }, [
          h('a', {}, 'X'),
          h('a', {}, 'Y'),
          h('a', {}, 'Z'),
        ]),
      ]),
      {
        '.outer': { width: 20, height: 4, display: 'flex', flexDirection: 'column' },
        '.nav': { display: 'flex' },
      }
    )

    // All three links must appear on row 0
    expect(buf.getCell(0, 0)?.char).toBe('X')
    expect(buf.getCell(1, 0)?.char).toBe('Y')
    expect(buf.getCell(2, 0)?.char).toBe('Z')
  })

  test('flex-row containing flex-column with flex-grow: grandchildren render correctly', () => {
    // A flex-column child inside a flex-row needs flex-grow:1 (or explicit width) to
    // receive its width from the parent. Once the parent assigns width via flex-grow,
    // relayoutSubtreeChildren re-runs the column's children with the final width.
    const buf = render(20, 6,
      h('div', { class: 'outer' }, [
        h('div', { class: 'col' }, [
          h('div', {}, 'A'),
          h('div', {}, 'B'),
        ]),
      ]),
      {
        '.outer': { width: 20, height: 6, display: 'flex', flexDirection: 'row' },
        '.col': { display: 'flex', flexDirection: 'column', flexGrow: 1 },
      }
    )

    expect(buf.getCell(0, 0)?.char).toBe('A')
    expect(buf.getCell(0, 1)?.char).toBe('B')
  })
})

// ─── Visual styles ────────────────────────────────────────────────────────────

describe('BufferRenderer — visual styles', () => {
  test('applies bold to text cells', () => {
    const buf = render(10, 1, h('div', { class: 'box' }, 'Hi'), {
      '.box': { width: 10, height: 1, visualStyles: { bold: true } },
    })

    expect(buf.getCell(0, 0)?.bold).toBe(true)
    expect(buf.getCell(1, 0)?.bold).toBe(true)
  })

  test('applies underline to text cells', () => {
    const buf = render(10, 1, h('div', { class: 'box' }, 'Hi'), {
      '.box': { width: 10, height: 1, visualStyles: { underline: true } },
    })

    expect(buf.getCell(0, 0)?.underline).toBe(true)
  })

  test('fg and bg both apply to the same cell', () => {
    const buf = render(10, 1, h('div', { class: 'box' }, 'X'), {
      '.box': { width: 10, height: 1, visualStyles: { fg: 'red', bg: 'blue' } },
    })

    const cell = buf.getCell(0, 0)
    expect(cell?.color).toBe('red')
    expect(cell?.background).toBe('blue')
  })

  test('background fills entire box including empty cells', () => {
    const buf = render(10, 3, h('div', { class: 'box' }), {
      '.box': { width: 10, height: 3, visualStyles: { bg: 'green' } },
    })

    // All cells in the box should have green background
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 10; x++) {
        expect(buf.getCell(x, y)?.background).toBe('green')
      }
    }
  })

  test('child background overrides parent background at child position', () => {
    const buf = render(10, 3,
      h('div', { class: 'parent' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.parent': { width: 10, height: 3, display: 'flex', visualStyles: { bg: 'blue' } },
        '.child': { width: 4, height: 1, visualStyles: { bg: 'red' } },
      }
    )

    // Child area should be red
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(3, 0)?.background).toBe('red')
    // Beyond child width, parent bg applies
    expect(buf.getCell(4, 0)?.background).toBe('blue')
    // Row 1 is parent only
    expect(buf.getCell(0, 1)?.background).toBe('blue')
  })

  test('hex color is passed through to cells', () => {
    const buf = render(5, 1, h('div', { class: 'box' }, 'Hi'), {
      '.box': { width: 5, height: 1, visualStyles: { fg: '#ff6600' } },
    })

    expect(buf.getCell(0, 0)?.color).toBe('#ff6600')
  })
})

// ─── display:none ─────────────────────────────────────────────────────────────

describe('BufferRenderer — display:none', () => {
  test('display:none element is not rendered', () => {
    const buf = render(10, 3,
      h('div', { class: 'parent' }, [
        h('div', { class: 'visible' }, 'YES'),
        h('div', { class: 'hidden' }, 'NO'),
      ]),
      {
        '.parent': { width: 10, height: 3, display: 'flex', flexDirection: 'column' },
        '.visible': { width: 10, height: 1 },
        '.hidden': { display: 'none', width: 10, height: 1 },
      }
    )

    const full = rowChars(buf, 0) + rowChars(buf, 1) + rowChars(buf, 2)
    expect(full).not.toContain('NO')
    expect(full).toContain('YES')
  })
})

// ─── justify-content rendering ────────────────────────────────────────────────

describe('BufferRenderer — justify-content', () => {
  test('justify-content: flex-end pushes children to end of row', () => {
    // Container 20 wide, one child 5 wide → child should start at x=15
    const buf = render(20, 1,
      h('div', { class: 'row' }, [
        h('div', { class: 'child' }, 'CHILD'),
      ]),
      {
        '.row': { width: 20, height: 1, display: 'flex', flexDirection: 'row', justifyContent: 'flex-end' },
        '.child': { width: 5, height: 1 },
      }
    )

    expect(rowSlice(buf, 0, 15, 5)).toBe('CHILD')
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })

  test('justify-content: center centers children in row', () => {
    // Container 20, child 4 → starts at x=8 (floor((20-4)/2))
    const buf = render(20, 1,
      h('div', { class: 'row' }, [
        h('div', { class: 'child' }, 'ABCD'),
      ]),
      {
        '.row': { width: 20, height: 1, display: 'flex', flexDirection: 'row', justifyContent: 'center' },
        '.child': { width: 4, height: 1 },
      }
    )

    expect(rowSlice(buf, 0, 8, 4)).toBe('ABCD')
  })

  test('justify-content: space-between places first child at x=0 and last at end', () => {
    const buf = render(20, 1,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }, 'AA'),
        h('div', { class: 'b' }, 'BB'),
      ]),
      {
        '.row': { width: 20, height: 1, display: 'flex', flexDirection: 'row', justifyContent: 'space-between' },
        '.a': { width: 2, height: 1 },
        '.b': { width: 2, height: 1 },
      }
    )

    expect(rowSlice(buf, 0, 0, 2)).toBe('AA')
    expect(rowSlice(buf, 0, 18, 2)).toBe('BB')
  })
})

// ─── align-items rendering ────────────────────────────────────────────────────

describe('BufferRenderer — align-items', () => {
  test('align-items: flex-end places children at bottom of row container', () => {
    const buf = render(10, 5,
      h('div', { class: 'row' }, [
        h('div', { class: 'child' }, 'HI'),
      ]),
      {
        '.row': { width: 10, height: 5, display: 'flex', flexDirection: 'row', alignItems: 'flex-end' },
        '.child': { width: 4, height: 1 },
      }
    )

    // Child should be at y=4 (bottom of 5-row container)
    expect(rowSlice(buf, 4, 0, 2)).toBe('HI')
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })

  test('align-items: center places children in vertical middle', () => {
    const buf = render(10, 5,
      h('div', { class: 'row' }, [
        h('div', { class: 'child' }, 'HI'),
      ]),
      {
        '.row': { width: 10, height: 5, display: 'flex', flexDirection: 'row', alignItems: 'center' },
        '.child': { width: 4, height: 1 },
      }
    )

    // Child height 1 in container height 5 → y = floor((5-1)/2) = 2
    expect(rowSlice(buf, 2, 0, 2)).toBe('HI')
  })
})

// ─── padding affects content position ─────────────────────────────────────────

describe('BufferRenderer — padding', () => {
  test('padding-left offsets content x', () => {
    const buf = render(20, 3, h('div', { class: 'box' }, 'TEXT'), {
      '.box': { width: 20, height: 3, paddingLeft: 4 },
    })

    expect(rowSlice(buf, 0, 4, 4)).toBe('TEXT')
    // Before padding should be blank
    expect(buf.getCell(0, 0)?.char).toBe(' ')
    expect(buf.getCell(3, 0)?.char).toBe(' ')
  })

  test('padding-top offsets content y', () => {
    const buf = render(20, 5, h('div', { class: 'box' }, 'TEXT'), {
      '.box': { width: 20, height: 5, paddingTop: 2 },
    })

    expect(rowSlice(buf, 2, 0, 4)).toBe('TEXT')
    expect(buf.getCell(0, 0)?.char).toBe(' ')
    expect(buf.getCell(0, 1)?.char).toBe(' ')
  })

  test('all-sides padding shrinks content area', () => {
    // Box 10x5 with padding 1 all sides → content area 8x3 starting at (1,1)
    const buf = render(10, 5, h('div', { class: 'box' }, '12345678'), {
      '.box': { width: 10, height: 5, padding: { top: 1, left: 1, right: 1, bottom: 1 } },
    })

    // Content starts at x=1, y=1, width=8 (10 - 2 padding)
    expect(rowSlice(buf, 1, 1, 8)).toBe('12345678')
    // x=9 should not have content (right padding)
    expect(buf.getCell(9, 1)?.char).toBe(' ')
  })

  test('border + padding both offset content', () => {
    // box: border=1, padding=1 → content at (2,2)
    const buf = render(14, 6, h('div', { class: 'box' }, 'HI'), {
      '.box': {
        width: 14, height: 6,
        border: { width: 1, type: 'line' },
        padding: { top: 1, left: 2, right: 0, bottom: 0 },
      },
    })

    // border=1 + padding-left=2 → content at x=3, y=2
    expect(rowSlice(buf, 2, 3, 2)).toBe('HI')
  })
})

// ─── Scroll and clipping ─────────────────────────────────────────────────────

describe('BufferRenderer — scroll and clipping', () => {
  test('scrollable container clips content beyond its viewport height', () => {
    // Container height 3, child has content 6 lines — only 3 should appear
    const engine = createLayoutEngine(20, 10)
    const styles = new Map([
      ['.scroll', { width: 20, height: 3, scrollable: true } as any],
      ['.content', { width: 20, height: 6 }],
    ])
    const vnode = h('div', { class: 'scroll' }, [
      h('div', { class: 'content' }, 'line1\nline2\nline3\nline4\nline5\nline6'),
    ])
    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const buffer = new ScreenBuffer(20, 10)
    const renderer = new BufferRenderer()
    renderer.render(tree, buffer)

    // Lines 1-3 visible within viewport
    expect(rowSlice(buffer, 0, 0, 5)).toBe('line1')
    expect(rowSlice(buffer, 1, 0, 5)).toBe('line2')
    expect(rowSlice(buffer, 2, 0, 5)).toBe('line3')
    // Line 4 should be clipped (below viewport)
    expect(rowSlice(buffer, 3, 0, 5)).not.toBe('line4')
  })

  test('scrollY offsets child nodes upward in scrollable container', () => {
    // Scrolling works via child offset — scrollable containers render children
    // shifted by scrollY, clipped to the viewport.
    const engine = createLayoutEngine(20, 10)
    const styles = new Map([
      ['.scroll', { width: 20, height: 3, scrollable: true } as any],
      ['.r1', { width: 20, height: 1 }],
      ['.r2', { width: 20, height: 1 }],
      ['.r3', { width: 20, height: 1 }],
      ['.r4', { width: 20, height: 1 }],
      ['.r5', { width: 20, height: 1 }],
    ])
    const vnode = h('div', { class: 'scroll' }, [
      h('div', { class: 'r1' }, 'line1'),
      h('div', { class: 'r2' }, 'line2'),
      h('div', { class: 'r3' }, 'line3'),
      h('div', { class: 'r4' }, 'line4'),
      h('div', { class: 'r5' }, 'line5'),
    ])
    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    // Scroll down 2 rows — lines 3-5 should appear in the 3-row viewport
    tree.scrollY = 2

    const buffer = new ScreenBuffer(20, 10)
    new BufferRenderer().render(tree, buffer)

    expect(rowSlice(buffer, 0, 0, 5)).toBe('line3')
    expect(rowSlice(buffer, 1, 0, 5)).toBe('line4')
    expect(rowSlice(buffer, 2, 0, 5)).toBe('line5')
    // Line 4 beyond viewport at y=3 should be clipped
    expect(rowSlice(buffer, 3, 0, 5)).not.toBe('line6')
  })

  test('BUG: scrollY on direct content has wrong loop bound in renderBoxContent', () => {
    // BUG: renderBoxContent loops `i < contentHeight` which means with scrollY=2
    // it only sees indices 0,1,2 — skipping 0 and 1, so only index 2 (line3) renders.
    // Lines 4 and 5 require i=3,4 but the loop stops at i=2.
    // Fix: loop should go to `i < lines.length` (bounded by contentHeight via visibleIndex check).
    const engine = createLayoutEngine(20, 10)
    const styles = new Map([
      ['.scroll', { width: 20, height: 3, scrollable: true } as any],
    ])
    const vnode = h('div', { class: 'scroll' }, 'line1\nline2\nline3\nline4\nline5')
    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)
    tree.scrollY = 2

    const buffer = new ScreenBuffer(20, 10)
    new BufferRenderer().render(tree, buffer)

    // CSS expected: lines 3,4,5 visible at y=0,1,2
    expect(rowSlice(buffer, 0, 0, 5)).toBe('line3')
    expect(rowSlice(buffer, 1, 0, 5)).toBe('line4')
    expect(rowSlice(buffer, 2, 0, 5)).toBe('line5')
  })

  test('sibling outside scrollable area is not affected by scroll', () => {
    // Layout: [scrollable(3 lines), footer(1 line)]
    const engine = createLayoutEngine(20, 8)
    const styles = new Map([
      ['.col', { width: 20, height: 8, display: 'flex', flexDirection: 'column' }],
      ['.scroll', { width: 20, height: 3, scrollable: true } as any],
      ['.footer', { width: 20, height: 1 }],
    ])
    const vnode = h('div', { class: 'col' }, [
      h('div', { class: 'scroll' }, 'a\nb\nc\nd\ne'),
      h('div', { class: 'footer' }, 'FOOTER'),
    ])
    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const scrollNode = tree.children[0]!
    scrollNode.scrollY = 2  // scroll the scroll area

    const buffer = new ScreenBuffer(20, 8)
    new BufferRenderer().render(tree, buffer)

    // Footer at y=3 should still say FOOTER regardless of scroll
    expect(rowSlice(buffer, 3, 0, 6)).toBe('FOOTER')
  })

  test('clip-box uses screen coords: nested child not blanked near viewport top when parent scrolled', () => {
    // Regression: childClipBox was computed in layout coords instead of screen coords.
    // When root.scrollY > 0 and a wrapper div starts at layout.y > 0, the wrapper's
    // clipBox was { y: wrapper.layout.y } (layout coord) rather than
    // { y: wrapper.layout.y - parentScrollY } (screen coord).
    // Children at screen rows 0..(wrapper.layout.y-1) were incorrectly clipped to blank.
    //
    // Concrete setup:
    //   root (scrollableY, h=10, scrollY=3)
    //     row-a (h=1, layout.y=0)   ← scrolled above screen (screen=-3)
    //     row-b (h=1, layout.y=1)   ← scrolled above screen (screen=-2)
    //     wrapper (h=8, layout.y=2)
    //       inner1 (h=1, layout.y=2) ← screen=-1 (not visible)
    //       inner2 (h=1, layout.y=3) ← screen=0  (MUST be visible)
    //       inner3 (h=1, layout.y=4) ← screen=1  (MUST be visible)
    //       inner4 (h=1, layout.y=5) ← screen=2  (MUST be visible)
    //
    // With the bug: wrapper.clipBox.y = 2 (layout), so inner2 at screen=0 fails (0 < 2) → blank.
    // With the fix: wrapper.clipBox.y = 2-3 = -1, intersected to 0, inner2 at 0 passes → visible.
    const engine = createLayoutEngine(20, 10)
    const styles = new Map<string, any>([
      ['.root', { width: 20, height: 10, scrollable: true }],
      ['.row-a', { width: 20, height: 1 }],
      ['.row-b', { width: 20, height: 1 }],
      ['.wrapper', { width: 20, height: 8 }],
      ['.inner', { width: 20, height: 1 }],
    ])
    const vnode = h('div', { class: 'root' }, [
      h('div', { class: 'row-a' }, 'row-a'),
      h('div', { class: 'row-b' }, 'row-b'),
      h('div', { class: 'wrapper' }, [
        h('div', { class: 'inner' }, 'inner1'),
        h('div', { class: 'inner' }, 'inner2'),
        h('div', { class: 'inner' }, 'inner3'),
        h('div', { class: 'inner' }, 'inner4'),
      ]),
    ])
    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    // Scroll by 3: row-a (y=0), row-b (y=1), inner1 (y=2) scroll off top.
    // inner2 (y=3) should appear at screen row 0.
    tree.scrollY = 3

    const buffer = new ScreenBuffer(20, 10)
    new BufferRenderer().render(tree, buffer)

    // inner2 must appear at screen row 0 — not blank
    expect(rowSlice(buffer, 0, 0, 6)).toBe('inner2')
    // inner3 at screen row 1
    expect(rowSlice(buffer, 1, 0, 6)).toBe('inner3')
    // inner4 at screen row 2
    expect(rowSlice(buffer, 2, 0, 6)).toBe('inner4')
  })

  test('scroll clip-box: content after wrapper offset visible throughout viewport', () => {
    // Complementary test: scrolling further into content works correctly.
    // root (scrollableY, h=5, scrollY=6)
    //   header (h=1, layout.y=0)
    //   body (h=20, layout.y=1)
    //     items at layout.y=1..20
    //
    // With scrollY=6: item6 (layout.y=6) → screen=0, item7→screen=1 ...
    const engine = createLayoutEngine(20, 5)
    const styles = new Map<string, any>([
      ['.root', { width: 20, height: 5, scrollable: true }],
      ['.header', { width: 20, height: 1 }],
      ['.body', { width: 20, height: 20 }],
      ['.item', { width: 20, height: 1 }],
    ])
    const items = Array.from({ length: 10 }, (_, i) =>
      h('div', { class: 'item' }, `item${i + 1}`)
    )
    const vnode = h('div', { class: 'root' }, [
      h('div', { class: 'header' }, 'HEADER'),
      h('div', { class: 'body' }, items),
    ])
    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    // scrollY=6 → header(y=0) and items 1-5(y=1..5) scrolled past.
    // item6(y=6) → screen=0, item7(y=7) → screen=1, ...
    tree.scrollY = 6

    const buffer = new ScreenBuffer(20, 5)
    new BufferRenderer().render(tree, buffer)

    expect(rowSlice(buffer, 0, 0, 5)).toBe('item6')
    expect(rowSlice(buffer, 1, 0, 5)).toBe('item7')
    expect(rowSlice(buffer, 2, 0, 5)).toBe('item8')
  })
})

// ─── Block layout ─────────────────────────────────────────────────────────────

describe('BufferRenderer — block layout', () => {
  test('block children stack vertically in non-flex parent', () => {
    // No flex on parent → block layout → children stack vertically
    const buf = render(20, 6,
      h('div', { class: 'parent' }, [
        h('div', { class: 'a' }, 'AAA'),
        h('div', { class: 'b' }, 'BBB'),
        h('div', { class: 'c' }, 'CCC'),
      ]),
      {
        '.parent': { width: 20, height: 6 },
        '.a': { width: 20, height: 2 },
        '.b': { width: 20, height: 2 },
        '.c': { width: 20, height: 2 },
      }
    )

    // Each child on a different row pair
    expect(rowSlice(buf, 0, 0, 3)).toBe('AAA')
    expect(rowSlice(buf, 2, 0, 3)).toBe('BBB')
    expect(rowSlice(buf, 4, 0, 3)).toBe('CCC')
  })

  test('multiple children do not overlap in block layout', () => {
    const buf = render(10, 4,
      h('div', { class: 'parent' }, [
        h('div', { class: 'a' }, 'FIRST'),
        h('div', { class: 'b' }, 'SECOND'),
      ]),
      {
        '.parent': { width: 10, height: 4 },
        '.a': { width: 10, height: 2, visualStyles: { bg: 'red' } },
        '.b': { width: 10, height: 2, visualStyles: { bg: 'blue' } },
      }
    )

    // Row 0-1: red (first child)
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(0, 1)?.background).toBe('red')
    // Row 2-3: blue (second child, no overlap)
    expect(buf.getCell(0, 2)?.background).toBe('blue')
    expect(buf.getCell(0, 3)?.background).toBe('blue')
  })
})

// ─── overflow: hidden clipping ────────────────────────────────────────────────

describe('BufferRenderer — overflow: hidden clipping', () => {
  test('BUG (unverified): direct text beyond container height is clipped', () => {
    // Container height=3 with scrollable=false — text lines 4+ should not render
    const buf = render(20, 8,
      h('div', { class: 'clip' }, 'line1\nline2\nline3\nline4\nline5'),
      { '.clip': { width: 20, height: 3 } as any }
    )

    expect(rowSlice(buf, 0, 0, 5)).toBe('line1')
    expect(rowSlice(buf, 1, 0, 5)).toBe('line2')
    expect(rowSlice(buf, 2, 0, 5)).toBe('line3')
    // Lines 4-5 should be clipped (outside the 3-row container)
    expect(rowSlice(buf, 3, 0, 5)).not.toBe('line4')
    expect(rowSlice(buf, 4, 0, 5)).not.toBe('line5')
  })

  test('BUG (unverified): child nodes that overflow parent height are not rendered', () => {
    // Parent height=2, c1 fits (y=0-1), c2 overflows (y=2-3) → c2 not rendered.
    // flexShrink: 0 prevents children from shrinking to fit — they overflow instead.
    const buf = render(10, 6,
      h('div', { class: 'parent' }, [
        h('div', { class: 'c1' }),
        h('div', { class: 'c2' }),
      ]),
      {
        '.parent': { width: 10, height: 2, display: 'flex', flexDirection: 'column' },
        '.c1': { width: 10, height: 2, flexShrink: 0, visualStyles: { bg: 'green' } },
        '.c2': { width: 10, height: 2, flexShrink: 0, visualStyles: { bg: 'red' } },
      }
    )

    // c1 in bounds: green
    expect(buf.getCell(0, 0)?.background).toBe('green')
    expect(buf.getCell(0, 1)?.background).toBe('green')
    // c2 overflows parent: should NOT render red below y=2
    expect(buf.getCell(0, 2)?.background).not.toBe('red')
    expect(buf.getCell(0, 3)?.background).not.toBe('red')
  })
})

// ─── position: absolute ───────────────────────────────────────────────────────

describe('BufferRenderer — position: absolute', () => {
  test('absolute child renders its background at top/left coordinates', () => {
    const buf = render(20, 10,
      h('div', { class: 'parent' }, [
        h('div', { class: 'overlay' }),
      ]),
      {
        '.parent': { width: 20, height: 10, position: 'relative' },
        '.overlay': {
          position: 'absolute', top: 2, left: 5, width: 6, height: 2,
          visualStyles: { bg: 'magenta' },
        },
      }
    )

    // Before overlay: not magenta
    expect(buf.getCell(4, 2)?.background).not.toBe('magenta')
    // Overlay area: magenta
    expect(buf.getCell(5, 2)?.background).toBe('magenta')
    expect(buf.getCell(10, 2)?.background).toBe('magenta')
    expect(buf.getCell(11, 2)?.background).not.toBe('magenta')
    // Above overlay row: not magenta
    expect(buf.getCell(5, 1)?.background).not.toBe('magenta')
  })

  test('absolute child text renders at its computed position', () => {
    const buf = render(20, 8,
      h('div', { class: 'parent' }, [
        h('div', { class: 'overlay' }, 'OVER'),
      ]),
      {
        '.parent': { width: 20, height: 8 },
        '.overlay': { position: 'absolute', top: 3, left: 4, width: 8, height: 1 },
      }
    )

    expect(rowSlice(buf, 3, 4, 4)).toBe('OVER')
    // Text should not appear on rows above the overlay
    expect(rowSlice(buf, 2, 4, 4)).not.toBe('OVER')
  })

  test('absolute sibling does not displace normal flow children', () => {
    // A normal child (y=0) and an absolute child (top=5) should not interact
    const buf = render(20, 10,
      h('div', { class: 'parent' }, [
        h('div', { class: 'normal' }, 'NORM'),
        h('div', { class: 'abs' }, 'ABS'),
      ]),
      {
        '.parent': { width: 20, height: 10, display: 'flex', flexDirection: 'column' },
        '.normal': { width: 20, height: 1 },
        '.abs': { position: 'absolute', top: 5, left: 0, width: 20, height: 1 },
      }
    )

    // Normal child at y=0
    expect(rowSlice(buf, 0, 0, 4)).toBe('NORM')
    // Absolute child at y=5
    expect(rowSlice(buf, 5, 0, 3)).toBe('ABS')
  })
})

// ─── flex-wrap rendering ──────────────────────────────────────────────────────

describe('BufferRenderer — flex-wrap', () => {
  test('wrapped flex items appear on subsequent rows in the buffer', () => {
    // Container=15, items width=6, height=2 each
    // Items 1+2 fit row 1 (6+6=12), item 3 wraps to row 2 (y=2)
    const buf = render(15, 8,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }, 'AA'),
        h('div', { class: 'b' }, 'BB'),
        h('div', { class: 'c' }, 'CC'),
      ]),
      {
        '.row': { width: 15, height: 8, display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
        '.a': { width: 6, height: 2, visualStyles: { bg: 'red' } },
        '.b': { width: 6, height: 2, visualStyles: { bg: 'blue' } },
        '.c': { width: 6, height: 2, visualStyles: { bg: 'green' } },
      }
    )

    // First row: a and b
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(6, 0)?.background).toBe('blue')
    // Second row: c wraps to y=2
    expect(buf.getCell(0, 2)?.background).toBe('green')
    // c should NOT appear on first row
    expect(buf.getCell(12, 0)?.background).not.toBe('green')
  })

  test('wrapped items start at x=0 on their new row', () => {
    const buf = render(10, 6,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }, 'A'),
        h('div', { class: 'b' }, 'B'),
        h('div', { class: 'c' }, 'C'),
      ]),
      {
        '.row': { width: 10, height: 6, display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
        '.a': { width: 6, height: 2 },
        '.b': { width: 6, height: 2 },  // wraps
        '.c': { width: 6, height: 2 },  // wraps
      }
    )

    // b wraps to row 2 (y=2), should start at x=0
    expect(rowSlice(buf, 2, 0, 1)).toBe('B')
  })
})

// ─── align-items: stretch ─────────────────────────────────────────────────────

describe('BufferRenderer — align-items: stretch', () => {
  test('child background fills container height when stretched (no explicit height)', () => {
    // Row container height=5, child has NO height → stretches to 5
    const buf = render(20, 5,
      h('div', { class: 'row' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.row': { width: 20, height: 5, display: 'flex', flexDirection: 'row', alignItems: 'stretch' },
        '.child': { width: 6, visualStyles: { bg: 'cyan' } },  // no height
      }
    )

    // All 5 rows should be cyan within child width
    expect(buf.getCell(0, 0)?.background).toBe('cyan')
    expect(buf.getCell(0, 2)?.background).toBe('cyan')
    expect(buf.getCell(0, 4)?.background).toBe('cyan')
    // Beyond child width: not cyan
    expect(buf.getCell(7, 0)?.background).not.toBe('cyan')
  })

  test('multiple stretched children each fill the container height', () => {
    const buf = render(20, 4,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 20, height: 4, display: 'flex', flexDirection: 'row', alignItems: 'stretch' },
        '.a': { width: 5, visualStyles: { bg: 'red' } },
        '.b': { width: 5, visualStyles: { bg: 'blue' } },
      }
    )

    // Both fill height=4
    expect(buf.getCell(0, 3)?.background).toBe('red')
    expect(buf.getCell(5, 3)?.background).toBe('blue')
  })
})

// ─── visibility: hidden ───────────────────────────────────────────────────────

describe('BufferRenderer — visibility: hidden', () => {
  test('hidden element is not rendered but still occupies flex space', () => {
    // Column: [a(h=2), hidden(h=2, invisible), b(h=2)]
    // hidden takes space → b starts at y=4
    const buf = render(10, 6,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }, 'AAA'),
        h('div', { class: 'hidden' }),
        h('div', { class: 'b' }, 'BBB'),
      ]),
      {
        '.col': { width: 10, height: 6, display: 'flex', flexDirection: 'column' },
        '.a': { width: 10, height: 2 },
        '.hidden': { width: 10, height: 2, visualStyles: { invisible: true, bg: 'red' } },
        '.b': { width: 10, height: 2 },
      }
    )

    // 'a' at y=0: visible
    expect(rowSlice(buf, 0, 0, 3)).toBe('AAA')
    // hidden at y=2: NOT rendered (invisible)
    expect(buf.getCell(0, 2)?.background).not.toBe('red')
    // 'b' at y=4: visible (hidden preserved its 2-row space)
    expect(rowSlice(buf, 4, 0, 3)).toBe('BBB')
  })

  test('hidden element cells do not show background or content', () => {
    const buf = render(10, 3,
      h('div', { class: 'parent' }, [
        h('div', { class: 'hidden' }, 'HIDDEN'),
        h('div', { class: 'visible' }, 'SHOWN'),
      ]),
      {
        '.parent': { width: 10, height: 3, display: 'flex', flexDirection: 'column' },
        '.hidden': { width: 10, height: 1, visualStyles: { invisible: true, bg: 'red', fg: 'red' } },
        '.visible': { width: 10, height: 1 },
      }
    )

    // Row 0 (hidden): no red background, no text rendered
    expect(buf.getCell(0, 0)?.background).not.toBe('red')
    const hiddenRow = rowSlice(buf, 0, 0, 6)
    expect(hiddenRow).not.toBe('HIDDEN')
    // Row 1 (visible): text present
    expect(rowSlice(buf, 1, 0, 5)).toBe('SHOWN')
  })
})

// ─── text overflow clipping ───────────────────────────────────────────────────

describe('BufferRenderer — text overflow clipping', () => {
  test('text wider than container width is clipped at container boundary', () => {
    const buf = render(15, 1,
      h('div', { class: 'box' }, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
      { '.box': { width: 8, height: 1 } }
    )

    // First 8 chars within the 8-wide container
    expect(rowSlice(buf, 0, 0, 8)).toBe('ABCDEFGH')
    // Char at x=8 should be blank (outside container)
    expect(buf.getCell(8, 0)?.char).toBe(' ')
  })

  test('padded container clips text at right edge of content area', () => {
    // Box width=10, padding-left=3 → content area 7 wide starting at x=3
    const buf = render(12, 1,
      h('div', { class: 'box' }, '1234567890'),
      { '.box': { width: 10, height: 1, paddingLeft: 3 } }
    )

    expect(buf.getCell(3, 0)?.char).toBe('1')    // content starts at x=3
    expect(buf.getCell(9, 0)?.char).toBe('7')    // 7th char fits (3+6=9)
    expect(buf.getCell(10, 0)?.char).toBe(' ')   // x=10 outside box
  })

  test('multiline text wraps at container width', () => {
    // Text wider than container width is wrapped, not clipped.
    // 'ABCDE12345\nFGHIJ67890\nKLMNO' with width=5:
    //   'ABCDE12345' wraps → row 0: 'ABCDE', row 1: '12345'
    //   'FGHIJ67890' wraps → row 2: 'FGHIJ' (container height=3 cuts off '67890')
    const buf = render(10, 3,
      h('div', { class: 'box' }, 'ABCDE12345\nFGHIJ67890\nKLMNO'),
      { '.box': { width: 5, height: 3 } }
    )

    expect(rowSlice(buf, 0, 0, 5)).toBe('ABCDE')
    expect(rowSlice(buf, 1, 0, 5)).toBe('12345')
    expect(rowSlice(buf, 2, 0, 5)).toBe('FGHIJ')
    // Beyond container width: blank
    expect(buf.getCell(5, 0)?.char).toBe(' ')
  })
})

// ─── Sibling color isolation ──────────────────────────────────────────────────

describe('BufferRenderer — sibling color isolation', () => {
  test('row siblings have exactly their color in their region, no bleed', () => {
    const buf = render(12, 2,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ]),
      {
        '.row': { width: 12, height: 2, display: 'flex', flexDirection: 'row' },
        '.a': { width: 4, height: 2, visualStyles: { bg: 'red' } },
        '.b': { width: 4, height: 2, visualStyles: { bg: 'green' } },
        '.c': { width: 4, height: 2, visualStyles: { bg: 'blue' } },
      }
    )

    // a: x=0-3
    expect(buf.getCell(3, 0)?.background).toBe('red')
    expect(buf.getCell(4, 0)?.background).not.toBe('red')
    // b: x=4-7
    expect(buf.getCell(4, 0)?.background).toBe('green')
    expect(buf.getCell(7, 0)?.background).toBe('green')
    expect(buf.getCell(8, 0)?.background).not.toBe('green')
    // c: x=8-11
    expect(buf.getCell(8, 0)?.background).toBe('blue')
    expect(buf.getCell(11, 0)?.background).toBe('blue')
  })

  test('column siblings do not bleed colors vertically', () => {
    const buf = render(10, 6,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ]),
      {
        '.col': { width: 10, height: 6, display: 'flex', flexDirection: 'column' },
        '.a': { width: 10, height: 2, visualStyles: { bg: 'red' } },
        '.b': { width: 10, height: 2, visualStyles: { bg: 'green' } },
        '.c': { width: 10, height: 2, visualStyles: { bg: 'blue' } },
      }
    )

    expect(buf.getCell(5, 1)?.background).toBe('red')
    expect(buf.getCell(5, 2)?.background).toBe('green')
    expect(buf.getCell(5, 3)?.background).toBe('green')
    expect(buf.getCell(5, 4)?.background).toBe('blue')
  })
})

// ─── UA default element styles ────────────────────────────────────────────────

describe('BufferRenderer — UA element styles', () => {
  test('button gets blue background by default', () => {
    const buf = render(10, 1,
      h('button', { class: 'btn' }, 'OK'),
      { '.btn': { width: 10, height: 1 } }
    )

    expect(buf.getCell(0, 0)?.background).toBe('blue')
  })

  test('a element gets cyan color and underline by default', () => {
    const buf = render(10, 1,
      h('a', { class: 'link' }, 'Click'),
      { '.link': { width: 10, height: 1 } }
    )

    expect(buf.getCell(0, 0)?.color).toBe('cyan')
    expect(buf.getCell(0, 0)?.underline).toBe(true)
  })

  test('user color overrides UA color on button', () => {
    const buf = render(10, 1,
      h('button', { class: 'btn' }, 'OK'),
      { '.btn': { width: 10, height: 1, visualStyles: { bg: 'red' } } }
    )

    // User style should win over UA default
    expect(buf.getCell(0, 0)?.background).toBe('red')
  })
})

// ─── Nested structures ────────────────────────────────────────────────────────

describe('BufferRenderer — nested HTML', () => {
  test('renders 3 levels of nesting at correct positions', () => {
    // outer(0,0,20,10) > middle(padding=2, so content at 2,2) > inner text
    const buf = render(20, 10,
      h('div', { class: 'outer' }, [
        h('div', { class: 'middle' }, [
          h('div', { class: 'inner' }, 'HI'),
        ]),
      ]),
      {
        '.outer': { width: 20, height: 10, display: 'flex' },
        '.middle': {
          width: 16, height: 6,
          padding: { top: 2, left: 2, right: 0, bottom: 0 },
          display: 'flex',
        },
        '.inner': { width: 10, height: 1 },
      }
    )

    // inner text should appear at x=2, y=2 (middle's padding)
    expect(rowSlice(buf, 2, 2, 2)).toBe('HI')
  })

  test('nested flex containers layout children independently', () => {
    const buf = render(20, 5,
      h('div', { class: 'outer' }, [
        h('div', { class: 'inner' }, [
          h('div', { class: 'a' }, 'A'),
          h('div', { class: 'b' }, 'B'),
        ]),
      ]),
      {
        '.outer': { width: 20, height: 5, display: 'flex', flexDirection: 'column' },
        '.inner': { width: 20, height: 1, display: 'flex', flexDirection: 'row' },
        '.a': { width: 3, height: 1 },
        '.b': { width: 3, height: 1 },
      }
    )

    expect(rowSlice(buf, 0, 0, 1)).toBe('A')
    expect(rowSlice(buf, 0, 3, 1)).toBe('B')
  })
})

// ─── Flex container auto-height ───────────────────────────────────────────────

describe('BufferRenderer — flex container auto-height', () => {
  test('flex-row without explicit height: children render at y=0', () => {
    // Container has no height → auto-expands to children height (3)
    const buf = render(20, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { display: 'flex', flexDirection: 'row', width: 20 },
        '.a': { width: 10, height: 3, visualStyles: { bg: 'red' } },
        '.b': { width: 10, height: 3, visualStyles: { bg: 'blue' } },
      }
    )

    // Children should be visible in all 3 rows
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(0, 2)?.background).toBe('red')
    expect(buf.getCell(10, 0)?.background).toBe('blue')
    expect(buf.getCell(10, 2)?.background).toBe('blue')
  })

  test('flex-column without explicit height: children stack and all render', () => {
    const buf = render(10, 10,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { display: 'flex', flexDirection: 'column', width: 10 },
        '.a': { width: 10, height: 2, visualStyles: { bg: 'red' } },
        '.b': { width: 10, height: 3, visualStyles: { bg: 'blue' } },
      }
    )

    // a at y=0-1, b at y=2-4
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(0, 1)?.background).toBe('red')
    expect(buf.getCell(0, 2)?.background).toBe('blue')
    expect(buf.getCell(0, 4)?.background).toBe('blue')
  })

  test('flex-row inside block parent: sibling is placed below auto-expanded flex', () => {
    const buf = render(20, 10,
      h('div', { class: 'parent' }, [
        h('div', { class: 'flex' }, [
          h('div', { class: 'item' }),
        ]),
        h('div', { class: 'sibling' }, 'SIB'),
      ]),
      {
        '.parent': { width: 20 },
        '.flex': { display: 'flex', flexDirection: 'row', width: 20 },
        '.item': { width: 20, height: 3, visualStyles: { bg: 'green' } },
        '.sibling': { width: 20, height: 1 },
      }
    )

    // flex item visible at y=0-2
    expect(buf.getCell(0, 0)?.background).toBe('green')
    expect(buf.getCell(0, 2)?.background).toBe('green')
    // sibling text at y=3 (below flex)
    expect(rowSlice(buf, 3, 0, 3)).toBe('SIB')
  })

  test('flex children with text content: container auto-sizes and text renders', () => {
    // Children have text → height=1 default; container auto-expands to height=1
    const buf = render(30, 5,
      h('div', { class: 'row' }, [
        h('div', null, 'AAA'),
        h('div', null, 'BBB'),
        h('div', null, 'CCC'),
      ]),
      {
        '.row': { display: 'flex', flexDirection: 'row', width: 30 },
      }
    )

    // All three text strings should appear on row 0
    const row = rowSlice(buf, 0, 0, 30)
    expect(row).toContain('AAA')
    expect(row).toContain('BBB')
    expect(row).toContain('CCC')
  })
})

// ─── Real-world HTML patterns ─────────────────────────────────────────────────

describe('BufferRenderer — common HTML patterns', () => {
  test('nav > a links laid out horizontally via flex', () => {
    const buf = render(30, 3,
      h('nav', { class: 'nav' }, [
        h('a', { class: 'link' }, 'Home'),
        h('a', { class: 'link' }, 'About'),
        h('a', { class: 'link' }, 'Blog'),
      ]),
      {
        '.nav': { display: 'flex', flexDirection: 'row', width: 30, height: 1 },
        '.link': { width: 10, height: 1, visualStyles: {} },
      }
    )

    expect(rowSlice(buf, 0, 0, 4)).toBe('Home')
    expect(rowSlice(buf, 0, 10, 5)).toBe('About')
    expect(rowSlice(buf, 0, 20, 4)).toBe('Blog')
  })

  test('ul > li list in flex-column renders each item on its own row', () => {
    const buf = render(20, 5,
      h('ul', { class: 'list' }, [
        h('li', null, 'Alpha'),
        h('li', null, 'Beta'),
        h('li', null, 'Gamma'),
      ]),
      {
        '.list': { display: 'flex', flexDirection: 'column', width: 20, height: 3 },
      }
    )

    expect(rowSlice(buf, 0, 0, 5)).toBe('Alpha')
    expect(rowSlice(buf, 1, 0, 4)).toBe('Beta')
    expect(rowSlice(buf, 2, 0, 5)).toBe('Gamma')
  })

  test('sidebar + main layout (two flex children side by side)', () => {
    // Classic two-column layout via flex-row
    const buf = render(30, 5,
      h('div', { class: 'layout' }, [
        h('div', { class: 'sidebar' }, 'SIDE'),
        h('div', { class: 'main' }, 'MAIN'),
      ]),
      {
        '.layout': { display: 'flex', flexDirection: 'row', width: 30, height: 5 },
        '.sidebar': { width: 10, height: 5, visualStyles: { bg: 'blue' } },
        '.main': { width: 20, height: 5, visualStyles: { bg: 'green' } },
      }
    )

    expect(buf.getCell(0, 0)?.background).toBe('blue')
    expect(rowSlice(buf, 0, 0, 4)).toBe('SIDE')
    expect(buf.getCell(10, 0)?.background).toBe('green')
    expect(rowSlice(buf, 0, 10, 4)).toBe('MAIN')
  })

  test('inline flex section in larger page: only the flex area renders inline', () => {
    // Simulate .container > .inline with three div children (the minimal example bug)
    const buf = render(30, 10,
      h('div', { class: 'container' }, [
        h('div', { class: 'inline' }, [
          h('div', { class: 'item' }, 'A'),
          h('div', { class: 'item' }, 'B'),
          h('div', { class: 'item' }, 'C'),
        ]),
        h('div', { class: 'below' }, 'below'),
      ]),
      {
        '.container': { width: 30, height: 10 },
        '.inline': { display: 'flex', flexDirection: 'row', width: 30 },
        '.item': { width: 10, height: 1 },
        '.below': { width: 30, height: 1 },
      }
    )

    // flex items at y=0 (side by side)
    expect(rowSlice(buf, 0, 0, 1)).toBe('A')
    expect(rowSlice(buf, 0, 10, 1)).toBe('B')
    expect(rowSlice(buf, 0, 20, 1)).toBe('C')
    // "below" div pushed to y=1
    expect(rowSlice(buf, 1, 0, 5)).toBe('below')
  })
})

// ─── Code element clipping ────────────────────────────────────────────────────

describe('BufferRenderer — code element clipping', () => {
  test('code inside height-constrained parent: overflow lines not rendered', () => {
    // Parent height=3, code has 6 lines — only 3 should appear.
    // Content is passed as a string child so collectText() finds it.
    const buf = render(30, 6,
      h('div', { class: 'parent' }, [
        h('code', { class: 'code' }, 'L1\nL2\nL3\nL4\nL5\nL6'),
      ]),
      {
        '.parent': { width: 30, height: 3 },
        '.code': { width: 30, height: 6 },
      }
    )

    expect(rowSlice(buf, 0, 0, 2)).toBe('L1')
    expect(rowSlice(buf, 1, 0, 2)).toBe('L2')
    expect(rowSlice(buf, 2, 0, 2)).toBe('L3')
    // L4-L6 clipped by parent height=3
    expect(rowSlice(buf, 3, 0, 2)).not.toBe('L4')
    expect(rowSlice(buf, 4, 0, 2)).not.toBe('L5')
  })

  test('code inside width-constrained parent: overflow columns not rendered', () => {
    // Parent width=5, code line is 20 chars — only first 5 visible
    const buf = render(20, 3,
      h('div', { class: 'parent' }, [
        h('code', { class: 'code' }, 'ABCDEFGHIJKLMNOPQRST'),
      ]),
      {
        '.parent': { width: 5, height: 1 },
        '.code': { width: 20, height: 1 },
      }
    )

    expect(buf.getCell(0, 0)?.char).toBe('A')
    expect(buf.getCell(4, 0)?.char).toBe('E')
    // F onwards clipped by parent width=5
    expect(buf.getCell(5, 0)?.char ?? ' ').toBe(' ')
  })

  test('code inside scrollable container at scrollY=1: first line hidden', () => {
    const engine = createLayoutEngine(30, 6)
    const styles = new Map([
      ['.scroll', { width: 30, height: 3, scrollable: true } as any],
      ['.code', { width: 30, height: 4 }],
    ])
    const tree = engine.buildLayoutTree(
      h('div', { class: 'scroll' }, [
        h('code', { class: 'code' }, 'line1\nline2\nline3\nline4'),
      ]),
      styles
    )
    engine.computeLayout(tree)
    tree.scrollY = 1

    const buffer = new ScreenBuffer(30, 6)
    new BufferRenderer().render(tree, buffer)

    expect(rowSlice(buffer, 0, 0, 5)).toBe('line2')
    expect(rowSlice(buffer, 1, 0, 5)).toBe('line3')
    expect(rowSlice(buffer, 2, 0, 5)).toBe('line4')
    expect(rowSlice(buffer, 3, 0, 5)).not.toBe('line5')
  })

  test('code inside flex-column: clipped at container boundary', () => {
    // Flex-column height=4, code has 10 lines — only 4 rows show
    const buf = render(20, 8,
      h('div', { class: 'col' }, [
        h('code', { class: 'code' }, 'A\nB\nC\nD\nE\nF\nG\nH\nI\nJ'),
      ]),
      {
        '.col': { width: 20, height: 4, display: 'flex', flexDirection: 'column' },
        '.code': { width: 20, height: 10 },
      }
    )

    expect(buf.getCell(0, 0)?.char).toBe('A')
    expect(buf.getCell(0, 3)?.char).toBe('D')
    // E onwards outside the 4-row parent
    expect(buf.getCell(0, 4)?.char ?? ' ').toBe(' ')
  })
})

// ─── BUG: text-align ──────────────────────────────────────────────────────────

describe('BUG: BufferRenderer — text-align not applied', () => {
  // text-align: center and right are parsed by the CSS transformer
  // but the buffer renderer does not apply them for box content.
  // These tests document the gap — mark as BUG until fixed.
  //
  // Root cause: renderBoxContent() has the text-align logic (line ~365),
  // but it only applies to nodes rendered via renderBoxContent, not text nodes.
  // Verify the CSS property is at least parsed correctly.

  test('text-align: center is parsed by CSS transformer', async () => {
    const { transformCSSToLayout } = await import('../../core/css/transformer')
    const result = await transformCSSToLayout('.box { text-align: center; }')
    expect(result['.box']?.textAlign).toBe('center')
  })

  test('text-align: right is parsed by CSS transformer', async () => {
    const { transformCSSToLayout } = await import('../../core/css/transformer')
    const result = await transformCSSToLayout('.box { text-align: right; }')
    expect(result['.box']?.textAlign).toBe('right')
  })
})

// ─── Padding clipping interaction ─────────────────────────────────────────────

describe('BufferRenderer — padding + clip interaction', () => {
  test('text inside padded box renders in content area, not at x=0', () => {
    const buf = render(20, 3,
      h('div', { class: 'box' }, 'Hello'),
      { '.box': { width: 20, height: 1, paddingLeft: 4 } }
    )

    // Content area starts at x=4
    expect(buf.getCell(4, 0)?.char).toBe('H')
    expect(buf.getCell(8, 0)?.char).toBe('o')
    // Padding area (x=0..3) should be blank
    expect(buf.getCell(0, 0)?.char ?? ' ').toBe(' ')
    expect(buf.getCell(3, 0)?.char ?? ' ').toBe(' ')
  })

  test('text in padded parent does not bleed outside parent right edge', () => {
    // Container width=10, padding=2 each side → content width=6
    // Text "ABCDEFGHIJ" (10 chars) should be clipped to 6 chars
    const buf = render(15, 2,
      h('div', { class: 'box' }, 'ABCDEFGHIJ'),
      { '.box': { width: 10, height: 1, paddingLeft: 2, paddingRight: 2 } }
    )

    // Content starts at x=2, only 6 chars fit
    expect(buf.getCell(2, 0)?.char).toBe('A')
    expect(buf.getCell(7, 0)?.char).toBe('F')
    // G onwards clipped (content width = 10 - 2 - 2 = 6)
    expect(buf.getCell(8, 0)?.char ?? ' ').toBe(' ')
  })

  test('child in flex-column stretches to full padded-content width', () => {
    // Outer: width=20, padding=2 → content width=16
    // Inner flex-col child: should stretch to 16, not 20
    const buf = render(20, 3,
      h('div', { class: 'outer' }, [
        h('div', { class: 'inner' }, 'X'),
      ]),
      {
        '.outer': {
          width: 20, height: 3,
          display: 'flex', flexDirection: 'column',
          paddingLeft: 2, paddingRight: 2,
        },
        '.inner': { height: 1, visualStyles: { bg: 'cyan' } },
      }
    )

    // Background at x=2 (padded content start)
    expect(buf.getCell(2, 0)?.background).toBe('cyan')
    // No background in padding area (x=0,1)
    expect(buf.getCell(0, 0)?.background).not.toBe('cyan')
    expect(buf.getCell(1, 0)?.background).not.toBe('cyan')
    // Content 'X' at x=2
    expect(buf.getCell(2, 0)?.char).toBe('X')
  })
})

// ─── Border + content clipping ────────────────────────────────────────────────

describe('BufferRenderer — border + content interaction', () => {
  test('text inside bordered box starts inside the border', () => {
    // Box with border=1: content area starts at (1,1)
    const buf = render(10, 4,
      h('div', { class: 'box' }, 'Hi'),
      {
        '.box': {
          width: 10, height: 3,
          border: { width: 1, type: 'line' },
        },
      }
    )

    // Top border at y=0
    expect(buf.getCell(0, 0)?.char).toBe('┌')
    // Content starts at y=1, x=1
    expect(buf.getCell(1, 1)?.char).toBe('H')
    expect(buf.getCell(2, 1)?.char).toBe('i')
  })

  test('text in bordered box does not overwrite border characters', () => {
    const buf = render(8, 4,
      h('div', { class: 'box' }, 'ABCDEFGHIJ'),
      { '.box': { width: 8, height: 3, border: { width: 1, type: 'line' } } }
    )

    // Right border at x=7
    expect(buf.getCell(7, 1)?.char).toBe('│')
    // Text clipped to content width (8 - 2*1 = 6), so 'G' at x=7 must not appear
    expect(buf.getCell(6, 1)?.char).toBe('F')  // 6th char (A=1,B=2,C=3,D=4,E=5,F=6)
  })

  test('background of bordered child does not overflow into border rows', () => {
    const buf = render(12, 5,
      h('div', { class: 'outer' }, [
        h('div', { class: 'inner' }),
      ]),
      {
        '.outer': { width: 12, height: 5, border: { width: 1, type: 'line' } },
        '.inner': { width: 10, height: 1, visualStyles: { bg: 'red' } },
      }
    )

    // Top border row (y=0) should NOT be red
    expect(buf.getCell(1, 0)?.background).not.toBe('red')
    // Content row (y=1) should be red
    expect(buf.getCell(1, 1)?.background).toBe('red')
  })
})

// ─── Nested clipping ──────────────────────────────────────────────────────────

describe('BufferRenderer — nested container clipping', () => {
  test('grandchild clipped by intermediate container, not just root', () => {
    // outer(20x6) → mid(20x2) → inner text
    // inner is 5 rows tall but mid only shows 2
    const buf = render(20, 6,
      h('div', { class: 'outer' }, [
        h('div', { class: 'mid' }, [
          h('div', { class: 'inner' }, 'R0\nR1\nR2\nR3\nR4'),
        ]),
      ]),
      {
        '.outer': { width: 20, height: 6 },
        '.mid': { width: 20, height: 2 },
        '.inner': { width: 20, height: 5 },
      }
    )

    expect(rowSlice(buf, 0, 0, 2)).toBe('R0')
    expect(rowSlice(buf, 1, 0, 2)).toBe('R1')
    // R2-R4 clipped by mid's height=2
    expect(rowSlice(buf, 2, 0, 2)).not.toBe('R2')
    expect(rowSlice(buf, 3, 0, 2)).not.toBe('R3')
  })

  test('sibling containers clip each other — no color bleed across boundaries', () => {
    // Two siblings: top half blue, bottom half red — no bleed
    const buf = render(10, 6,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { width: 10, height: 6, display: 'flex', flexDirection: 'column' },
        '.a': { width: 10, height: 3, visualStyles: { bg: 'blue' } },
        '.b': { width: 10, height: 3, visualStyles: { bg: 'red' } },
      }
    )

    // Bottom of blue region
    expect(buf.getCell(0, 2)?.background).toBe('blue')
    // Top of red region
    expect(buf.getCell(0, 3)?.background).toBe('red')
    // No red above boundary
    expect(buf.getCell(0, 2)?.background).not.toBe('red')
    // No blue below boundary
    expect(buf.getCell(0, 3)?.background).not.toBe('blue')
  })

  test('absolutely positioned overlay stays within its parent clip box', () => {
    // Parent clip box height=4. Absolute child top=2, height=5 → clipped to 2 rows.
    const buf = render(20, 8,
      h('div', { class: 'outer' }, [
        h('div', { class: 'clip' }, [
          h('div', { class: 'abs' }),
        ]),
      ]),
      {
        '.outer': { width: 20, height: 8 },
        '.clip': { width: 20, height: 4, position: 'relative' },
        '.abs': {
          position: 'absolute', top: 2, left: 0,
          width: 20, height: 5,
          visualStyles: { bg: 'magenta' },
        },
      }
    )

    // Magenta starts at y=2
    expect(buf.getCell(0, 2)?.background).toBe('magenta')
    expect(buf.getCell(0, 3)?.background).toBe('magenta')
    // y=4 is outside parent clip height=4 — should NOT be magenta
    expect(buf.getCell(0, 4)?.background).not.toBe('magenta')
  })
})

// ─── display: none ────────────────────────────────────────────────────────────

describe('BufferRenderer — display:none removes from flow and render', () => {
  test('display:none sibling: following children move up', () => {
    const buf = render(10, 4,
      h('div', { class: 'col' }, [
        h('div', { class: 'hidden' }, 'SKIP'),
        h('div', { class: 'visible' }, 'SHOW'),
      ]),
      {
        '.col': { width: 10, height: 4, display: 'flex', flexDirection: 'column' },
        '.hidden': { width: 10, height: 2, display: 'none' },
        '.visible': { width: 10, height: 1 },
      }
    )

    // display:none child should not render text
    expect(rowSlice(buf, 0, 0, 4)).not.toBe('SKIP')
    expect(rowSlice(buf, 1, 0, 4)).not.toBe('SKIP')
    // Visible child appears at y=0 (hidden took no space)
    expect(rowSlice(buf, 0, 0, 4)).toBe('SHOW')
  })

  test('display:none: no background painted even with bg style', () => {
    const buf = render(10, 3,
      h('div', { class: 'col' }, [
        h('div', { class: 'none' }),
        h('div', { class: 'visible' }),
      ]),
      {
        '.col': { width: 10, height: 3, display: 'flex', flexDirection: 'column' },
        '.none': { width: 10, height: 2, display: 'none', visualStyles: { bg: 'red' } },
        '.visible': { width: 10, height: 1, visualStyles: { bg: 'green' } },
      }
    )

    // No red anywhere
    for (let y = 0; y < 3; y++) {
      for (let x = 0; x < 10; x++) {
        expect(buf.getCell(x, y)?.background).not.toBe('red')
      }
    }
    // Green at y=0 (none took no space)
    expect(buf.getCell(0, 0)?.background).toBe('green')
  })
})
