/**
 * Full CSS Pipeline Tests
 *
 * End-to-end tests that exercise the entire stack:
 *   CSS string → transformCSSToLayout → LayoutProperties
 *   → layout engine (computeLayout)
 *   → buffer renderer (render)
 *   → ScreenBuffer cell assertions
 *
 * These are the closest thing to "does this CSS actually render correctly?"
 * without running a real terminal. They catch bugs at every seam.
 */

import { test, expect, describe } from 'bun:test'
import { h } from 'vue'
import { transformCSSToLayout } from './transformer'
import { createLayoutEngine } from '../layout'
import { ScreenBuffer } from '../../runtime/terminal/buffer'
import { BufferRenderer } from '../../runtime/renderer/buffer-renderer'

// ─── Helper ───────────────────────────────────────────────────────────────────

/**
 * Full pipeline: CSS string + VNode → rendered ScreenBuffer.
 */
async function renderCSS(
  css: string,
  vnode: ReturnType<typeof h>,
  width = 80,
  height = 24
): Promise<ScreenBuffer> {
  const parsed = await transformCSSToLayout(css)

  // Convert ParsedStyles (selector → LayoutProperties) to Map
  const styles = new Map(Object.entries(parsed))

  const engine = createLayoutEngine(width, height)
  const tree = engine.buildLayoutTree(vnode, styles)
  engine.computeLayout(tree)

  const buffer = new ScreenBuffer(width, height)
  const renderer = new BufferRenderer()
  renderer.render(tree, buffer)
  return buffer
}

function rowSlice(buffer: ScreenBuffer, y: number, x: number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += buffer.getCell(x + i, y)?.char ?? ' '
  }
  return s
}

// ─── Color pipeline ───────────────────────────────────────────────────────────

