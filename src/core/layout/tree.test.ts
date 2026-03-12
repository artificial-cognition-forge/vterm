/**
 * Tests for layout tree building and layout engine
 *
 * These tests verify platform-agnostic layout tree construction
 * and layout computation without any blessed or terminal dependencies
 */

import { test, expect, describe } from 'bun:test'
import { h, createVNode } from 'vue'
import {
  createLayoutNode,
  LayoutEngine,
  createLayoutEngine,
} from './tree'
import type { LayoutNode, LayoutProperties } from './types'

describe('createLayoutNode', () => {
  test('creates a basic layout node', () => {
    const node = createLayoutNode({ type: 'box' })

    expect(node.type).toBe('box')
    expect(node.props).toEqual({})
    expect(node.content).toBe(null)
    expect(node.style).toEqual({})
    expect(node.children).toEqual([])
    expect(node.parent).toBe(null)
    expect(node.layout).toBe(null)
    expect(node.events).toBeInstanceOf(Map)
    expect(node.id).toMatch(/^node-\d+$/)
  })

  test('creates node with props', () => {
    const node = createLayoutNode({
      type: 'button',
      props: { width: 100, height: 50 }
    })

    expect(node.type).toBe('button')
    expect(node.props).toEqual({ width: 100, height: 50 })
  })

  test('creates node with content', () => {
    const node = createLayoutNode({
      type: 'text',
      content: 'Hello World'
    })

    expect(node.content).toBe('Hello World')
  })

  test('creates node with style', () => {
    const node = createLayoutNode({
      type: 'box',
      style: { fg: 'white', bg: 'blue', bold: true }
    })

    expect(node.style).toEqual({ fg: 'white', bg: 'blue', bold: true })
  })

  test('creates node with children', () => {
    const child1 = createLayoutNode({ type: 'text' })
    const child2 = createLayoutNode({ type: 'button' })

    const node = createLayoutNode({
      type: 'box',
      children: [child1, child2]
    })

    expect(node.children).toHaveLength(2)
    expect(node.children[0]).toBe(child1)
    expect(node.children[1]).toBe(child2)
  })

  test('generates unique IDs', () => {
    const node1 = createLayoutNode({ type: 'box' })
    const node2 = createLayoutNode({ type: 'box' })

    expect(node1.id).not.toBe(node2.id)
  })
})

describe('createLayoutEngine', () => {
  test('creates layout engine with default config', () => {
    const engine = createLayoutEngine()

    expect(engine).toBeInstanceOf(LayoutEngine)
  })

  test('creates layout engine with custom dimensions', () => {
    const engine = createLayoutEngine(200, 150)

    expect(engine).toBeInstanceOf(LayoutEngine)
  })

  test('extracts CSS variables from :root selector', () => {
    const styles: Record<string, LayoutProperties> = {
      ':root': {
        '--bg': 'red',
        '--fg': 'white',
      } as any,
    }
    const engine = createLayoutEngine(100, 100, styles)
    const vnode = h('textarea', { style: { background: 'var(--bg)', color: 'var(--fg)' } })

    const tree = engine.buildLayoutTree(vnode)

    // Variables should be resolved in the visual styles
    expect(tree.style?.bg).toBe('red')
    expect(tree.style?.fg).toBe('white')
  })

  test('extracts CSS variables from scoped :root selector', () => {
    const scopedKey = 'data-v-12345678\x00:root'
    const styles: Record<string, LayoutProperties> = {
      [scopedKey]: {
        '--primary': 'cyan',
      } as any,
    }
    const engine = createLayoutEngine(100, 100, styles)
    const vnode = h('div', { style: { background: 'var(--primary)' } })

    const tree = engine.buildLayoutTree(vnode)

    // Variables should be resolved from scoped :root
    expect(tree.style?.bg).toBe('cyan')
  })
})

