/**
 * Nested HTML Layout Tests
 *
 * Tests that verify layout computation for nested HTML structures.
 * These catch the class of bugs where padding/margin/positioning accumulates
 * incorrectly as you go deeper in the tree.
 *
 * Focus: computed x, y, width, height of each node after layout.
 */

import { test, expect, describe } from 'bun:test'
import { h } from 'vue'
import { createLayoutEngine } from './index'
import type { LayoutProperties } from './types'

// ─── Helper ───────────────────────────────────────────────────────────────────

function layout(
  width: number,
  height: number,
  vnode: ReturnType<typeof h>,
  styles: Record<string, LayoutProperties> = {}
) {
  const engine = createLayoutEngine(width, height)
  const stylesMap = new Map(Object.entries(styles))
  const tree = engine.buildLayoutTree(vnode, stylesMap)
  engine.computeLayout(tree)
  return tree
}

// ─── Block stacking ───────────────────────────────────────────────────────────

describe('Nested layout — block stacking', () => {
  test('block children stack vertically', () => {
    const tree = layout(100, 50,
      h('div', { class: 'parent' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ]),
      {
        '.parent': { width: 100, height: 50, display: 'flex', flexDirection: 'column' },
        '.a': { width: 100, height: 10 },
        '.b': { width: 100, height: 10 },
        '.c': { width: 100, height: 10 },
      }
    )

    const [a, b, c] = tree.children
    expect(a!.layout?.y).toBe(0)
    expect(b!.layout?.y).toBe(10)
    expect(c!.layout?.y).toBe(20)
  })

  test('block column children share x=0 origin', () => {
    const tree = layout(100, 50,
      h('div', { class: 'parent' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.parent': { width: 100, height: 50, display: 'flex', flexDirection: 'column' },
        '.a': { width: 80, height: 10 },
        '.b': { width: 60, height: 10 },
      }
    )

    expect(tree.children[0]!.layout?.x).toBe(0)
    expect(tree.children[1]!.layout?.x).toBe(0)
  })
})

// ─── Padding accumulation ─────────────────────────────────────────────────────

describe('Nested layout — padding accumulation', () => {
  test('child position is offset by parent padding', () => {
    const tree = layout(100, 50,
      h('div', { class: 'parent' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.parent': {
          width: 100, height: 50,
          display: 'flex',
          padding: { top: 5, left: 8, right: 0, bottom: 0 },
        },
        '.child': { width: 20, height: 10 },
      }
    )

    const child = tree.children[0]!
    expect(child.layout?.x).toBe(8)
    expect(child.layout?.y).toBe(5)
  })

  test('3-level deep padding accumulates correctly', () => {
    // outer padding 2, middle padding 3 → inner child at x=5, y=5
    const tree = layout(60, 40,
      h('div', { class: 'outer' }, [
        h('div', { class: 'middle' }, [
          h('div', { class: 'inner' }),
        ]),
      ]),
      {
        '.outer': {
          width: 60, height: 40, display: 'flex',
          padding: { top: 2, left: 2, right: 0, bottom: 0 },
        },
        '.middle': {
          width: 50, height: 30, display: 'flex',
          padding: { top: 3, left: 3, right: 0, bottom: 0 },
        },
        '.inner': { width: 20, height: 10 },
      }
    )

    const middle = tree.children[0]!
    const inner = middle.children[0]!

    expect(middle.layout?.x).toBe(2)
    expect(middle.layout?.y).toBe(2)
    expect(inner.layout?.x).toBe(2 + 3) // outer padding + middle padding
    expect(inner.layout?.y).toBe(2 + 3)
  })
})

// ─── Mixed flex directions ────────────────────────────────────────────────────

describe('Nested layout — mixed flex directions', () => {
  test('row container with column sub-container', () => {
    // row: [col[a, b], c]
    const tree = layout(100, 40,
      h('div', { class: 'row' }, [
        h('div', { class: 'col' }, [
          h('div', { class: 'a' }),
          h('div', { class: 'b' }),
        ]),
        h('div', { class: 'c' }),
      ]),
      {
        '.row': { width: 100, height: 40, display: 'flex', flexDirection: 'row' },
        '.col': { width: 40, height: 40, display: 'flex', flexDirection: 'column' },
        '.a': { width: 40, height: 20 },
        '.b': { width: 40, height: 20 },
        '.c': { width: 60, height: 40 },
      }
    )

    const col = tree.children[0]!
    const c = tree.children[1]!
    const a = col.children[0]!
    const b = col.children[1]!

    // col starts at x=0
    expect(col.layout?.x).toBe(0)
    // c starts at x=40
    expect(c.layout?.x).toBe(40)
    // a is first in col at y=0 (relative to col)
    expect(a.layout?.y).toBe(0)
    // b is below a in col
    expect(b.layout?.y).toBe(20)
  })

  test('column container with row sub-container', () => {
    const tree = layout(100, 40,
      h('div', { class: 'col' }, [
        h('div', { class: 'header' }),
        h('div', { class: 'row' }, [
          h('div', { class: 'left' }),
          h('div', { class: 'right' }),
        ]),
      ]),
      {
        '.col': { width: 100, height: 40, display: 'flex', flexDirection: 'column' },
        '.header': { width: 100, height: 5 },
        '.row': { width: 100, height: 35, display: 'flex', flexDirection: 'row' },
        '.left': { width: 30, height: 35 },
        '.right': { width: 70, height: 35 },
      }
    )

    const header = tree.children[0]!
    const row = tree.children[1]!
    const left = row.children[0]!
    const right = row.children[1]!

    expect(header.layout?.y).toBe(0)
    expect(row.layout?.y).toBe(5)
    expect(left.layout?.x).toBe(0)
    expect(right.layout?.x).toBe(30)
  })
})

// ─── Absolute positioning in nested context ───────────────────────────────────

describe('Nested layout — absolute positioning', () => {
  test('absolute child is positioned relative to its parent', () => {
    const tree = layout(100, 50,
      h('div', { class: 'parent' }, [
        h('div', { class: 'overlay' }),
      ]),
      {
        '.parent': { width: 100, height: 50, position: 'relative' },
        '.overlay': { width: 20, height: 10, position: 'absolute', top: 5, left: 10 },
      }
    )

    const overlay = tree.children[0]!
    expect(overlay.layout?.x).toBe(10)
    expect(overlay.layout?.y).toBe(5)
  })
})

// ─── Border affects content size ─────────────────────────────────────────────

describe('Nested layout — border', () => {
  test('border reduces content area for children', () => {
    // Container 20x10 with border=1 → content area 18x8 for children
    const tree = layout(20, 10,
      h('div', { class: 'box' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.box': {
          width: 20, height: 10,
          display: 'flex',
          border: { width: 1 },
        },
        '.child': { width: 18, height: 8 },
      }
    )

    const box = tree
    const child = box.children[0]!

    // Child should be offset by border (1,1)
    expect(child.layout?.x).toBe(1)
    expect(child.layout?.y).toBe(1)
  })

  test('border + padding: child starts at border+padding offset', () => {
    const tree = layout(30, 20,
      h('div', { class: 'box' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.box': {
          width: 30, height: 20,
          display: 'flex',
          border: { width: 1 },
          padding: { top: 2, left: 3, right: 0, bottom: 0 },
        },
        '.child': { width: 10, height: 5 },
      }
    )

    const child = tree.children[0]!
    // x = border(1) + paddingLeft(3) = 4
    // y = border(1) + paddingTop(2) = 3
    expect(child.layout?.x).toBe(4)
    expect(child.layout?.y).toBe(3)
  })
})

// ─── min/max constraints ──────────────────────────────────────────────────────

describe('Nested layout — min/max constraints', () => {
  test('min-width prevents child from shrinking below minimum', () => {
    // BUG: minWidth is stored in LayoutProperties but NOT respected by the flex-grow
    // algorithm in flexbox.ts. Child 'a' grows to 25 (1/4 of 100) instead of respecting min-width=30.
    // Expected CSS behavior: flex-grow distributes free space but final size must be >= minWidth.
    const tree = layout(100, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 100, height: 10, display: 'flex', flexDirection: 'row' },
        '.a': { flexGrow: 1, flexBasis: 0, height: 10, minWidth: 30 },
        '.b': { flexGrow: 3, flexBasis: 0, height: 10 },
      }
    )

    const a = tree.children[0]!
    // CSS: a should be at least 30 wide (minWidth enforced after flex-grow)
    expect(a.layout?.width).toBeGreaterThanOrEqual(30)
  })

  test('max-width caps a flex-grow child', () => {
    // BUG: maxWidth is stored but NOT enforced by the flex-grow algorithm.
    // Child with flexGrow:1 and maxWidth:40 grows to 100 instead of being capped.
    // Expected CSS behavior: flex-grow expansion is bounded by maxWidth.
    const tree = layout(100, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
      ]),
      {
        '.row': { width: 100, height: 10, display: 'flex', flexDirection: 'row' },
        '.a': { flexGrow: 1, flexBasis: 0, height: 10, maxWidth: 40 },
      }
    )

    const a = tree.children[0]!
    // CSS: a should be capped at 40 despite flexGrow:1
    expect(a.layout?.width).toBeLessThanOrEqual(40)
  })
})