describe('CSS pipeline — color', () => {
  test('color: cyan applies to text', async () => {
    const buf = await renderCSS(
      `.box { color: cyan; width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'Hi')
    )

    expect(buf.getCell(0, 0)?.color).toBe('cyan')
  })

  test('background: blue fills box cells', async () => {
    const buf = await renderCSS(
      `.box { background: blue; width: 10; height: 2; }`,
      h('div', { class: 'box' })
    )

    expect(buf.getCell(0, 0)?.background).toBe('blue')
    expect(buf.getCell(9, 1)?.background).toBe('blue')
  })

  test('hex color is passed through to cells', async () => {
    const buf = await renderCSS(
      `.box { color: #ff6600; width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    )

    expect(buf.getCell(0, 0)?.color).toBe('#ff6600')
  })

  test('font-weight: bold applies bold flag', async () => {
    const buf = await renderCSS(
      `.box { font-weight: bold; width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'Bold')
    )

    expect(buf.getCell(0, 0)?.bold).toBe(true)
  })

  test('text-decoration: underline applies underline flag', async () => {
    const buf = await renderCSS(
      `.box { text-decoration: underline; width: 10; height: 1; }`,
      h('div', { class: 'box' }, 'U')
    )

    expect(buf.getCell(0, 0)?.underline).toBe(true)
  })

  test('visibility: hidden makes element invisible', async () => {
    const buf = await renderCSS(
      `.box { visibility: hidden; width: 10; height: 3; background: blue; }`,
      h('div', { class: 'box' })
    )

    // Invisible elements should not render background or content
    expect(buf.getCell(0, 0)?.background).not.toBe('blue')
  })
})

// ─── Box model pipeline ───────────────────────────────────────────────────────

describe('CSS pipeline — box model', () => {
  test('width and height determine rendered area', async () => {
    const buf = await renderCSS(
      `.box { width: 5; height: 3; background: red; }`,
      h('div', { class: 'box' })
    )

    // Within box: red
    expect(buf.getCell(4, 2)?.background).toBe('red')
    // Outside box: blank
    expect(buf.getCell(5, 0)?.background).not.toBe('red')
    expect(buf.getCell(0, 3)?.background).not.toBe('red')
  })

  test('padding offsets text content', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 5; padding: 2 3; }`,
      h('div', { class: 'box' }, 'TEXT')
    )

    // padding: 2 3 → top=2, left=3
    expect(rowSlice(buf, 2, 3, 4)).toBe('TEXT')
    expect(buf.getCell(0, 0)?.char).toBe(' ')
    expect(buf.getCell(2, 0)?.char).toBe(' ')
  })

  test('padding shorthand 4 values: top right bottom left', async () => {
    const buf = await renderCSS(
      `.box { width: 20; height: 10; padding: 1 2 3 4; }`,
      h('div', { class: 'box' }, 'Hi')
    )

    // padding-top=1, padding-left=4
    expect(rowSlice(buf, 1, 4, 2)).toBe('Hi')
  })

  test('width: 50% resolves to half container width', async () => {
    const buf = await renderCSS(
      `.box { width: 50%; height: 2; background: cyan; }`,
      h('div', { class: 'box' }),
      80, 10
    )

    // Half of 80 = 40 → cells 0-39 should have background
    expect(buf.getCell(39, 0)?.background).toBe('cyan')
    expect(buf.getCell(40, 0)?.background).not.toBe('cyan')
  })

  test('calc(100% - 4) resolves against container', async () => {
    const buf = await renderCSS(
      `.box { width: calc(100% - 4); height: 1; background: green; }`,
      h('div', { class: 'box' }),
      80, 5
    )

    // 80 - 4 = 76 → cells 0-75 should have background
    expect(buf.getCell(75, 0)?.background).toBe('green')
    expect(buf.getCell(76, 0)?.background).not.toBe('green')
  })
})

// ─── Flexbox pipeline ─────────────────────────────────────────────────────────

describe('CSS pipeline — flexbox', () => {
  test('display: flex + flex-direction: row lays children side by side', async () => {
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; width: 20; height: 2; }
      .a   { width: 5; height: 2; background: red; }
      .b   { width: 5; height: 2; background: blue; }
    `,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ])
    )

    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(4, 0)?.background).toBe('red')
    expect(buf.getCell(5, 0)?.background).toBe('blue')
    expect(buf.getCell(9, 0)?.background).toBe('blue')
  })

  test('display: flex + flex-direction: column stacks children', async () => {
    const buf = await renderCSS(`
      .col { display: flex; flex-direction: column; width: 10; height: 6; }
      .a   { width: 10; height: 2; background: red; }
      .b   { width: 10; height: 2; background: blue; }
    `,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ])
    )

    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(0, 1)?.background).toBe('red')
    expect(buf.getCell(0, 2)?.background).toBe('blue')
    expect(buf.getCell(0, 3)?.background).toBe('blue')
  })

  test('flex: 1 makes child grow to fill remaining space', async () => {
    const buf = await renderCSS(`
      .row  { display: flex; flex-direction: row; width: 50; height: 2; }
      .fixed { width: 10; height: 2; background: red; }
      .grow  { flex: 1; height: 2; background: blue; }
    `,
      h('div', { class: 'row' }, [
        h('div', { class: 'fixed' }),
        h('div', { class: 'grow' }),
      ])
    )

    // fixed: x=0 to 9 (red), grow: x=10 to 49 (blue)
    expect(buf.getCell(9, 0)?.background).toBe('red')
    expect(buf.getCell(10, 0)?.background).toBe('blue')
    expect(buf.getCell(49, 0)?.background).toBe('blue')
  })

  test('gap: N adds space between flex children', async () => {
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; width: 30; height: 2; gap: 5; }
      .a   { width: 5; height: 2; background: red; }
      .b   { width: 5; height: 2; background: blue; }
    `,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ])
    )

    // a: 0-4, gap: 5-9, b: 10-14
    expect(buf.getCell(4, 0)?.background).toBe('red')
    expect(buf.getCell(5, 0)?.background).not.toBe('red')
    expect(buf.getCell(5, 0)?.background).not.toBe('blue')
    expect(buf.getCell(10, 0)?.background).toBe('blue')
  })

  test('justify-content: flex-end pushes row children to right', async () => {
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; justify-content: flex-end; width: 20; height: 2; }
      .box { width: 5; height: 2; background: cyan; }
    `,
      h('div', { class: 'row' }, [h('div', { class: 'box' })])
    )

    // box should be at x=15 to x=19
    expect(buf.getCell(14, 0)?.background).not.toBe('cyan')
    expect(buf.getCell(15, 0)?.background).toBe('cyan')
    expect(buf.getCell(19, 0)?.background).toBe('cyan')
  })

  test('justify-content: center horizontally centers children', async () => {
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; justify-content: center; width: 20; height: 2; }
      .box { width: 4; height: 2; background: yellow; }
    `,
      h('div', { class: 'row' }, [h('div', { class: 'box' })])
    )

    // center: (20 - 4) / 2 = 8 → starts at x=8
    expect(buf.getCell(7, 0)?.background).not.toBe('yellow')
    expect(buf.getCell(8, 0)?.background).toBe('yellow')
    expect(buf.getCell(11, 0)?.background).toBe('yellow')
    expect(buf.getCell(12, 0)?.background).not.toBe('yellow')
  })

  test('align-items: flex-end pushes children to bottom', async () => {
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; align-items: flex-end; width: 10; height: 5; }
      .box { width: 5; height: 2; background: magenta; }
    `,
      h('div', { class: 'row' }, [h('div', { class: 'box' })])
    )

    // height=5, child height=2 → starts at y=3
    expect(buf.getCell(0, 2)?.background).not.toBe('magenta')
    expect(buf.getCell(0, 3)?.background).toBe('magenta')
    expect(buf.getCell(0, 4)?.background).toBe('magenta')
  })
})

// ─── Border pipeline ──────────────────────────────────────────────────────────

describe('CSS pipeline — border', () => {
  test('border: 1px solid white renders box-drawing chars', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1px solid white; }`,
      h('div', { class: 'box' })
    )

    expect(buf.getCell(0, 0)?.char).toBe('┌')
    expect(buf.getCell(9, 0)?.char).toBe('┐')
    expect(buf.getCell(0, 4)?.char).toBe('└')
    expect(buf.getCell(9, 4)?.char).toBe('┘')
  })

  test('border: 1px solid white — border color applied', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 5; border: 1px solid cyan; }`,
      h('div', { class: 'box' })
    )

    expect(buf.getCell(0, 0)?.color).toBe('cyan')
  })

  test('border insets content: text appears inside border', async () => {
    const buf = await renderCSS(
      `.box { width: 12; height: 4; border: 1px solid white; }`,
      h('div', { class: 'box' }, 'INSIDE')
    )

    // Content should start at x=1 (border offset), y=1
    expect(rowSlice(buf, 1, 1, 6)).toBe('INSIDE')
    // Border characters at corners
    expect(buf.getCell(0, 0)?.char).toBe('┌')
  })
})

// ─── display:none pipeline ────────────────────────────────────────────────────

describe('CSS pipeline — display:none', () => {
  test('display: none hides element and content from buffer', async () => {
    const buf = await renderCSS(`
      .parent  { width: 20; height: 5; }
      .visible { width: 20; height: 2; background: green; }
      .hidden  { display: none; width: 20; height: 2; background: red; }
    `,
      h('div', { class: 'parent' }, [
        h('div', { class: 'visible' }),
        h('div', { class: 'hidden' }),
      ])
    )

    expect(buf.getCell(0, 0)?.background).toBe('green')
    // Red should never appear anywhere
    for (let y = 0; y < 5; y++) {
      for (let x = 0; x < 20; x++) {
        expect(buf.getCell(x, y)?.background).not.toBe('red')
      }
    }
  })
})

// ─── Nested CSS classes ───────────────────────────────────────────────────────

describe('CSS pipeline — nested selectors', () => {
  test('flat class selectors on both parent and child work correctly', async () => {
    // Flat selectors always work — each class is resolved independently
    const buf = await renderCSS(`
      .parent { width: 20; height: 4; display: flex; }
      .child  { color: cyan; width: 10; height: 2; }
    `,
      h('div', { class: 'parent' }, [
        h('div', { class: 'child' }, 'Hi'),
      ])
    )

    expect(buf.getCell(0, 0)?.color).toBe('cyan')
  })

  test('BUG: postcss nested .parent .child selector is NOT matched by resolveStyles', async () => {
    // BUG: postcss-nested correctly flattens `.parent { .child {} }` to `.parent .child {}`.
    // The style is stored in the ParsedStyles map under the key `.parent .child`.
    // BUT resolveStyles() only does flat `.className` lookups — it never evaluates
    // ancestor-chain selectors. So `.parent .child` styles are silently dropped.
    // This test documents the expected behavior (color applied) — it fails until fixed.
    const parsed = await transformCSSToLayout(`
      .parent {
        .child { color: cyan; }
      }
    `)

    // Transformer correctly produces the nested selector key:
    expect(parsed['.parent .child']?.visualStyles?.fg).toBe('cyan')

    // But when rendered, the child does NOT get the color because resolveStyles
    // can't match '.parent .child' against a node with class='child':
    const buf = await renderCSS(`
      .parent { width: 20; height: 4; display: flex; }
      .parent { .child { color: cyan; width: 10; height: 2; } }
    `,
      h('div', { class: 'parent' }, [
        h('div', { class: 'child' }, 'Hi'),
      ])
    )

    expect(buf.getCell(0, 0)?.color).toBe('cyan')
  })
})

// ─── Pseudo-states pipeline ───────────────────────────────────────────────────

describe('CSS pipeline — pseudo-states parsing', () => {
  test(':hover styles are parsed into LayoutProperties.hover', async () => {
    const parsed = await transformCSSToLayout(`
      .btn { background: blue; width: 10; height: 2; }
      .btn:hover { background: cyan; }
    `)

    expect(parsed['.btn']?.visualStyles?.bg).toBe('blue')
    expect(parsed['.btn']?.hover?.visualStyles?.bg).toBe('cyan')
  })

  test(':focus styles are parsed into LayoutProperties.focus', async () => {
    const parsed = await transformCSSToLayout(`
      .input { background: grey; }
      .input:focus { border-color: white; }
    `)

    expect(parsed['.input']?.focus).toBeDefined()
  })
})

// ─── text-align — known bug ───────────────────────────────────────────────────

describe('CSS pipeline — text-align (BUG)', () => {
  test('text-align: center — BUG: text is NOT centered in rendered output', async () => {
    // BUG: text-align is parsed by the transformer (stored as (props as any).align)
    // but is never applied in renderBoxContent. Text always renders at contentX.
    // This test documents the expected behavior — it will fail until the bug is fixed.
    const buf = await renderCSS(
      `.box { width: 20; height: 1; text-align: center; }`,
      h('div', { class: 'box' }, 'Hi')
    )

    // CSS: "Hi" (2 chars) in 20-char box → should start at x=9 (floor((20-2)/2))
    // BUG: currently renders at x=0
    expect(rowSlice(buf, 0, 9, 2)).toBe('Hi')
    expect(buf.getCell(0, 0)?.char).toBe(' ')
  })

  test('text-align: right — BUG: text is NOT right-aligned', async () => {
    // BUG: same root cause as text-align:center
    const buf = await renderCSS(
      `.box { width: 20; height: 1; text-align: right; }`,
      h('div', { class: 'box' }, 'Hi')
    )

    // CSS: "Hi" should end at x=19, so starts at x=18
    // BUG: currently renders at x=0
    expect(rowSlice(buf, 0, 18, 2)).toBe('Hi')
  })
})

// ─── justify-content: space-around / space-evenly ────────────────────────────

describe('CSS pipeline — justify-content: space-around and space-evenly', () => {
  test('space-around: equal space around each child in row', async () => {
    // Container=20, 2 children width=4, free=12
    // space-around: each item has free/n=6 around it (3 on each side)
    // item1 starts at x=3, item2 starts at x=13
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; justify-content: space-around; width: 20; height: 2; }
      .box { width: 4; height: 2; background: cyan; }
    `,
      h('div', { class: 'row' }, [
        h('div', { class: 'box' }),
        h('div', { class: 'box' }),
      ])
    )

    expect(buf.getCell(2, 0)?.background).not.toBe('cyan')   // before first item
    expect(buf.getCell(3, 0)?.background).toBe('cyan')       // first item start
    expect(buf.getCell(6, 0)?.background).toBe('cyan')       // first item end
    expect(buf.getCell(7, 0)?.background).not.toBe('cyan')   // gap
    expect(buf.getCell(13, 0)?.background).toBe('cyan')      // second item start
    expect(buf.getCell(16, 0)?.background).toBe('cyan')      // second item end
    expect(buf.getCell(17, 0)?.background).not.toBe('cyan')  // trailing gap
  })

  test('space-evenly: equal gaps before, between, and after items', async () => {
    // Container=20, 2 children width=4, free=12, 3 gaps of 4 each
    // item1 at x=4, item2 at x=12
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; justify-content: space-evenly; width: 20; height: 2; }
      .box { width: 4; height: 2; background: yellow; }
    `,
      h('div', { class: 'row' }, [
        h('div', { class: 'box' }),
        h('div', { class: 'box' }),
      ])
    )

    expect(buf.getCell(3, 0)?.background).not.toBe('yellow')   // pre-gap
    expect(buf.getCell(4, 0)?.background).toBe('yellow')       // first item
    expect(buf.getCell(7, 0)?.background).toBe('yellow')
    expect(buf.getCell(8, 0)?.background).not.toBe('yellow')   // mid-gap
    expect(buf.getCell(12, 0)?.background).toBe('yellow')      // second item
    expect(buf.getCell(15, 0)?.background).toBe('yellow')
    expect(buf.getCell(16, 0)?.background).not.toBe('yellow')  // trailing gap
  })
})

// ─── align-items: stretch ─────────────────────────────────────────────────────

describe('CSS pipeline — align-items: stretch', () => {
  test('child without height stretches to fill container cross-axis height', async () => {
    // Row container height=5, child has no height → should stretch to 5
    const buf = await renderCSS(`
      .row   { display: flex; flex-direction: row; align-items: stretch; width: 10; height: 5; }
      .child { width: 4; background: green; }
    `,
      h('div', { class: 'row' }, [h('div', { class: 'child' })])
    )

    // All 5 rows of child should have green background
    expect(buf.getCell(0, 0)?.background).toBe('green')
    expect(buf.getCell(0, 4)?.background).toBe('green')
    // Beyond child width should not be green
    expect(buf.getCell(5, 0)?.background).not.toBe('green')
  })
})

// ─── flex-wrap rendering ──────────────────────────────────────────────────────

describe('CSS pipeline — flex-wrap: wrap rendering', () => {
  test('wrapped child appears on the next row in the buffer', async () => {
    // Container width=15. Items width=6 each.
    // Items 1+2 fit (6+6=12 ≤ 15). Item 3 wraps to row 2 (y=3, each height=3).
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; flex-wrap: wrap; width: 15; height: 8; }
      .a   { width: 6; height: 3; background: red; }
      .b   { width: 6; height: 3; background: blue; }
      .c   { width: 6; height: 3; background: green; }
    `,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ])
    )

    // First row: a at x=0, b at x=6
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(6, 0)?.background).toBe('blue')
    // Second row: c at x=0, y=3
    expect(buf.getCell(0, 3)?.background).toBe('green')
    // c should NOT be on first row
    expect(buf.getCell(12, 0)?.background).not.toBe('green')
  })
})