describe('LayoutEngine.buildLayoutTree', () => {
  test('builds tree from simple VNode', () => {
    const engine = createLayoutEngine()
    const vnode = h('box', { width: 100 }, 'Hello')

    const tree = engine.buildLayoutTree(vnode)

    expect(tree.type).toBe('box')
    expect(tree.props.width).toBe(100)
    expect(tree.content).toBe('Hello')
  })

  test('builds tree with nested VNodes', () => {
    const engine = createLayoutEngine()
    const vnode = h('box', {}, [
      h('text', {}, 'Title'),
      h('button', {}, 'Click Me')
    ])

    const tree = engine.buildLayoutTree(vnode)

    expect(tree.children).toHaveLength(2)
    expect(tree.children[0].type).toBe('text')
    expect(tree.children[0].content).toBe('Title')
    expect(tree.children[1].type).toBe('button')
    expect(tree.children[1].content).toBe('Click Me')
  })

  test('links parent references', () => {
    const engine = createLayoutEngine()
    const vnode = h('box', {}, [
      h('text', {}, 'Child 1'),
      h('text', {}, 'Child 2')
    ])

    const tree = engine.buildLayoutTree(vnode)

    expect(tree.children[0].parent).toBe(tree)
    expect(tree.children[1].parent).toBe(tree)
  })

  test('extracts content from props', () => {
    const engine = createLayoutEngine()
    const vnode = h('text', { content: 'From Props' })

    const tree = engine.buildLayoutTree(vnode)

    expect(tree.content).toBe('From Props')
  })

  test('applies styles from CSS', () => {
    const engine = createLayoutEngine()
    const vnode = h('box', { class: 'primary' })

    const styles = new Map<string, LayoutProperties>()
    styles.set('.primary', {
      visualStyles: { fg: 'blue', bold: true }
    })

    const tree = engine.buildLayoutTree(vnode, styles)

    expect(tree.style.fg).toBe('blue')
    expect(tree.style.bold).toBe(true)
  })

  test('applies multiple classes', () => {
    const engine = createLayoutEngine()
    const vnode = h('box', { class: 'primary large' })

    const styles = new Map<string, LayoutProperties>()
    styles.set('.primary', { visualStyles: { fg: 'blue' } })
    styles.set('.large', { visualStyles: { bold: true } })

    const tree = engine.buildLayoutTree(vnode, styles)

    expect(tree.style.fg).toBe('blue')
    expect(tree.style.bold).toBe(true)
  })

  test('inline props override class styles', () => {
    const engine = createLayoutEngine()
    const vnode = h('box', { class: 'primary', width: 200 })

    const styles = new Map<string, LayoutProperties>()
    styles.set('.primary', { width: 100 })

    const tree = engine.buildLayoutTree(vnode, styles)

    expect(tree.layoutProps.width).toBe(200)
  })

  test('handles array of class names', () => {
    const engine = createLayoutEngine()
    const vnode = h('box', { class: ['primary', 'large'] })

    const styles = new Map<string, LayoutProperties>()
    styles.set('.primary', { visualStyles: { fg: 'blue' } })
    styles.set('.large', { visualStyles: { bold: true } })

    const tree = engine.buildLayoutTree(vnode, styles)

    expect(tree.style.fg).toBe('blue')
    expect(tree.style.bold).toBe(true)
  })
})