// ─── flex-grow in nested context ──────────────────────────────────────────────

describe('Nested layout — flex-grow', () => {
  test('flex-grow child fills remaining space in parent', () => {
    const tree = layout(100, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'fixed' }),
        h('div', { class: 'grow' }),
      ]),
      {
        '.col': { width: 100, height: 30, display: 'flex', flexDirection: 'column' },
        '.fixed': { width: 100, height: 10 },
        '.grow': { width: 100, flexGrow: 1 },
      }
    )

    const fixed = tree.children[0]!
    const grow = tree.children[1]!

    expect(fixed.layout?.height).toBe(10)
    expect(grow.layout?.height).toBe(20) // fills remaining 20
  })

  test('two flex-grow children split space equally', () => {
    const tree = layout(100, 30,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 100, height: 30, display: 'flex', flexDirection: 'row' },
        '.a': { flexGrow: 1, height: 30 },
        '.b': { flexGrow: 1, height: 30 },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!

    expect(a.layout?.width).toBe(50)
    expect(b.layout?.width).toBe(50)
    expect(b.layout?.x).toBe(50)
  })
})

// ─── gap in nested context ────────────────────────────────────────────────────

describe('Nested layout — gap', () => {
  test('gap between siblings in nested container', () => {
    const tree = layout(100, 30,
      h('div', { class: 'outer' }, [
        h('div', { class: 'inner' }, [
          h('div', { class: 'a' }),
          h('div', { class: 'b' }),
          h('div', { class: 'c' }),
        ]),
      ]),
      {
        '.outer': { width: 100, height: 30, display: 'flex' },
        '.inner': { width: 100, height: 30, display: 'flex', flexDirection: 'row', gap: 5 },
        '.a': { width: 10, height: 30 },
        '.b': { width: 10, height: 30 },
        '.c': { width: 10, height: 30 },
      }
    )

    const inner = tree.children[0]!
    const [a, b, c] = inner.children

    expect(a!.layout?.x).toBe(0)
    expect(b!.layout?.x).toBe(15)  // 10 + gap 5
    expect(c!.layout?.x).toBe(30)  // 10 + 5 + 10 + 5
  })
})

// ─── flex-wrap ────────────────────────────────────────────────────────────────

describe('Nested layout — flex-wrap', () => {
  test('flex-wrap: wrap wraps children to next line when overflow', () => {
    // 3 children of width 40 in a 100-wide container — first two fit, third wraps
    const tree = layout(100, 20,
      h('div', { class: 'wrap' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ]),
      {
        '.wrap': { width: 100, height: 20, display: 'flex', flexDirection: 'row', flexWrap: 'wrap' },
        '.a': { width: 40, height: 8 },
        '.b': { width: 40, height: 8 },
        '.c': { width: 40, height: 8 },
      }
    )

    const [a, b, c] = tree.children

    // a and b are on first row (y=0)
    expect(a!.layout?.y).toBe(0)
    expect(b!.layout?.y).toBe(0)
    expect(a!.layout?.x).toBe(0)
    expect(b!.layout?.x).toBe(40)

    // c wraps to next row
    expect(c!.layout?.y).toBeGreaterThan(0)
    expect(c!.layout?.x).toBe(0)
  })
})

// ─── align-self ───────────────────────────────────────────────────────────────

describe('Nested layout — align-self', () => {
  test('align-self overrides align-items for individual child', () => {
    // Container: align-items flex-start. Child b has align-self: flex-end
    const tree = layout(100, 20,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 100, height: 20, display: 'flex', flexDirection: 'row', alignItems: 'flex-start' },
        '.a': { width: 40, height: 5 },
        '.b': { width: 40, height: 5, alignSelf: 'flex-end' },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!

    expect(a.layout?.y).toBe(0)              // flex-start (from container)
    expect(b.layout?.y).toBe(20 - 5)        // flex-end (from align-self) = 15
  })

  test('align-self: center centers individual child', () => {
    const tree = layout(100, 20,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 100, height: 20, display: 'flex', flexDirection: 'row', alignItems: 'flex-start' },
        '.a': { width: 40, height: 5 },
        '.b': { width: 40, height: 6, alignSelf: 'center' },
      }
    )

    const b = tree.children[1]!
    expect(b.layout?.y).toBe(Math.floor((20 - 6) / 2))  // 7
  })
})

// ─── justify-content in column ────────────────────────────────────────────────

describe('Nested layout — justify-content column', () => {
  test('justify-content: flex-end in column pushes children to bottom', () => {
    const tree = layout(20, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.col': { width: 20, height: 30, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' },
        '.child': { width: 20, height: 5 },
      }
    )

    const child = tree.children[0]!
    expect(child.layout?.y).toBe(25)  // 30 - 5
  })

  test('justify-content: center in column centers children vertically', () => {
    const tree = layout(20, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.col': { width: 20, height: 30, display: 'flex', flexDirection: 'column', justifyContent: 'center' },
        '.child': { width: 20, height: 4 },
      }
    )

    const child = tree.children[0]!
    expect(child.layout?.y).toBe(Math.floor((30 - 4) / 2))  // 13
  })

  test('justify-content: space-between in column distributes vertical space', () => {
    const tree = layout(20, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ]),
      {
        '.col': { width: 20, height: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' },
        '.a': { width: 20, height: 4 },
        '.b': { width: 20, height: 4 },
        '.c': { width: 20, height: 4 },
      }
    )

    const [a, b, c] = tree.children
    expect(a!.layout?.y).toBe(0)
    // space-between: remaining = 30 - (4*3) = 18, 2 gaps → 9 each
    expect(b!.layout?.y).toBe(13)   // 4 + 9
    expect(c!.layout?.y).toBe(26)   // 4 + 9 + 4 + 9
  })
})

