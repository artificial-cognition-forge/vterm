/**
 * CSS Compliance — Pseudo-states
 * spec.md § 13
 *
 * Tests: :hover, :focus, :active — parsed into nested LayoutProperties objects
 * Pipeline tier: parser (transformer.ts stores nested pseudo styles)
 *
 * Note: Rendering of pseudo-states requires an InteractionManager.
 * These tests verify that pseudo-state CSS is correctly parsed into
 * the LayoutProperties structure. Rendering tests require an interaction fixture.
 */

import { test, expect, describe } from 'bun:test'
import { transformCSSToLayout } from '../../src/core/css/transformer'
import { InteractionManager } from '../../src/runtime/renderer/interaction'
import { createLayoutNode } from '../../src/core/layout/tree'
import type { LayoutNode } from '../../src/core/layout/types'

/** Build a node with a real ComputedLayout so hit-testing works */
function makeHoverNode(x: number, y: number, w: number, h: number, children: LayoutNode[] = []): LayoutNode {
  const node = createLayoutNode({ type: 'div', layoutProps: {}, style: {}, props: {}, children, content: null })
  node.layout = { x, y, width: w, height: h, padding: { top: 0, right: 0, bottom: 0, left: 0 }, border: { width: 0, style: 'line', fg: undefined, bg: undefined } } as any
  for (const child of children) {
    child.parent = node
  }
  return node
}

// ─── Parser-level: pseudo-states stored on base selector ─────────────────────

describe(':hover parsing', () => {
  test(':hover color is stored under base selector .hover key', async () => {
    const styles = await transformCSSToLayout(`
      .btn { color: white; }
      .btn:hover { color: cyan; background: blue; }
    `)
    expect(styles['.btn']?.hover?.visualStyles?.fg).toBe('cyan')
    expect(styles['.btn']?.hover?.visualStyles?.bg).toBe('blue')
  })

  test(':hover does not pollute base selector styles', async () => {
    const styles = await transformCSSToLayout(`
      .btn { color: white; }
      .btn:hover { color: cyan; }
    `)
    expect(styles['.btn']?.visualStyles?.fg).toBe('white')
  })

  test('element with only :hover rule creates base entry', async () => {
    const styles = await transformCSSToLayout(`
      .link:hover { color: yellow; }
    `)
    expect(styles['.link']?.hover?.visualStyles?.fg).toBe('yellow')
  })
})

describe(':focus parsing', () => {
  test(':focus color stored under base selector .focus key', async () => {
    const styles = await transformCSSToLayout(`
      .input { background: grey; }
      .input:focus { background: white; }
    `)
    expect(styles['.input']?.focus?.visualStyles?.bg).toBe('white')
  })

  test(':focus does not affect base background', async () => {
    const styles = await transformCSSToLayout(`
      .input { background: grey; }
      .input:focus { background: white; }
    `)
    expect(styles['.input']?.visualStyles?.bg).toBe('grey')
  })
})

describe(':active parsing', () => {
  test(':active color stored under base selector .active key', async () => {
    const styles = await transformCSSToLayout(`
      .btn { background: blue; }
      .btn:active { background: darkblue; }
    `)
    expect(styles['.btn']?.active?.visualStyles?.bg).toBe('#00008b')
  })
})

describe('multiple pseudo-states on same element', () => {
  test(':hover and :focus can coexist on same selector', async () => {
    const styles = await transformCSSToLayout(`
      .el { color: white; }
      .el:hover { color: cyan; }
      .el:focus { color: yellow; }
    `)
    expect(styles['.el']?.hover?.visualStyles?.fg).toBe('cyan')
    expect(styles['.el']?.focus?.visualStyles?.fg).toBe('yellow')
    expect(styles['.el']?.visualStyles?.fg).toBe('white')
  })
})

describe('pseudo-state with postcss nesting', () => {
  test('nested :hover via postcss-nested is parsed correctly', async () => {
    const styles = await transformCSSToLayout(`
      .btn {
        color: white;
        &:hover {
          color: cyan;
        }
      }
    `)
    expect(styles['.btn']?.hover?.visualStyles?.fg).toBe('cyan')
    expect(styles['.btn']?.visualStyles?.fg).toBe('white')
  })
})

// ─── Interaction layer: hover propagates to ancestors ─────────────────────────

describe(':hover propagates to ancestors (CSS inheritance)', () => {
  test('hovering a child marks the parent as hovered', () => {
    const child = makeHoverNode(0, 0, 10, 1)
    const parent = makeHoverNode(0, 0, 10, 1, [child])

    const mgr = new InteractionManager()
    mgr.updateFocusableNodes(parent)
    mgr.handleMouseEvent({ type: 'mousemove', x: 0, y: 0, button: 0 }, parent)

    // hoveredNode is the child (innermost hit)
    expect(mgr.getState(child).hover).toBe(true)
    // parent should also be hover=true (CSS :hover propagates up)
    expect(mgr.getState(parent).hover).toBe(true)
  })

  test('hovering the parent directly marks parent as hovered', () => {
    const child = makeHoverNode(0, 0, 5, 1)
    // parent is wider; mouse is on the right side where child doesn't reach
    const parent = makeHoverNode(0, 0, 20, 1, [child])

    const mgr = new InteractionManager()
    mgr.updateFocusableNodes(parent)
    mgr.handleMouseEvent({ type: 'mousemove', x: 15, y: 0, button: 0 }, parent)

    expect(mgr.getState(parent).hover).toBe(true)
    // child is not under the cursor
    expect(mgr.getState(child).hover).toBe(false)
  })

  test('hover does not propagate to an unrelated node', () => {
    const child = makeHoverNode(0, 0, 10, 1)
    const parent = makeHoverNode(0, 0, 10, 1, [child])
    const other = makeHoverNode(0, 5, 10, 1)

    const mgr = new InteractionManager()
    mgr.updateFocusableNodes(parent)
    mgr.handleMouseEvent({ type: 'mousemove', x: 0, y: 0, button: 0 }, parent)

    expect(mgr.getState(other).hover).toBe(false)
  })

  test('hover clears on all nodes when mouse leaves', () => {
    const child = makeHoverNode(0, 0, 10, 1)
    const parent = makeHoverNode(0, 0, 10, 1, [child])
    // Root is a larger container so mouse-move outside bounds still works
    const root = makeHoverNode(0, 0, 80, 24, [parent])

    const mgr = new InteractionManager()
    mgr.updateFocusableNodes(root)

    // Hover over child
    mgr.handleMouseEvent({ type: 'mousemove', x: 0, y: 0, button: 0 }, root)
    expect(mgr.getState(parent).hover).toBe(true)

    // Move mouse to empty area outside parent/child
    mgr.handleMouseEvent({ type: 'mousemove', x: 0, y: 10, button: 0 }, root)
    expect(mgr.getState(parent).hover).toBe(false)
    expect(mgr.getState(child).hover).toBe(false)
  })

  test('three-level nesting: hover on grandchild propagates to all ancestors', () => {
    const grandchild = makeHoverNode(0, 0, 5, 1)
    const child = makeHoverNode(0, 0, 10, 1, [grandchild])
    const parent = makeHoverNode(0, 0, 20, 1, [child])

    const mgr = new InteractionManager()
    mgr.updateFocusableNodes(parent)
    mgr.handleMouseEvent({ type: 'mousemove', x: 0, y: 0, button: 0 }, parent)

    expect(mgr.getState(grandchild).hover).toBe(true)
    expect(mgr.getState(child).hover).toBe(true)
    expect(mgr.getState(parent).hover).toBe(true)
  })
})