// ─── visibility: hidden space preservation ────────────────────────────────────

describe('CSS pipeline — visibility: hidden preserves layout space', () => {
  test('hidden element is invisible but siblings still respect its space', async () => {
    // CSS: visibility:hidden hides content but keeps its layout space
    // [a(h=3), hidden(h=3), b(h=3)] → b starts at y=6, not y=3
    const buf = await renderCSS(`
      .col    { display: flex; flex-direction: column; width: 10; height: 9; }
      .a      { width: 10; height: 3; background: green; }
      .hidden { visibility: hidden; width: 10; height: 3; background: red; }
      .b      { width: 10; height: 3; background: blue; }
    `,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'hidden' }),
        h('div', { class: 'b' }),
      ])
    )

    // 'a' at y=0-2: green
    expect(buf.getCell(0, 0)?.background).toBe('green')
    // hidden at y=3-5: background NOT rendered (invisible)
    expect(buf.getCell(0, 3)?.background).not.toBe('red')
    // 'b' at y=6-8: blue (pushed down by hidden space)
    expect(buf.getCell(0, 6)?.background).toBe('blue')
    expect(buf.getCell(0, 8)?.background).toBe('blue')
  })
})

// ─── background-color synonym ─────────────────────────────────────────────────

describe('CSS pipeline — background-color synonym', () => {
  test('background-color: applies same as background:', async () => {
    const buf = await renderCSS(
      `.box { background-color: magenta; width: 5; height: 2; }`,
      h('div', { class: 'box' })
    )

    expect(buf.getCell(0, 0)?.background).toBe('magenta')
    expect(buf.getCell(4, 1)?.background).toBe('magenta')
  })
})