// ─── row-reverse / column-reverse ────────────────────────────────────────────

describe('Nested layout — reverse directions', () => {
  test('flex-direction: row-reverse reverses child order', () => {
    // BUG: row-reverse currently reverses DOM iteration order but still places items
    // starting from x=0 (left edge). CSS spec requires items to start from the right edge.
    // CSS expected: a (first DOM child) at x=70, b (second DOM child) at x=30.
    // Current engine: b at x=0, a at x=40 (just DOM-order reversed, placed from left).
    const tree = layout(100, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 100, height: 10, display: 'flex', flexDirection: 'row-reverse' },
        '.a': { width: 30, height: 10 },
        '.b': { width: 40, height: 10 },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!

    // CSS: main axis starts at right edge; first DOM item (a) is rightmost
    expect(a.layout?.x).toBe(70)   // 100 - 30
    expect(b.layout?.x).toBe(30)   // 70 - 40
  })

  test('flex-direction: column-reverse reverses child order vertically', () => {
    // BUG: column-reverse has the same issue as row-reverse — items start from y=0
    // instead of the bottom edge. CSS: first DOM item (a) appears at the bottom.
    const tree = layout(20, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { width: 20, height: 30, display: 'flex', flexDirection: 'column-reverse' },
        '.a': { width: 20, height: 10 },
        '.b': { width: 20, height: 10 },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!

    // CSS: main axis starts at bottom; first DOM item (a) is bottommost
    expect(a.layout?.y).toBe(20)   // 30 - 10
    expect(b.layout?.y).toBe(10)   // 20 - 10
  })
})

// ─── width/height inheritance ─────────────────────────────────────────────────

describe('Nested layout — percentage sizing', () => {
  test('percentage width resolves against parent content width', () => {
    const tree = layout(100, 20,
      h('div', { class: 'parent' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.parent': { width: 100, height: 20, display: 'flex' },
        '.child': { width: '50%', height: 20 },
      }
    )

    const child = tree.children[0]!
    expect(child.layout?.width).toBe(50)
  })
})

// ─── calc() sizing ────────────────────────────────────────────────────────────

describe('Nested layout — calc()', () => {
  test('calc(100% - 2) resolves to parent width minus 2', () => {
    const tree = layout(80, 20,
      h('div', { class: 'parent' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.parent': { width: 80, height: 20, display: 'flex' },
        '.child': { width: 'calc(100% - 2)', height: 20 },
      }
    )

    const child = tree.children[0]!
    expect(child.layout?.width).toBe(78)
  })

  test('calc(50% - 1) resolves correctly', () => {
    const tree = layout(100, 10,
      h('div', { class: 'parent' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.parent': { width: 100, height: 10, display: 'flex' },
        '.child': { width: 'calc(50% - 1)', height: 10 },
      }
    )

    const child = tree.children[0]!
    expect(child.layout?.width).toBe(49)
  })
})

// ─── display:none in nested context ──────────────────────────────────────────

describe('Nested layout — display:none', () => {
  test('display:none child takes no space in flex column', () => {
    const tree = layout(100, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'hidden' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { width: 100, height: 30, display: 'flex', flexDirection: 'column' },
        '.a': { width: 100, height: 10 },
        '.hidden': { display: 'none', width: 100, height: 10 },
        '.b': { width: 100, height: 10 },
      }
    )

    const b = tree.children[2]!
    // b should follow a (y=10), not hidden (which should be skipped)
    expect(b.layout?.y).toBe(10)
  })
})

// ─── Absolute positioning ─────────────────────────────────────────────────────

describe('Nested layout — absolute positioning escapes flow', () => {
  test('absolute child does not affect sibling positions in flex', () => {
    // In CSS, absolutely positioned items are taken out of normal flow
    // Siblings should position as if the absolute child doesn't exist
    const tree = layout(100, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'abs' }),  // absolute — should not push c down
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { width: 100, height: 30, display: 'flex', flexDirection: 'column' },
        '.a': { width: 100, height: 10 },
        '.abs': { position: 'absolute', top: 5, left: 5, width: 20, height: 10 },
        '.b': { width: 100, height: 10 },
      }
    )

    const a = tree.children[0]!
    const abs = tree.children[1]!
    const b = tree.children[2]!

    expect(a.layout?.y).toBe(0)
    // abs positioned at y=5 (absolute, from parent origin)
    expect(abs.layout?.y).toBe(5)
    expect(abs.layout?.x).toBe(5)
    // b should follow a directly (abs takes no flow space)
    // NOTE: current engine may include abs in flex flow — this test documents CSS spec
    expect(b.layout?.y).toBe(10)
  })

  test('absolute child positioned inside padded relative parent', () => {
    const tree = layout(100, 50,
      h('div', { class: 'parent' }, [
        h('div', { class: 'overlay' }),
      ]),
      {
        '.parent': {
          width: 100, height: 50,
          position: 'relative',
          padding: { top: 5, left: 5, right: 0, bottom: 0 },
        },
        '.overlay': { position: 'absolute', top: 2, left: 3, width: 10, height: 5 },
      }
    )

    const overlay = tree.children[0]!
    // absolute: top=2, left=3 from parent's position (not from content area)
    expect(overlay.layout?.x).toBe(3)
    expect(overlay.layout?.y).toBe(2)
  })
})

// ─── Overflow text in containers ──────────────────────────────────────────────