describe('LayoutEngine.computeLayout', () => {
  test('computes basic layout', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({
      type: 'box',
      props: { width: 50, height: 30 }
    })
    ;node.layoutProps = { width: 50, height: 30 }

    engine.computeLayout(node)

    expect(node.layout).not.toBe(null)
    expect(node.layout?.width).toBe(50)
    expect(node.layout?.height).toBe(30)
    expect(node.layout?.x).toBe(0)
    expect(node.layout?.y).toBe(0)
  })

  test('computes layout with padding', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'box' })
    ;node.layoutProps = {
      width: 100,
      height: 100,
      padding: 10
    }

    engine.computeLayout(node)

    expect(node.layout?.padding).toEqual({
      top: 10,
      right: 10,
      bottom: 10,
      left: 10
    })
  })

  test('computes layout with margin', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'box' })
    ;node.layoutProps = {
      width: 50,
      height: 50,
      margin: 5
    }

    engine.computeLayout(node)

    expect(node.layout?.margin).toEqual({
      top: 5,
      right: 5,
      bottom: 5,
      left: 5
    })
    // Position should account for margin
    expect(node.layout?.x).toBe(5)
    expect(node.layout?.y).toBe(5)
  })

  test('computes layout with border', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'box' })
    ;node.layoutProps = {
      width: 50,
      height: 50,
      border: { width: 1, type: 'line' as const }
    }

    engine.computeLayout(node)

    expect(node.layout?.border).toEqual({ width: 1, type: 'line' })
  })

  test('applies min/max width constraints', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'box' })
    ;node.layoutProps = {
      width: 200,
      height: 50,
      maxWidth: 100
    }

    engine.computeLayout(node)

    expect(node.layout?.width).toBe(100)
  })

  test('handles percentage widths', () => {
    const engine = createLayoutEngine(200, 100)
    const node = createLayoutNode({ type: 'box' })
    ;node.layoutProps = {
      width: '50%',
      height: 50
    }

    engine.computeLayout(node)

    expect(node.layout?.width).toBe(100) // 50% of 200
  })

  test('computes absolute positioning', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'box' })
    ;node.layoutProps = {
      width: 50,
      height: 50,
      position: 'absolute',
      top: 10,
      left: 20
    }

    engine.computeLayout(node)

    expect(node.layout?.x).toBe(20)
    expect(node.layout?.y).toBe(10)
  })

  test('computes relative positioning', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'box' })
    ;node.layoutProps = {
      width: 50,
      height: 50,
      position: 'relative',
      top: 10,
      left: 5
    }

    engine.computeLayout(node)

    expect(node.layout?.x).toBe(5)
    expect(node.layout?.y).toBe(10)
  })
})

describe('LayoutEngine.computeLayout - Children', () => {
  test('computes block layout for children', () => {
    const engine = createLayoutEngine(100, 100)
    const parent = createLayoutNode({ type: 'box' })
    const child1 = createLayoutNode({ type: 'box' })
    const child2 = createLayoutNode({ type: 'box' })
    parent.children = [child1, child2]
    child1.parent = parent
    child2.parent = parent

    ;parent.layoutProps = { width: 100, height: 100, display: 'block' }
    ;child1.layoutProps = { width: 50, height: 20 }
    ;child2.layoutProps = { width: 50, height: 30 }

    engine.computeLayout(parent)

    // Block layout stacks vertically
    expect(child1.layout?.x).toBe(0)
    expect(child1.layout?.y).toBe(0)
    expect(child2.layout?.x).toBe(0)
    expect(child2.layout?.y).toBe(20) // After child1
  })

  test('computes flex layout for children', () => {
    const engine = createLayoutEngine(100, 100)
    const parent = createLayoutNode({ type: 'box' })
    const child1 = createLayoutNode({ type: 'box' })
    const child2 = createLayoutNode({ type: 'box' })
    parent.children = [child1, child2]
    child1.parent = parent
    child2.parent = parent

    ;parent.layoutProps = {
      width: 100,
      height: 100,
      display: 'flex',
      flexDirection: 'row',
      gap: 10
    }
    ;child1.layoutProps = { width: 30, height: 20 }
    ;child2.layoutProps = { width: 40, height: 20 }

    engine.computeLayout(parent)

    // Flex layout arranges horizontally
    expect(child1.layout?.x).toBe(0)
    expect(child2.layout?.x).toBe(40) // 30 + 10 gap
  })

  test('respects padding when positioning children', () => {
    const engine = createLayoutEngine(100, 100)
    const parent = createLayoutNode({ type: 'box' })
    const child = createLayoutNode({ type: 'box' })
    parent.children = [child]
    child.parent = parent

    ;parent.layoutProps = {
      width: 100,
      height: 100,
      padding: 10
    }
    ;child.layoutProps = { width: 50, height: 20 }

    engine.computeLayout(parent)

    // Child should be inside padding
    expect(child.layout?.x).toBe(10)
    expect(child.layout?.y).toBe(10)
  })

  test('respects border when positioning children', () => {
    const engine = createLayoutEngine(100, 100)
    const parent = createLayoutNode({ type: 'box' })
    const child = createLayoutNode({ type: 'box' })
    parent.children = [child]
    child.parent = parent

    ;parent.layoutProps = {
      width: 100,
      height: 100,
      border: { width: 1, type: 'line' as const }
    }
    ;child.layoutProps = { width: 50, height: 20 }

    engine.computeLayout(parent)

    // Child should be inside border (1px offset)
    expect(child.layout?.x).toBe(1)
    expect(child.layout?.y).toBe(1)
  })

  test('computes nested layouts correctly', () => {
    const engine = createLayoutEngine(200, 200)
    const root = createLayoutNode({ type: 'box' })
    const parent = createLayoutNode({ type: 'box' })
    const child = createLayoutNode({ type: 'box' })

    root.children = [parent]
    parent.parent = root
    parent.children = [child]
    child.parent = parent

    ;root.layoutProps = { width: 200, height: 200 }
    ;parent.layoutProps = { width: 100, height: 100, margin: 10, padding: 5 }
    ;child.layoutProps = { width: 50, height: 50 }

    engine.computeLayout(root)

    // Parent should be offset by its margin
    expect(parent.layout?.x).toBe(10)
    expect(parent.layout?.y).toBe(10)

    // Child should be inside parent's padding, relative to parent's position
    expect(child.layout?.x).toBe(15) // parent.x(10) + padding(5)
    expect(child.layout?.y).toBe(15)
  })
})