// ─── row-gap / column-gap ─────────────────────────────────────────────────────

describe('CSS pipeline — row-gap and column-gap', () => {
  test('column-gap adds horizontal space between row children', async () => {
    // a(w=3), column-gap=4, b(w=3) → b starts at x=7
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; column-gap: 4; width: 20; height: 2; }
      .a   { width: 3; height: 2; background: red; }
      .b   { width: 3; height: 2; background: blue; }
    `,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ])
    )

    expect(buf.getCell(2, 0)?.background).toBe('red')
    expect(buf.getCell(3, 0)?.background).not.toBe('red')
    expect(buf.getCell(3, 0)?.background).not.toBe('blue')
    expect(buf.getCell(7, 0)?.background).toBe('blue')
  })

  test('row-gap adds vertical space between column children', async () => {
    // a(h=3), row-gap=2, b(h=3) → b starts at y=5
    const buf = await renderCSS(`
      .col { display: flex; flex-direction: column; row-gap: 2; width: 10; height: 12; }
      .a   { width: 10; height: 3; background: red; }
      .b   { width: 10; height: 3; background: blue; }
    `,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ])
    )

    expect(buf.getCell(0, 2)?.background).toBe('red')
    expect(buf.getCell(0, 3)?.background).not.toBe('red')
    expect(buf.getCell(0, 3)?.background).not.toBe('blue')
    expect(buf.getCell(0, 5)?.background).toBe('blue')
  })
})

// ─── flex-shrink ──────────────────────────────────────────────────────────────

describe('CSS pipeline — flex-shrink: 0 prevents compression', () => {
  test('flex-shrink: 0 child keeps its full width when container overflows', async () => {
    // Container=10, a wants 8 (shrink:0), b wants 8 (shrink:1)
    // a must not shrink → stays at 8, b gets remaining 2
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; width: 10; height: 2; }
      .a   { width: 8; height: 2; flex-shrink: 0; background: red; }
      .b   { width: 8; height: 2; background: blue; }
    `,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ])
    )

    // 'a' not shrunk: cells 0-7 should be red
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(7, 0)?.background).toBe('red')
    // 'b' starts at x=8 (a kept its 8 width)
    expect(buf.getCell(8, 0)?.background).toBe('blue')
  })
})