describe('Nested layout — container sizing from children', () => {
  test('non-flex container height auto-expands to fit children', () => {
    // Container with no explicit height should expand to fit children
    const tree = layout(100, 50,
      h('div', { class: 'parent' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ]),
      {
        '.parent': { width: 100 },  // no height
        '.a': { width: 100, height: 5 },
        '.b': { width: 100, height: 8 },
        '.c': { width: 100, height: 3 },
      }
    )

    // Parent should auto-expand to 5+8+3=16
    expect(tree.layout?.height).toBe(16)
  })

  test('auto-expand respects maxHeight constraint', () => {
    const tree = layout(100, 50,
      h('div', { class: 'parent' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.parent': { width: 100, maxHeight: 10 },
        '.a': { width: 100, height: 8 },
        '.b': { width: 100, height: 8 },
      }
    )

    // Children total 16, but maxHeight=10 caps it
    expect(tree.layout?.height).toBeLessThanOrEqual(10)
  })
})

// ─── Margin between siblings ──────────────────────────────────────────────────

describe('Nested layout — margin (block layout)', () => {
  test('margin-top on second child pushes it down in block layout', () => {
    // Block layout (no display:flex) does account for child margins
    const tree = layout(100, 40,
      h('div', { class: 'parent' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.parent': { width: 100, height: 40 },  // block, not flex
        '.a': { width: 100, height: 10 },
        '.b': { width: 100, height: 10, marginTop: 5 },
      }
    )

    const b = tree.children[1]!
    // a(10) + b.marginTop(5) = y=15
    expect(b.layout?.y).toBe(15)
  })

  test('margin-bottom on first child adds spacing before next sibling', () => {
    const tree = layout(100, 40,
      h('div', { class: 'parent' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.parent': { width: 100, height: 40 },
        '.a': { width: 100, height: 10, marginBottom: 4 },
        '.b': { width: 100, height: 10 },
      }
    )

    const b = tree.children[1]!
    // a(10) + a.marginBottom(4) = y=14
    expect(b.layout?.y).toBe(14)
  })

  test('margin-left on child in block layout indents it', () => {
    const tree = layout(100, 40,
      h('div', { class: 'parent' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.parent': { width: 100, height: 40 },
        '.child': { width: 80, height: 10, marginLeft: 10 },
      }
    )

    const child = tree.children[0]!
    expect(child.layout?.x).toBe(10)
  })

  test('margin on all sides (block layout)', () => {
    const tree = layout(100, 50,
      h('div', { class: 'parent' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.parent': { width: 100 },
        '.a': { width: 100, height: 5 },
        '.b': { width: 80, height: 5, margin: { top: 3, left: 5, right: 0, bottom: 2 } },
      }
    )

    const b = tree.children[1]!
    expect(b.layout?.y).toBe(5 + 3)   // a(5) + marginTop(3) = 8
    expect(b.layout?.x).toBe(5)        // parent contentX(0) + marginLeft(5)
  })
})

describe('Nested layout — margin (BUG: flex layout ignores child margins)', () => {
  test('BUG: margin-top in flex column is not applied', () => {
    // BUG: layoutSingleLine() in flexbox.ts uses base sizes and gap only.
    // Child margins are not added to the flex offset. This means marginTop on a
    // flex child has no effect — the child position comes purely from flex algorithm.
    const tree = layout(100, 40,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { width: 100, height: 40, display: 'flex', flexDirection: 'column' },
        '.a': { width: 100, height: 10 },
        '.b': { width: 100, height: 10, marginTop: 5 },
      }
    )

    const b = tree.children[1]!
    // CSS: b should be at y=15 (a=10 + marginTop=5)
    // BUG: b is at y=10 (margin ignored by flex algorithm)
    expect(b.layout?.y).toBe(15)
  })

  test('BUG: margin-left in flex row is not applied', () => {
    // BUG: same root cause — flex algorithm ignores per-child margins
    const tree = layout(100, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 100, height: 10, display: 'flex', flexDirection: 'row' },
        '.a': { width: 20, height: 10 },
        '.b': { width: 20, height: 10, marginLeft: 10 },
      }
    )

    const b = tree.children[1]!
    // CSS: b should be at x=30 (a=20 + marginLeft=10)
    // BUG: b is at x=20 (margin ignored)
    expect(b.layout?.x).toBe(30)
  })
})

// ─── Common UI patterns ───────────────────────────────────────────────────────

describe('Nested layout — flex-shrink', () => {
  test('equal flex-shrink children compress proportionally when overflowing', () => {
    // Container=20, two children want 15 each = 30 total, overflow=10
    // Both flex-shrink:1 → each shrinks by 5 → final=10 each
    const tree = layout(20, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 20, height: 10, display: 'flex', flexDirection: 'row' },
        '.a': { width: 15, height: 10, flexShrink: 1 },
        '.b': { width: 15, height: 10, flexShrink: 1 },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!
    // Total must fit container
    expect((a.layout?.width ?? 0) + (b.layout?.width ?? 0)).toBe(20)
    // Equal shrink → equal final sizes
    expect(a.layout?.width).toBe(10)
    expect(b.layout?.width).toBe(10)
    expect(b.layout?.x).toBe(10)
  })

  test('flex-shrink: 0 child is not compressed even when siblings shrink', () => {
    // Container=20, a wants 12 (shrink:0), b wants 12 (shrink:1)
    // Total=24, overflow=4 — only b shrinks → b = 12 - 4 = 8
    const tree = layout(20, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 20, height: 10, display: 'flex', flexDirection: 'row' },
        '.a': { width: 12, height: 10, flexShrink: 0 },
        '.b': { width: 12, height: 10, flexShrink: 1 },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!
    expect(a.layout?.width).toBe(12)  // not shrunk
    expect(b.layout?.width).toBe(8)   // absorbed all overflow
    expect(b.layout?.x).toBe(12)
  })

  test('flex-shrink: 2 shrinks twice as fast as flex-shrink: 1', () => {
    // Container=10, a=10 (shrink:1), b=10 (shrink:2), total overflow=10
    // shrink factor total = 1+2=3. a shrinks by 10*(1/3)≈3, b by 10*(2/3)≈7
    const tree = layout(10, 5,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 10, height: 5, display: 'flex', flexDirection: 'row' },
        '.a': { width: 10, height: 5, flexShrink: 1 },
        '.b': { width: 10, height: 5, flexShrink: 2 },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!
    expect((a.layout?.width ?? 0) + (b.layout?.width ?? 0)).toBe(10)
    // b shrinks more — should be smaller than a
    expect(b.layout?.width).toBeLessThan(a.layout?.width ?? 0)
  })

  test('no shrink needed when total fits container', () => {
    // 2 children of width=8 each = 16 in a 20-wide container → no shrink
    const tree = layout(20, 5,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 20, height: 5, display: 'flex', flexDirection: 'row' },
        '.a': { width: 8, height: 5, flexShrink: 1 },
        '.b': { width: 8, height: 5, flexShrink: 1 },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!
    expect(a.layout?.width).toBe(8)
    expect(b.layout?.width).toBe(8)
  })
})

describe('Nested layout — flex-basis', () => {
  test('flex-basis fills container exactly when basis totals match container', () => {
    // a basis:10, b basis:20, container:30 — no free space → a=10, b=20
    const tree = layout(30, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 30, height: 10, display: 'flex', flexDirection: 'row' },
        '.a': { flexBasis: 10, flexGrow: 0, height: 10 },
        '.b': { flexBasis: 20, flexGrow: 0, height: 10 },
      }
    )

    expect(tree.children[0]!.layout?.width).toBe(10)
    expect(tree.children[1]!.layout?.width).toBe(20)
    expect(tree.children[1]!.layout?.x).toBe(10)
  })

  test('flex-basis:0 with equal grow splits space equally', () => {
    // Both basis:0, grow:1 → equal free space distribution → 20 each in 40-wide container
    const tree = layout(40, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 40, height: 10, display: 'flex', flexDirection: 'row' },
        '.a': { flexBasis: 0, flexGrow: 1, height: 10 },
        '.b': { flexBasis: 0, flexGrow: 1, height: 10 },
      }
    )

    expect(tree.children[0]!.layout?.width).toBe(20)
    expect(tree.children[1]!.layout?.width).toBe(20)
  })

  test('flex-basis with remaining free space grows from basis', () => {
    // a basis:10 grow:1, b basis:10 grow:1, container:40
    // Total basis=20, free=20, grows equally → each gets 10 more → a=20, b=20
    const tree = layout(40, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 40, height: 10, display: 'flex', flexDirection: 'row' },
        '.a': { flexBasis: 10, flexGrow: 1, height: 10 },
        '.b': { flexBasis: 10, flexGrow: 1, height: 10 },
      }
    )

    expect(tree.children[0]!.layout?.width).toBe(20)
    expect(tree.children[1]!.layout?.width).toBe(20)
  })
})