describe('LayoutEngine - display: none', () => {
  test('node with display:none gets zero-size layout', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'box' })
    node.layoutProps = { display: 'none', width: 50, height: 30 }

    engine.computeLayout(node)

    expect(node.layout?.width).toBe(0)
    expect(node.layout?.height).toBe(0)
  })

  test('display:none child contributes zero height in block layout', () => {
    const engine = createLayoutEngine(100, 100)
    const parent = createLayoutNode({ type: 'box' })
    const hidden = createLayoutNode({ type: 'box' })
    const visible = createLayoutNode({ type: 'box' })
    parent.children = [hidden, visible]
    hidden.parent = parent
    visible.parent = parent

    parent.layoutProps = { width: 100, height: 100 }
    hidden.layoutProps = { display: 'none', width: 50, height: 30 }
    visible.layoutProps = { width: 50, height: 20 }

    engine.computeLayout(parent)

    // Visible child starts at y=0 (hidden took no space)
    expect(visible.layout?.y).toBe(0)
    expect(visible.layout?.height).toBe(20)
  })

  test('display:none child excluded from flex positioning', () => {
    const engine = createLayoutEngine(100, 100)
    const parent = createLayoutNode({ type: 'box' })
    const hidden = createLayoutNode({ type: 'box' })
    const visible = createLayoutNode({ type: 'box' })
    parent.children = [hidden, visible]
    hidden.parent = parent
    visible.parent = parent

    parent.layoutProps = { width: 100, height: 50, display: 'flex', flexDirection: 'row', gap: 0 }
    hidden.layoutProps = { display: 'none', width: 40, height: 20 }
    visible.layoutProps = { width: 40, height: 20 }

    engine.computeLayout(parent)

    // Visible child starts at x=0 (hidden excluded from flex)
    expect(visible.layout?.x).toBe(0)
  })
})