// ─── border styles ────────────────────────────────────────────────────────────

describe('CSS pipeline — border styles via CSS string', () => {
  test('border-style: double overrides border to double-line characters', async () => {
    const buf = await renderCSS(
      `.box { width: 10; height: 4; border: 1px solid white; border-style: double; }`,
      h('div', { class: 'box' })
    )

    expect(buf.getCell(0, 0)?.char).toBe('╔')
    expect(buf.getCell(9, 0)?.char).toBe('╗')
    expect(buf.getCell(0, 3)?.char).toBe('╚')
    expect(buf.getCell(9, 3)?.char).toBe('╝')
    expect(buf.getCell(1, 0)?.char).toBe('═')
  })
})

// ─── overflow: hidden clipping ────────────────────────────────────────────────

describe('CSS pipeline — overflow: hidden clipping', () => {
  test('BUG (unverified): overflow:hidden clips content beyond container bounds', async () => {
    // Container height=3 with overflow:hidden — text beyond line 3 should not render
    const buf = await renderCSS(
      `.clip { width: 20; height: 3; overflow: hidden; }`,
      h('div', { class: 'clip' }, 'line1\nline2\nline3\nline4\nline5'),
      20, 10
    )

    expect(rowSlice(buf, 0, 0, 5)).toBe('line1')
    expect(rowSlice(buf, 1, 0, 5)).toBe('line2')
    expect(rowSlice(buf, 2, 0, 5)).toBe('line3')
    // Beyond container height — must not render
    expect(rowSlice(buf, 3, 0, 5)).not.toBe('line4')
    expect(rowSlice(buf, 4, 0, 5)).not.toBe('line5')
  })

  test('BUG (unverified): overflow:hidden container clips child nodes that extend beyond bounds', async () => {
    const buf = await renderCSS(`
      .parent { display: flex; flex-direction: column; width: 10; height: 2; overflow: hidden; }
      .c1     { width: 10; height: 2; background: green; }
      .c2     { width: 10; height: 2; background: red; }
    `,
      h('div', { class: 'parent' }, [
        h('div', { class: 'c1' }),
        h('div', { class: 'c2' }),
      ]),
      10, 6
    )

    // c1 fits (y=0-1): green
    expect(buf.getCell(0, 0)?.background).toBe('green')
    // c2 overflows container (y=2-3): should NOT render red
    expect(buf.getCell(0, 2)?.background).not.toBe('red')
  })
})