describe('Nested layout — align-items: stretch', () => {
  test('child without explicit height stretches to container cross-axis height', () => {
    // Row container height=10, align-items:stretch, child has no height → should get height=10
    const tree = layout(30, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.row': { width: 30, height: 10, display: 'flex', flexDirection: 'row', alignItems: 'stretch' },
        '.child': { width: 10 },  // no height set
      }
    )

    const child = tree.children[0]!
    expect(child.layout?.height).toBe(10)
  })

  test('child with explicit height is NOT stretched beyond its declared height', () => {
    // Child has height=4 in a 10-high stretch container → stays at 4
    const tree = layout(30, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.row': { width: 30, height: 10, display: 'flex', flexDirection: 'row', alignItems: 'stretch' },
        '.child': { width: 10, height: 4 },
      }
    )

    const child = tree.children[0]!
    expect(child.layout?.height).toBe(4)
  })

  test('stretch in column container expands child width to cross-axis', () => {
    // Column container width=20, align-items:stretch, child has no width → should get width=20
    const tree = layout(20, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'child' }),
      ]),
      {
        '.col': { width: 20, height: 30, display: 'flex', flexDirection: 'column', alignItems: 'stretch' },
        '.child': { height: 5 },  // no width set
      }
    )

    const child = tree.children[0]!
    expect(child.layout?.width).toBe(20)
  })
})

describe('Nested layout — row-gap and column-gap independently', () => {
  test('column-gap adds horizontal spacing between row children', () => {
    // 3 children of width=5 in a row with column-gap:3
    // a at x=0, b at x=5+3=8, c at x=8+5+3=16
    const tree = layout(30, 10,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ]),
      {
        '.row': { width: 30, height: 10, display: 'flex', flexDirection: 'row', columnGap: 3 },
        '.a': { width: 5, height: 10 },
        '.b': { width: 5, height: 10 },
        '.c': { width: 5, height: 10 },
      }
    )

    const [a, b, c] = tree.children
    expect(a!.layout?.x).toBe(0)
    expect(b!.layout?.x).toBe(8)   // 5 + gap 3
    expect(c!.layout?.x).toBe(16)  // 5 + 3 + 5 + 3
  })

  test('row-gap adds vertical spacing between column children', () => {
    // 3 children of height=5 in a column with row-gap:2
    // a at y=0, b at y=5+2=7, c at y=7+5+2=14
    const tree = layout(20, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ]),
      {
        '.col': { width: 20, height: 30, display: 'flex', flexDirection: 'column', rowGap: 2 },
        '.a': { width: 20, height: 5 },
        '.b': { width: 20, height: 5 },
        '.c': { width: 20, height: 5 },
      }
    )

    const [a, b, c] = tree.children
    expect(a!.layout?.y).toBe(0)
    expect(b!.layout?.y).toBe(7)   // 5 + gap 2
    expect(c!.layout?.y).toBe(14)  // 5 + 2 + 5 + 2
  })

  test('column-gap does not affect row spacing, row-gap does not affect column spacing', () => {
    // Setting only column-gap on a column container should have no effect
    const tree = layout(20, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { width: 20, height: 30, display: 'flex', flexDirection: 'column', columnGap: 10 },
        '.a': { width: 20, height: 5 },
        '.b': { width: 20, height: 5 },
      }
    )

    // column-gap doesn't apply in column direction → children stack directly
    expect(tree.children[0]!.layout?.y).toBe(0)
    expect(tree.children[1]!.layout?.y).toBe(5)  // no gap
  })
})

describe('Nested layout — 4-level deep padding accumulation', () => {
  test('absolute position accumulates correctly through 4 nesting levels', () => {
    // l1 padding=2, l2 padding=3, l3 padding=1 → l4 child at x=6, y=6
    const tree = layout(80, 40,
      h('div', { class: 'l1' }, [
        h('div', { class: 'l2' }, [
          h('div', { class: 'l3' }, [
            h('div', { class: 'l4' }),
          ]),
        ]),
      ]),
      {
        '.l1': { width: 80, height: 40, display: 'flex', padding: { top: 2, left: 2, right: 0, bottom: 0 } },
        '.l2': { width: 70, height: 30, display: 'flex', padding: { top: 3, left: 3, right: 0, bottom: 0 } },
        '.l3': { width: 60, height: 20, display: 'flex', padding: { top: 1, left: 1, right: 0, bottom: 0 } },
        '.l4': { width: 10, height: 5 },
      }
    )

    const l4 = tree.children[0]!.children[0]!.children[0]!
    expect(l4.layout?.x).toBe(6)  // 2+3+1
    expect(l4.layout?.y).toBe(6)  // 2+3+1
  })

  test('flex children at depth 4 have correct absolute positions', () => {
    // Row at each level, no padding — child at depth 4 should be at x=offset_sum
    const tree = layout(100, 20,
      h('div', { class: 'l1' }, [
        h('div', { class: 'l2' }, [
          h('div', { class: 'l3' }, [
            h('div', { class: 'early' }),
            h('div', { class: 'l4' }),
          ]),
        ]),
      ]),
      {
        '.l1': { width: 100, height: 20, display: 'flex', flexDirection: 'row' },
        '.l2': { width: 100, height: 20, display: 'flex', flexDirection: 'row' },
        '.l3': { width: 100, height: 20, display: 'flex', flexDirection: 'row' },
        '.early': { width: 15, height: 20 },
        '.l4': { width: 20, height: 20 },
      }
    )

    const l4 = tree.children[0]!.children[0]!.children[1]!
    // l4 starts after early (width=15)
    expect(l4.layout?.x).toBe(15)
    expect(l4.layout?.y).toBe(0)
  })
})

describe('Nested layout — justify-content: space-around and space-evenly', () => {
  test('space-around distributes equal space around each child', () => {
    // Container=20, 2 children width=4, free=12
    // space-around: each item gets free/n=6 around it → 3 on each side
    // item1 at x=3, item2 at x=3+4+6=13
    const tree = layout(20, 5,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 20, height: 5, display: 'flex', flexDirection: 'row', justifyContent: 'space-around' },
        '.a': { width: 4, height: 5 },
        '.b': { width: 4, height: 5 },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!
    expect(a.layout?.x).toBe(3)
    expect(b.layout?.x).toBe(13)
  })

  test('space-evenly places equal gaps before, between, and after all items', () => {
    // Container=20, 2 children width=4, free=12
    // space-evenly: n+1=3 gaps, each=12/3=4
    // item1 at x=4, item2 at x=4+4+4=12
    const tree = layout(20, 5,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { width: 20, height: 5, display: 'flex', flexDirection: 'row', justifyContent: 'space-evenly' },
        '.a': { width: 4, height: 5 },
        '.b': { width: 4, height: 5 },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!
    expect(a.layout?.x).toBe(4)
    expect(b.layout?.x).toBe(12)
  })

  test('space-around in column direction distributes vertical space', () => {
    // Container=30 height, 2 children height=5 each, free=20
    // item1 at y=5, item2 at y=5+5+10=20
    const tree = layout(20, 30,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { width: 20, height: 30, display: 'flex', flexDirection: 'column', justifyContent: 'space-around' },
        '.a': { width: 20, height: 5 },
        '.b': { width: 20, height: 5 },
      }
    )

    const a = tree.children[0]!
    const b = tree.children[1]!
    expect(a.layout?.y).toBe(5)
    expect(b.layout?.y).toBe(20)
  })
})