describe('LayoutEngine - element default heights', () => {
  test('input without border defaults to height 1', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'input' })
    node.layoutProps = { width: 50 } // no border

    engine.computeLayout(node)

    expect(node.layout?.height).toBe(1)
  })

  test('input with border defaults to height 3 (1 content + 2 border)', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'input' })
    node.layoutProps = { width: 50, border: { width: 1, type: 'line' } }

    engine.computeLayout(node)

    expect(node.layout?.height).toBe(3)
  })

  test('textarea with border defaults to height 5 (3 content + 2 border)', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'textarea' })
    node.layoutProps = { width: 50, border: { width: 1, type: 'line' } }

    engine.computeLayout(node)

    expect(node.layout?.height).toBe(5)
  })

  test('button with border defaults to height 3', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'button' })
    node.layoutProps = { width: 50, border: { width: 1, type: 'line' } }

    engine.computeLayout(node)

    expect(node.layout?.height).toBe(3)
  })

  test('explicit height overrides element default', () => {
    const engine = createLayoutEngine(100, 100)
    const node = createLayoutNode({ type: 'input' })
    node.layoutProps = { width: 50, height: 1, border: { width: 1, type: 'line' } }

    engine.computeLayout(node)

    expect(node.layout?.height).toBe(1)
  })
})

describe('LayoutEngine - scrollable contentHeight', () => {
  test('sets contentHeight after block layout', () => {
    const engine = createLayoutEngine(100, 50)
    const parent = createLayoutNode({ type: 'box' })
    const child1 = createLayoutNode({ type: 'box' })
    const child2 = createLayoutNode({ type: 'box' })
    parent.children = [child1, child2]
    child1.parent = parent
    child2.parent = parent

    parent.layoutProps = { width: 100, height: 50, scrollable: true }
    child1.layoutProps = { width: 100, height: 30 }
    child2.layoutProps = { width: 100, height: 40 }

    engine.computeLayout(parent)

    // contentHeight = total children height = 30 + 40 = 70
    expect(parent.contentHeight).toBe(70)
  })

  test('sets contentHeight after flex layout without shrinking children', () => {
    const engine = createLayoutEngine(100, 50)
    const parent = createLayoutNode({ type: 'box' })
    const child1 = createLayoutNode({ type: 'box' })
    const child2 = createLayoutNode({ type: 'box' })
    parent.children = [child1, child2]
    child1.parent = parent
    child2.parent = parent

    // Flex column, scrollable — children should NOT shrink to fit
    parent.layoutProps = { width: 100, height: 50, display: 'flex', flexDirection: 'column', gap: 0, scrollable: true }
    child1.layoutProps = { width: 100, height: 40 }
    child2.layoutProps = { width: 100, height: 40 }

    engine.computeLayout(parent)

    // Children overflow (no shrink), contentHeight captures total
    expect(parent.contentHeight).toBeGreaterThanOrEqual(80)
  })

  test('scrollable node with no explicit height fills container and keeps maxScroll > 0', () => {
    // This is the real-world case: overflow-y:scroll with no height set.
    // The container must be bounded to its parent height, NOT auto-expand to fit
    // all children — otherwise contentHeight == layout.height and maxScroll is 0.
    const engine = createLayoutEngine(100, 20)
    const parent = createLayoutNode({ type: 'box' })
    const child1 = createLayoutNode({ type: 'box' })
    const child2 = createLayoutNode({ type: 'box' })
    parent.children = [child1, child2]
    child1.parent = parent
    child2.parent = parent

    // No explicit height — mimics `overflow-y: scroll` with no height CSS
    parent.layoutProps = { width: 100, scrollable: true }
    child1.layoutProps = { width: 100, height: 30 }
    child2.layoutProps = { width: 100, height: 40 }

    engine.computeLayout(parent)

    // Viewport fills the container (20), content overflows (70)
    expect(parent.layout!.height).toBe(20)
    expect(parent.contentHeight).toBe(70)
    // maxScroll = contentHeight - height = 70 - 20 = 50 > 0
    expect(parent.contentHeight! - parent.layout!.height).toBeGreaterThan(0)
  })

  test('non-scrollable node does not set contentHeight', () => {
    const engine = createLayoutEngine(100, 100)
    const parent = createLayoutNode({ type: 'box' })
    const child = createLayoutNode({ type: 'box' })
    parent.children = [child]
    child.parent = parent

    parent.layoutProps = { width: 100, height: 100 }
    child.layoutProps = { width: 100, height: 50 }

    engine.computeLayout(parent)

    expect(parent.contentHeight).toBeUndefined()
  })
})