// ─── position: absolute rendering ────────────────────────────────────────────

describe('CSS pipeline — position: absolute rendering', () => {
  test('BUG (unverified): absolute child renders at top/left offset in buffer', async () => {
    // Absolute child: top=2, left=5, width=6, height=2 → renders at (5,2)
    const buf = await renderCSS(`
      .parent  { position: relative; width: 20; height: 10; }
      .overlay { position: absolute; top: 2; left: 5; width: 6; height: 2; background: magenta; }
    `,
      h('div', { class: 'parent' }, [
        h('div', { class: 'overlay' }),
      ]),
      20, 10
    )

    // Before overlay: not magenta
    expect(buf.getCell(4, 2)?.background).not.toBe('magenta')
    // Overlay area: magenta
    expect(buf.getCell(5, 2)?.background).toBe('magenta')
    expect(buf.getCell(10, 2)?.background).toBe('magenta')
    // After overlay width: not magenta
    expect(buf.getCell(11, 2)?.background).not.toBe('magenta')
    // Above overlay row: not magenta
    expect(buf.getCell(5, 1)?.background).not.toBe('magenta')
  })
})

// ─── Flex container auto-sizing ───────────────────────────────────────────────

describe('CSS pipeline — flex container auto-height', () => {
  test('flex-row without explicit height expands to fit children', async () => {
    // Container has no height → should auto-expand to children height (3)
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; width: 40; }
      .a   { width: 20; height: 3; background: red; }
      .b   { width: 20; height: 3; background: blue; }
    `,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      40, 10
    )

    // Both cells should render (container auto-expanded to height=3)
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(0, 2)?.background).toBe('red')   // row 3 of red child
    expect(buf.getCell(20, 0)?.background).toBe('blue')
    expect(buf.getCell(20, 2)?.background).toBe('blue')
  })

  test('flex-column without explicit height expands to sum of children', async () => {
    const buf = await renderCSS(`
      .col { display: flex; flex-direction: column; width: 10; }
      .a   { width: 10; height: 2; background: red; }
      .b   { width: 10; height: 3; background: blue; }
    `,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      10, 10
    )

    // a: y=0-1, b: y=2-4
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(0, 1)?.background).toBe('red')
    expect(buf.getCell(0, 2)?.background).toBe('blue')
    expect(buf.getCell(0, 4)?.background).toBe('blue')
  })

  test('flex-row inside block parent: sibling is pushed below auto-expanded flex', async () => {
    // block parent → flex row (auto-height=3) → sibling div below it
    const buf = await renderCSS(`
      .parent  { width: 20; }
      .flex    { display: flex; flex-direction: row; width: 20; }
      .item    { width: 10; height: 3; background: green; }
      .sibling { width: 20; height: 1; background: yellow; }
    `,
      h('div', { class: 'parent' }, [
        h('div', { class: 'flex' }, [
          h('div', { class: 'item' }),
          h('div', { class: 'item' }),
        ]),
        h('div', { class: 'sibling' }),
      ]),
      20, 10
    )

    // flex children visible at y=0-2
    expect(buf.getCell(0, 0)?.background).toBe('green')
    expect(buf.getCell(0, 2)?.background).toBe('green')
    // sibling pushed to y=3
    expect(buf.getCell(0, 3)?.background).toBe('yellow')
    // no sibling at y=2 (still flex area)
    expect(buf.getCell(0, 2)?.background).not.toBe('yellow')
  })

  test('flex children with text content render at y=0 (container auto-sizes to height=1)', async () => {
    // Each child div has text content → defaults to height=1
    // Container auto-expands to 1 row → children should render
    const buf = await renderCSS(`
      .row { display: flex; flex-direction: row; width: 30; }
    `,
      h('div', { class: 'row' }, [
        h('div', null, 'AAA'),
        h('div', null, 'BBB'),
        h('div', null, 'CCC'),
      ]),
      30, 5
    )

    // At least some text should appear on row 0
    const row0 = rowSlice(buf, 0, 0, 30)
    expect(row0).toContain('A')
    expect(row0).toContain('B')
    expect(row0).toContain('C')
  })
})

// ─── Nested flex and block ─────────────────────────────────────────────────────

describe('CSS pipeline — nested flex and block layout', () => {
  test('block parent containing flex children: flex rows are side by side', async () => {
    // nav.nav with display:flex → .link elements lay out horizontally
    const buf = await renderCSS(`
      .nav  { display: flex; flex-direction: row; width: 30; height: 1; }
      .link { width: 10; height: 1; background: cyan; }
    `,
      h('nav', { class: 'nav' }, [
        h('a', { class: 'link' }, 'one'),
        h('a', { class: 'link' }, 'two'),
        h('a', { class: 'link' }, 'three'),
      ]),
      30, 5
    )

    // Three 10-wide cyan cells side by side
    expect(buf.getCell(0, 0)?.background).toBe('cyan')
    expect(buf.getCell(10, 0)?.background).toBe('cyan')
    expect(buf.getCell(20, 0)?.background).toBe('cyan')
  })

  test('multiple flex rows stacked in block parent via block layout', async () => {
    // Two flex rows stacked vertically via the outer block container
    const buf = await renderCSS(`
      .page  { width: 20; }
      .row1  { display: flex; flex-direction: row; width: 20; height: 2; }
      .row2  { display: flex; flex-direction: row; width: 20; height: 2; }
      .red   { width: 10; height: 2; background: red; }
      .blue  { width: 10; height: 2; background: blue; }
      .green { width: 10; height: 2; background: green; }
      .cyan  { width: 10; height: 2; background: cyan; }
    `,
      h('div', { class: 'page' }, [
        h('div', { class: 'row1' }, [
          h('div', { class: 'red' }),
          h('div', { class: 'blue' }),
        ]),
        h('div', { class: 'row2' }, [
          h('div', { class: 'green' }),
          h('div', { class: 'cyan' }),
        ]),
      ]),
      20, 10
    )

    // row1 at y=0-1
    expect(buf.getCell(0, 0)?.background).toBe('red')
    expect(buf.getCell(10, 0)?.background).toBe('blue')
    // row2 at y=2-3 (stacked below row1)
    expect(buf.getCell(0, 2)?.background).toBe('green')
    expect(buf.getCell(10, 2)?.background).toBe('cyan')
    // no bleed: row2 colors not on row1 rows
    expect(buf.getCell(0, 1)?.background).not.toBe('green')
  })

  test('3-level deep flex nesting: grandchildren position correctly', async () => {
    // outer(col) > inner(row) > leaf cells
    const buf = await renderCSS(`
      .outer { display: flex; flex-direction: column; width: 20; height: 6; }
      .inner { display: flex; flex-direction: row; width: 20; height: 2; }
      .leaf  { width: 10; height: 2; background: magenta; }
    `,
      h('div', { class: 'outer' }, [
        h('div', { class: 'inner' }, [
          h('div', { class: 'leaf' }),
          h('div', { class: 'leaf' }),
        ]),
        h('div', { class: 'inner' }, [
          h('div', { class: 'leaf' }),
          h('div', { class: 'leaf' }),
        ]),
      ]),
      20, 6
    )

    // All 4 leaf cells should render as magenta
    expect(buf.getCell(0, 0)?.background).toBe('magenta')   // inner1, leaf1
    expect(buf.getCell(10, 0)?.background).toBe('magenta')  // inner1, leaf2
    expect(buf.getCell(0, 2)?.background).toBe('magenta')   // inner2, leaf1
    expect(buf.getCell(10, 2)?.background).toBe('magenta')  // inner2, leaf2
  })
})

// ─── HTML element defaults in flex context ────────────────────────────────────

describe('CSS pipeline — HTML elements in flex context', () => {
  test('h1-h6 in flex-column stack with height=1 each', async () => {
    const buf = await renderCSS(`
      .col { display: flex; flex-direction: column; width: 20; height: 6; }
    `,
      h('div', { class: 'col' }, [
        h('h1', null, 'Title'),
        h('h2', null, 'Sub'),
        h('h3', null, 'Sub2'),
      ]),
      20, 6
    )

    // Each heading at its own row (h1-h6 default to height=1)
    expect(rowSlice(buf, 0, 0, 5)).toBe('Title')
    expect(rowSlice(buf, 1, 0, 3)).toBe('Sub')
    expect(rowSlice(buf, 2, 0, 4)).toBe('Sub2')
  })

  test('li elements in flex-column list are stacked vertically', async () => {
    const buf = await renderCSS(`
      .list { display: flex; flex-direction: column; width: 20; height: 3; }
    `,
      h('ul', { class: 'list' }, [
        h('li', null, 'Item 1'),
        h('li', null, 'Item 2'),
        h('li', null, 'Item 3'),
      ]),
      20, 5
    )

    expect(rowSlice(buf, 0, 0, 6)).toBe('Item 1')
    expect(rowSlice(buf, 1, 0, 6)).toBe('Item 2')
    expect(rowSlice(buf, 2, 0, 6)).toBe('Item 3')
  })
})

// ─── UA (user-agent) default styles ──────────────────────────────────────────

describe('CSS pipeline — UA default styles', () => {
  test('button element has blue background by default', async () => {
    const buf = await renderCSS(
      `.btn { width: 10; height: 1; }`,
      h('button', { class: 'btn' }, 'Click')
    )

    // UA style: button { bg: blue }
    expect(buf.getCell(0, 0)?.background).toBe('blue')
  })

  test('a element has cyan color and underline by default', async () => {
    const buf = await renderCSS(
      `.link { width: 10; height: 1; }`,
      h('a', { class: 'link' }, 'Click')
    )

    // UA style: a { fg: cyan, underline: true }
    expect(buf.getCell(0, 0)?.color).toBe('cyan')
    expect(buf.getCell(0, 0)?.underline).toBe(true)
  })
})