describe('Nested layout — display: inline', () => {
  test('inline element does not take full container width', () => {
    const tree = layout(50, 10,
      h('div', { class: 'parent' }, [
        h('span', { class: 'inline' }),
      ]),
      {
        '.parent': { width: 50, height: 10 },
        '.inline': { display: 'inline' },
      }
    )

    const inline = tree.children[0]!
    // Inline element should NOT be 50 wide (full container width)
    expect(inline.layout?.width).toBeLessThan(50)
  })
})

describe('Nested layout — visibility: hidden preserves layout space', () => {
  test('visibility:hidden element still occupies space in flex flow', () => {
    // In a column: [a(h=5), hidden(h=5, invisible:true), b(h=5)]
    // CSS: hidden still takes up space → b starts at y=10, not y=5
    const tree = layout(20, 20,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'hidden' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { width: 20, height: 20, display: 'flex', flexDirection: 'column' },
        '.a': { width: 20, height: 5 },
        '.hidden': { width: 20, height: 5, visualStyles: { invisible: true } },
        '.b': { width: 20, height: 5 },
      }
    )

    const b = tree.children[2]!
    // b should follow hidden (which still occupies space) → y=10
    expect(b.layout?.y).toBe(10)
  })

  test('display:none removes element from flow unlike visibility:hidden', () => {
    // display:none child is removed from flow — sibling directly follows
    const tree = layout(20, 20,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'gone' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { width: 20, height: 20, display: 'flex', flexDirection: 'column' },
        '.a': { width: 20, height: 5 },
        '.gone': { display: 'none', width: 20, height: 5 },
        '.b': { width: 20, height: 5 },
      }
    )

    const b = tree.children[2]!
    // b directly follows a (gone takes no space) → y=5
    expect(b.layout?.y).toBe(5)
  })
})

describe('Nested layout — common UI patterns', () => {
  test('sidebar + content pattern', () => {
    // row: [sidebar(fixed 20, no-shrink), content(flex:1)]
    // flexShrink: 0 on sidebar prevents it being compressed when content has no explicit basis
    const tree = layout(100, 40,
      h('div', { class: 'layout' }, [
        h('div', { class: 'sidebar' }),
        h('div', { class: 'content' }),
      ]),
      {
        '.layout': { width: 100, height: 40, display: 'flex', flexDirection: 'row' },
        '.sidebar': { width: 20, height: 40, flexShrink: 0 },
        '.content': { flexGrow: 1, flexBasis: 0, height: 40 },
      }
    )

    const sidebar = tree.children[0]!
    const content = tree.children[1]!

    expect(sidebar.layout?.width).toBe(20)
    expect(sidebar.layout?.x).toBe(0)
    expect(content.layout?.x).toBe(20)
    expect(content.layout?.width).toBe(80)
  })

  test('header + body + footer pattern', () => {
    const tree = layout(100, 40,
      h('div', { class: 'page' }, [
        h('div', { class: 'header' }),
        h('div', { class: 'body' }),
        h('div', { class: 'footer' }),
      ]),
      {
        '.page': { width: 100, height: 40, display: 'flex', flexDirection: 'column' },
        '.header': { width: 100, height: 3 },
        '.body': { width: 100, flexGrow: 1 },
        '.footer': { width: 100, height: 3 },
      }
    )

    const header = tree.children[0]!
    const body = tree.children[1]!
    const footer = tree.children[2]!

    expect(header.layout?.y).toBe(0)
    expect(header.layout?.height).toBe(3)
    expect(body.layout?.y).toBe(3)
    expect(body.layout?.height).toBe(34) // 40 - 3 - 3
    expect(footer.layout?.y).toBe(37)
    expect(footer.layout?.height).toBe(3)
  })
})

// ─── Flex container auto-sizing ───────────────────────────────────────────────

describe('Nested layout — flex container auto-height', () => {
  test('flex-row container without explicit height auto-sizes to tallest child', () => {
    // Container has no height set → should expand to the tallest child (height=5)
    const tree = layout(80, 24,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ]),
      {
        '.row': { display: 'flex', flexDirection: 'row', width: 80 },
        '.a': { width: 20, height: 3 },
        '.b': { width: 20, height: 5 },
        '.c': { width: 20, height: 2 },
      }
    )

    expect(tree.layout?.height).toBe(5)
  })

  test('flex-column container without explicit height auto-sizes to sum of children', () => {
    const tree = layout(80, 24,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
        h('div', { class: 'c' }),
      ]),
      {
        '.col': { display: 'flex', flexDirection: 'column', width: 80 },
        '.a': { width: 80, height: 3 },
        '.b': { width: 80, height: 4 },
        '.c': { width: 80, height: 2 },
      }
    )

    expect(tree.layout?.height).toBe(9) // 3 + 4 + 2
  })

  test('flex-row auto-height: children are positioned correctly inside the expanded container', () => {
    const tree = layout(80, 24,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.row': { display: 'flex', flexDirection: 'row', width: 60 },
        '.a': { width: 30, height: 4 },
        '.b': { width: 30, height: 4 },
      }
    )

    const [a, b] = tree.children
    expect(a!.layout?.x).toBe(0)
    expect(a!.layout?.y).toBe(0)
    expect(b!.layout?.x).toBe(30)
    expect(b!.layout?.y).toBe(0)
  })

  test('flex-column auto-height with gap: sum includes gap between children', () => {
    const tree = layout(80, 24,
      h('div', { class: 'col' }, [
        h('div', { class: 'a' }),
        h('div', { class: 'b' }),
      ]),
      {
        '.col': { display: 'flex', flexDirection: 'column', width: 80, gap: 2 },
        '.a': { width: 80, height: 3 },
        '.b': { width: 80, height: 3 },
      }
    )

    // total = 3 + gap(2) + 3 = 8
    expect(tree.layout?.height).toBe(8)
  })

  test('flex container with explicit height is not auto-expanded', () => {
    // Explicit height=2 with children taller → stays at 2 (overflow)
    const tree = layout(80, 24,
      h('div', { class: 'row' }, [
        h('div', { class: 'a' }),
      ]),
      {
        '.row': { display: 'flex', flexDirection: 'row', width: 80, height: 2 },
        '.a': { width: 80, height: 10 },
      }
    )

    expect(tree.layout?.height).toBe(2)
  })

  test('flex-row inside block parent: auto-sized flex takes correct vertical space', () => {
    // Block parent contains a flex row (no explicit height) then a sibling div
    // The flex row should expand to child height, pushing the sibling down
    const tree = layout(80, 24,
      h('div', { class: 'parent' }, [
        h('div', { class: 'flex-row' }, [
          h('div', { class: 'item' }),
        ]),
        h('div', { class: 'sibling' }),
      ]),
      {
        '.parent': { width: 80 },
        '.flex-row': { display: 'flex', flexDirection: 'row', width: 80 },
        '.item': { width: 40, height: 5 },
        '.sibling': { width: 80, height: 2 },
      }
    )

    const flexRow = tree.children[0]!
    const sibling = tree.children[1]!

    expect(flexRow.layout?.height).toBe(5)   // auto-expanded to child height
    expect(sibling.layout?.y).toBe(5)        // pushed down by flex row
  })

  test('flex children with text content: container auto-sizes to 1 row height', () => {
    // Each child has text content → defaults to height=1 from getDefaultHeight
    // The flex-row container should auto-expand to height=1
    const tree = layout(80, 24,
      h('div', { class: 'row' }, [
        h('div', null, 'hello'),
        h('div', null, 'world'),
        h('div', null, 'foo'),
      ]),
      {
        '.row': { display: 'flex', flexDirection: 'row', width: 80 },
      }
    )

    expect(tree.layout?.height).toBe(1)
  })

  test('nested flex inside block layout: auto-height propagates to block parent', () => {
    // Block parent containing a flex row child (no height on either)
    // Both should auto-size from the leaf child dimensions
    const tree = layout(80, 24,
      h('div', null, [
        h('div', { class: 'flex-row' }, [
          h('div', { class: 'leaf' }),
          h('div', { class: 'leaf' }),
        ]),
      ]),
      {
        '.flex-row': { display: 'flex', flexDirection: 'row', width: 80 },
        '.leaf': { width: 40, height: 3 },
      }
    )

    const flexRow = tree.children[0]!
    expect(flexRow.layout?.height).toBe(3)
    // Block parent auto-expands to fit the flex row
    expect(tree.layout?.height).toBe(3)
  })
})