describe('LayoutEngine - nested flex subtree position propagation', () => {
  test('grandchildren of a repositioned flex child get correct absolute positions', () => {
    // Reproduces the showcase nav bug:
    // nav (flex row, gap=1, width=80)
    //   div.left  (width=20)  → should end at x=0
    //   div.right (flex row)  → should start at x=21
    //     button, button, button → should be offset by div.right's final x
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'nav' }, [
      h('div', { class: 'left' }, [
        h('button', {}, '1'),
      ]),
      h('div', { class: 'right' }, [
        h('button', {}, '1'),
        h('button', {}, '2'),
        h('button', {}, '3'),
      ]),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.nav', { display: 'flex', gap: 1 })
    styles.set('.left', { width: 20 })
    styles.set('.right', { display: 'flex', gap: 1 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const left = tree.children[0]!
    const right = tree.children[1]!

    // div.left should start at x=0
    expect(left.layout?.x).toBe(0)
    // div.right must start to the RIGHT of div.left (not overlapping)
    expect(right.layout?.x).toBeGreaterThan(left.layout!.x + left.layout!.width - 1)

    // All buttons inside div.right must be positioned >= div.right.x
    const rightX = right.layout!.x
    for (const btn of right.children) {
      expect(btn.layout?.x).toBeGreaterThanOrEqual(rightX)
    }

    // Buttons inside div.right must be in increasing x order (no overlap)
    const btns = right.children
    for (let i = 1; i < btns.length; i++) {
      const prev = btns[i - 1]!
      const curr = btns[i]!
      expect(curr.layout?.x).toBeGreaterThanOrEqual(prev.layout!.x + prev.layout!.width)
    }
  })
})

describe('LayoutEngine - Integration', () => {
  test('complete layout computation from VNode to positioned nodes', () => {
    const engine = createLayoutEngine(200, 200)

    const vnode = h('box', { class: 'container' }, [
      h('text', { class: 'title' }, 'Title'),
      h('button', { class: 'btn' }, 'Click Me')
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', {
      width: 200,
      height: 200,
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
      padding: 10
    })
    styles.set('.title', { width: 180, height: 30 })
    styles.set('.btn', { width: 180, height: 40 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    // Container
    expect(tree.layout?.width).toBe(200)
    expect(tree.layout?.height).toBe(200)

    // Children should be inside padding (10px)
    const title = tree.children[0]
    const button = tree.children[1]

    expect(title.layout?.x).toBe(10)
    expect(title.layout?.y).toBe(10)

    expect(button.layout?.x).toBe(10)
    expect(button.layout?.y).toBe(50) // title.y(10) + title.height(30) + gap(10)
  })

  test('flexbox with justifyContent and alignItems', () => {
    const engine = createLayoutEngine(200, 100)

    const vnode = h('box', { class: 'container' }, [
      h('box', { class: 'item' }),
      h('box', { class: 'item' }),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', {
      width: 200,
      height: 100,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center'
    })
    styles.set('.item', { width: 30, height: 30 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const [item1, item2] = tree.children

    // Items should be centered horizontally (justifyContent)
    // Total width: 30 + 30 = 60, free space: 200 - 60 = 140, offset: 70
    expect(item1.layout?.x).toBe(70)
    expect(item2.layout?.x).toBe(100)

    // Items should be centered vertically (alignItems)
    // Container height: 100, item height: 30, offset: (100 - 30) / 2 = 35
    expect(item1.layout?.y).toBe(35)
    expect(item2.layout?.y).toBe(35)
  })
})