// ─── Flex children with content-sized dimensions ──────────────────────────────

describe('Nested layout — flex children content-sized', () => {
  test('flex-row children with text content are positioned side by side', () => {
    // Children get default width=containerWidth, flex-shrink compresses them;
    // they are still positioned left-to-right without overlapping
    const tree = layout(60, 10,
      h('div', { class: 'row' }, [
        h('div', null, 'A'),
        h('div', null, 'B'),
        h('div', null, 'C'),
      ]),
      {
        '.row': { display: 'flex', flexDirection: 'row', width: 60, height: 4 },
      }
    )

    const [a, b, c] = tree.children
    // Each child has x > previous child's x (they don't overlap)
    expect(a!.layout?.x).toBe(0)
    expect(b!.layout?.x).toBeGreaterThan(a!.layout!.x)
    expect(c!.layout?.x).toBeGreaterThan(b!.layout!.x)
    // No child x is negative
    expect(a!.layout?.x).toBeGreaterThanOrEqual(0)
    expect(b!.layout?.x).toBeGreaterThanOrEqual(0)
    expect(c!.layout?.x).toBeGreaterThanOrEqual(0)
  })

  test('p elements in flex-column: each gets full width and height=1', () => {
    const tree = layout(80, 24,
      h('div', { class: 'col' }, [
        h('p', null, 'line one'),
        h('p', null, 'line two'),
        h('p', null, 'line three'),
      ]),
      {
        '.col': { display: 'flex', flexDirection: 'column', width: 80 },
      }
    )

    const [p1, p2, p3] = tree.children
    expect(p1!.layout?.height).toBe(1)
    expect(p2!.layout?.height).toBe(1)
    expect(p3!.layout?.height).toBe(1)
    // Stacked vertically
    expect(p1!.layout?.y).toBe(0)
    expect(p2!.layout?.y).toBe(1)
    expect(p3!.layout?.y).toBe(2)
  })

  test('nav with display:flex contains a elements side by side', () => {
    // This mirrors the nav { display: flex } pattern in common HTML
    const tree = layout(80, 10,
      h('nav', { class: 'nav' }, [
        h('a', null, 'Home'),
        h('a', null, 'About'),
        h('a', null, 'Contact'),
      ]),
      {
        '.nav': { display: 'flex', flexDirection: 'row', width: 80, height: 1 },
      }
    )

    const [home, about, contact] = tree.children
    expect(home!.layout?.x).toBe(0)
    expect(about!.layout?.x).toBeGreaterThan(home!.layout!.x)
    expect(contact!.layout?.x).toBeGreaterThan(about!.layout!.x)
  })

  test('justify-content: space-between pushes items to opposite ends', () => {
    // The bug: without content-sized widths, both children got containerWidth/2
    // each, leaving freeSpace=0 so space-between had nothing to distribute.
    // With the fix, children size to content and space-between works correctly.
    const tree = layout(80, 5,
      h('div', { class: 'bar' }, [
        h('div', null, 'left'),
        h('div', null, 'right'),
      ]),
      {
        '.bar': { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: 80, height: 1 },
      }
    )

    const [left, right] = tree.children
    // Left item starts at the beginning
    expect(left!.layout?.x).toBe(0)
    expect(left!.layout?.width).toBe(4)  // 'left'.length
    // Right item is pushed to the far end: x = 80 - 'right'.length = 75
    expect(right!.layout?.width).toBe(5)  // 'right'.length
    expect(right!.layout?.x).toBe(75)     // 80 - 5
  })

  test('justify-content: space-between with three items distributes space evenly', () => {
    const containerWidth = 60
    const tree = layout(containerWidth, 5,
      h('div', { class: 'bar' }, [
        h('div', null, 'aaa'),   // width 3
        h('div', null, 'bbbbb'), // width 5
        h('div', null, 'cc'),    // width 2
      ]),
      {
        '.bar': { display: 'flex', flexDirection: 'row', justifyContent: 'space-between', width: containerWidth, height: 1 },
      }
    )

    const [a, b, c] = tree.children
    // First at left edge
    expect(a!.layout?.x).toBe(0)
    // Last at right edge
    expect(c!.layout?.x).toBe(containerWidth - 2)  // 60 - 'cc'.length
    // Middle is between them
    expect(b!.layout?.x).toBeGreaterThan(a!.layout!.x)
    expect(b!.layout?.x).toBeLessThan(c!.layout!.x)
  })
})

// ─── Two-pass relayout: nested flex containers ───────────────────────────────
//
// When a flex parent stretches a child's size (e.g. stretch or flex-grow),
// the child's OWN children were computed with the ORIGINAL (pre-stretch) size.
// The relayoutSubtreeChildren fix re-computes them with the final size.

describe('Nested layout — two-pass relayout for stretched flex children', () => {
  test('flex-col containing flex-row: row children get correct containerWidth', () => {
    // .outer(flex-col, w=80) → .nav(flex-row) → a, a, a
    // Before fix: .nav computed with w=0 → a's crushed by flex-shrink to w=0
    // After fix: .nav stretched to w=80 → a's re-laid out with containerWidth=80
    const tree = layout(80, 20,
      h('div', { class: 'outer' }, [
        h('div', { class: 'nav' }, [
          h('a', {}, 'X'),
          h('a', {}, 'Y'),
          h('a', {}, 'Z'),
        ]),
      ]),
      {
        '.outer': { width: 80, height: 20, display: 'flex', flexDirection: 'column' },
        '.nav': { display: 'flex', flexDirection: 'row' },
      }
    )

    const nav = tree.children[0]!
    const [x, y, z] = nav.children

    // nav must have been stretched to outer's width
    expect(nav.layout?.width).toBe(80)
    // a tags must have non-zero width (content='X'/'Y'/'Z' → width=1)
    expect(x!.layout?.width).toBeGreaterThan(0)
    expect(y!.layout?.width).toBeGreaterThan(0)
    expect(z!.layout?.width).toBeGreaterThan(0)
    // All on the same row (y=0)
    expect(x!.layout?.y).toBe(0)
    expect(y!.layout?.y).toBe(0)
    expect(z!.layout?.y).toBe(0)
    // Positioned consecutively (each has width=1)
    expect(x!.layout?.x).toBe(0)
    expect(y!.layout?.x).toBe(1)
    expect(z!.layout?.x).toBe(2)
  })

  test('flex-col containing flex-row with gap: gap still applies after relayout', () => {
    const tree = layout(80, 10,
      h('div', { class: 'outer' }, [
        h('div', { class: 'row' }, [
          h('div', {}, 'A'),
          h('div', {}, 'B'),
        ]),
      ]),
      {
        '.outer': { width: 80, height: 10, display: 'flex', flexDirection: 'column' },
        '.row': { display: 'flex', flexDirection: 'row', gap: 5 },
      }
    )

    const row = tree.children[0]!
    const [a, b] = row.children

    expect(row.layout?.width).toBe(80)
    // A at x=0, B at x=1+5=6 (A width=1, gap=5)
    expect(a!.layout?.x).toBe(0)
    expect(b!.layout?.x).toBe(6)
  })

  test('flex-col > flex-row > flex-col: 3-level deep nesting renders correctly', () => {
    // Deepest content must receive correctly computed dimensions from all ancestors
    const tree = layout(60, 20,
      h('div', { class: 'col1' }, [
        h('div', { class: 'row' }, [
          h('div', { class: 'col2' }, [
            h('p', {}, 'DEEP'),
          ]),
        ]),
      ]),
      {
        '.col1': { width: 60, height: 20, display: 'flex', flexDirection: 'column' },
        '.row': { display: 'flex', flexDirection: 'row' },
        '.col2': { display: 'flex', flexDirection: 'column', flexGrow: 1 },
      }
    )

    const row = tree.children[0]!
    const col2 = row.children[0]!
    const p = col2.children[0]!

    // row stretched to full width by col1
    expect(row.layout?.width).toBe(60)
    // col2 gets flex-grow:1 within row → fills remaining width
    expect(col2.layout?.width).toBe(60)
    // p must be visible (non-zero width, at correct position)
    expect(p.layout?.width).toBeGreaterThan(0)
    expect(p.layout?.y).toBe(0)
  })

  test('multiple flex-rows inside flex-col: all rows stretch to full width', () => {
    // Simulates a v-for rendering many message rows in a chat container.
    // Each row is a flex-row with div children (not span — span is inline/0-width by design).
    const tree = layout(80, 20,
      h('div', { class: 'container' }, [
        h('div', { class: 'row' }, [
          h('div', {}, 'Msg 1'),
          h('div', {}, 'agent'),
        ]),
        h('div', { class: 'row' }, [
          h('div', {}, 'Msg 2'),
          h('div', {}, 'user'),
        ]),
        h('div', { class: 'row' }, [
          h('div', {}, 'Msg 3'),
          h('div', {}, 'tool'),
        ]),
      ]),
      {
        '.container': { width: 80, height: 20, display: 'flex', flexDirection: 'column' },
        '.row': { display: 'flex', flexDirection: 'row' },
      }
    )

    const rows = tree.children
    // All 3 rows get full width (stretched by flex-col)
    for (const row of rows) {
      expect(row.layout?.width).toBe(80)
      // Each row's div children have non-zero widths (content-based intrinsic widths)
      for (const child of row.children) {
        expect(child.layout?.width).toBeGreaterThan(0)
      }
    }
    // Rows stack vertically (each row height=1)
    expect(rows[0]!.layout?.y).toBe(0)
    expect(rows[1]!.layout?.y).toBe(1)
    expect(rows[2]!.layout?.y).toBe(2)
  })

  test('flex-row child uses flex-grow to fill remaining space after relayout', () => {
    // A flex-row inside flex-col: first child fixed width, second grows to fill rest
    const tree = layout(80, 10,
      h('div', { class: 'outer' }, [
        h('div', { class: 'row' }, [
          h('div', { class: 'fixed' }, 'FIXED'),
          h('div', { class: 'grow' }, 'GROW'),
        ]),
      ]),
      {
        '.outer': { width: 80, height: 10, display: 'flex', flexDirection: 'column' },
        '.row': { display: 'flex', flexDirection: 'row' },
        '.fixed': { width: 10, height: 1 },
        '.grow': { flexGrow: 1, height: 1 },
      }
    )

    const row = tree.children[0]!
    const [fixed, grow] = row.children

    expect(row.layout?.width).toBe(80)
    expect(fixed!.layout?.width).toBe(10)
    expect(fixed!.layout?.x).toBe(0)
    // grow item fills remaining 70 columns
    expect(grow!.layout?.width).toBe(70)
    expect(grow!.layout?.x).toBe(10)
  })

  test('justify-content: space-between in nested flex-row distributes correctly', () => {
    const tree = layout(80, 10,
      h('div', { class: 'outer' }, [
        h('div', { class: 'row' }, [
          h('div', { class: 'left' }, 'L'),
          h('div', { class: 'right' }, 'R'),
        ]),
      ]),
      {
        '.outer': { width: 80, height: 10, display: 'flex', flexDirection: 'column' },
        '.row': { display: 'flex', flexDirection: 'row', justifyContent: 'space-between' },
        '.left': { width: 4, height: 1 },
        '.right': { width: 4, height: 1 },
      }
    )

    const row = tree.children[0]!
    const [left, right] = row.children

    expect(row.layout?.width).toBe(80)
    expect(left!.layout?.x).toBe(0)
    expect(right!.layout?.x).toBe(76)  // 80 - 4 = 76
  })

  test('nested flex: children widths are non-zero when container is stretched', () => {
    // Generic stress test: flex-col → flex-row with multiple children, none explicit
    const tree = layout(50, 10,
      h('div', { class: 'col' }, [
        h('div', { class: 'nav' }, [
          h('a', {}, 'One'),
          h('a', {}, 'Two'),
          h('a', {}, 'Three'),
        ]),
      ]),
      {
        '.col': { width: 50, height: 10, display: 'flex', flexDirection: 'column' },
        '.nav': { display: 'flex', flexDirection: 'row' },
      }
    )

    const nav = tree.children[0]!
    expect(nav.layout?.width).toBe(50)
    for (const link of nav.children) {
      expect(link.layout?.width).toBeGreaterThan(0)
    }
  })
})
