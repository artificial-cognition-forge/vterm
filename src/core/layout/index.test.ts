/**
 * Integration tests for the complete layout engine
 *
 * These tests verify the entire layout pipeline from VNodes to positioned layout nodes
 * without any terminal dependencies.
 */

import { test, expect, describe } from 'bun:test'
import { h } from 'vue'
import { createLayoutEngine } from './index'
import type { LayoutProperties } from './types'

describe('Layout Engine Integration', () => {
  test('complete pipeline: VNode -> LayoutTree -> Computed Layout', () => {
    const engine = createLayoutEngine(200, 200)

    const vnode = h('box', { class: 'container' }, [
      h('text', { class: 'title' }, 'Hello World'),
      h('button', { class: 'btn' }, 'Click Me')
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', {
      width: 200,
      height: 200,
      display: 'flex',
      flexDirection: 'column',
      padding: 10
    })
    styles.set('.title', { width: 180, height: 30 })
    styles.set('.btn', { width: 180, height: 40 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    // Verify root layout
    expect(tree.layout).not.toBe(null)
    expect(tree.layout?.width).toBe(200)
    expect(tree.layout?.height).toBe(200)

    // Verify children are positioned
    expect(tree.children).toHaveLength(2)
    expect(tree.children[0].layout).not.toBe(null)
    expect(tree.children[1].layout).not.toBe(null)
  })

  test('complex layout with nested flex containers', () => {
    const engine = createLayoutEngine(300, 200)

    const vnode = h('box', { class: 'root' }, [
      h('box', { class: 'header' }, [
        h('text', { class: 'logo' }, 'Logo'),
        h('box', { class: 'nav' }, [
          h('text', {}, 'Home'),
          h('text', {}, 'About'),
        ])
      ]),
      h('box', { class: 'content' }, 'Main Content')
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.root', {
      width: 300,
      height: 200,
      display: 'flex',
      flexDirection: 'column'
    })
    styles.set('.header', {
      width: 300,
      height: 50,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 5
    })
    styles.set('.logo', { width: 100, height: 40 })
    styles.set('.nav', {
      width: 150,
      height: 40,
      display: 'flex',
      flexDirection: 'row',
      gap: 10
    })
    styles.set('.content', { width: 300, height: 150 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    // Verify structure
    expect(tree.children).toHaveLength(2)
    const [header, content] = tree.children

    expect(header.children).toHaveLength(2)
    expect(header.layout?.height).toBe(50)

    const [logo, nav] = header.children
    expect(logo.type).toBe('text')
    expect(nav.children).toHaveLength(2)
  })

  test('responsive layout with percentage widths', () => {
    const engine = createLayoutEngine(400, 300)

    const vnode = h('box', { class: 'container' }, [
      h('box', { class: 'sidebar' }),
      h('box', { class: 'main' }),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', {
      width: 400,
      height: 300,
      display: 'flex',
      flexDirection: 'row'
    })
    styles.set('.sidebar', { width: '25%', height: 300 })
    styles.set('.main', { width: '75%', height: 300 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const [sidebar, main] = tree.children

    expect(sidebar.layout?.width).toBe(100) // 25% of 400
    expect(main.layout?.width).toBe(300) // 75% of 400
  })

  test('layout with constraints (min/max width/height)', () => {
    const engine = createLayoutEngine(500, 400)

    const vnode = h('box', { class: 'container' }, [
      h('box', { class: 'constrained' })
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', { width: 500, height: 400 })
    styles.set('.constrained', {
      width: 1000, // Will be clamped by maxWidth
      height: 50,
      maxWidth: 300,
      minHeight: 100
    })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const constrained = tree.children[0]

    expect(constrained.layout?.width).toBe(300) // Clamped to maxWidth
    expect(constrained.layout?.height).toBe(100) // Clamped to minHeight
  })

  test('layout with margin, padding, and border', () => {
    const engine = createLayoutEngine(200, 200)

    const vnode = h('box', { class: 'outer' }, [
      h('box', { class: 'inner' })
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.outer', {
      width: 200,
      height: 200,
      padding: 10,
      border: { width: 1, type: 'line' }
    })
    styles.set('.inner', {
      width: 100,
      height: 100,
      margin: 5
    })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const inner = tree.children[0]

    // Inner should be offset by outer's padding + border + its own margin
    // padding(10) + border(1) + margin(5) = 16
    expect(inner.layout?.x).toBe(16)
    expect(inner.layout?.y).toBe(16)
  })

  test('visual styles propagation from CSS', () => {
    const engine = createLayoutEngine(100, 100)

    const vnode = h('box', { class: 'styled' })

    const styles = new Map<string, LayoutProperties>()
    styles.set('.styled', {
      width: 100,
      height: 100,
      visualStyles: {
        fg: 'white',
        bg: 'blue',
        bold: true,
        underline: true
      }
    })

    const tree = engine.buildLayoutTree(vnode, styles)

    expect(tree.style.fg).toBe('white')
    expect(tree.style.bg).toBe('blue')
    expect(tree.style.bold).toBe(true)
    expect(tree.style.underline).toBe(true)
  })

  test('inline props override CSS styles', () => {
    const engine = createLayoutEngine(200, 200)

    const vnode = h('box', {
      class: 'styled',
      width: 150,
      fg: 'red'
    })

    const styles = new Map<string, LayoutProperties>()
    styles.set('.styled', {
      width: 100,
      visualStyles: { fg: 'blue' }
    })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    // Width should be overridden by inline prop
    expect(tree.layout?.width).toBe(150)

    // Color should be overridden by inline prop
    expect(tree.style.fg).toBe('red')
  })

  test('absolute positioning', () => {
    const engine = createLayoutEngine(200, 200)

    const vnode = h('box', { class: 'container' }, [
      h('box', { class: 'absolute' })
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', { width: 200, height: 200 })
    styles.set('.absolute', {
      width: 50,
      height: 50,
      position: 'absolute',
      top: 20,
      left: 30
    })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const absolute = tree.children[0]

    expect(absolute.layout?.x).toBe(30)
    expect(absolute.layout?.y).toBe(20)
  })

  test('relative positioning', () => {
    const engine = createLayoutEngine(200, 200)

    const vnode = h('box', { class: 'container' }, [
      h('box', { class: 'relative' })
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', {
      width: 200,
      height: 200,
      padding: 10
    })
    styles.set('.relative', {
      width: 50,
      height: 50,
      position: 'relative',
      top: 5,
      left: 10
    })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const relative = tree.children[0]

    // Should be offset from padding (10) + relative offset (5, 10)
    expect(relative.layout?.x).toBe(20) // padding(10) + left(10)
    expect(relative.layout?.y).toBe(15) // padding(10) + top(5)
  })

  test('deeply nested layout', () => {
    const engine = createLayoutEngine(300, 300)

    const vnode = h('box', { class: 'level1' }, [
      h('box', { class: 'level2' }, [
        h('box', { class: 'level3' }, [
          h('text', { class: 'level4' }, 'Deep')
        ])
      ])
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.level1', {
      width: 300,
      height: 300,
      padding: 10
    })
    styles.set('.level2', {
      width: 280,
      height: 280,
      padding: 10
    })
    styles.set('.level3', {
      width: 260,
      height: 260,
      padding: 10
    })
    styles.set('.level4', {
      width: 240,
      height: 240
    })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    // Navigate to deepest level
    const level4 = tree.children[0].children[0].children[0]

    // Each level adds 10px padding
    expect(level4.layout?.x).toBe(30) // 10 + 10 + 10
    expect(level4.layout?.y).toBe(30) // 10 + 10 + 10
  })

  test('flexbox with multiple alignment options', () => {
    const engine = createLayoutEngine(300, 200)

    const vnode = h('box', { class: 'container' }, [
      h('box', { class: 'item', style: 'height: 30px' }),
      h('box', { class: 'item', style: 'height: 40px' }),
      h('box', { class: 'item', style: 'height: 50px' }),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', {
      width: 300,
      height: 200,
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10
    })
    styles.set('.item', { width: 80, height: 40 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const [item1, item2, item3] = tree.children

    // space-between should put items at start and end
    expect(item1.layout?.x).toBe(0)
    expect(item3.layout?.x).toBe(220) // 300 - 80

    // center alignment should center items vertically
    const expectedY = (200 - 40) / 2
    expect(item1.layout?.y).toBe(expectedY)
    expect(item2.layout?.y).toBe(expectedY)
    expect(item3.layout?.y).toBe(expectedY)
  })
})

describe('HTML element sizing defaults', () => {
  test('headings default to 1 line tall and full container width', () => {
    const engine = createLayoutEngine(80, 24)
    for (const tag of ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] as const) {
      const tree = engine.buildLayoutTree(h(tag, {}, 'Title'), new Map())
      engine.computeLayout(tree)
      expect(tree.layout?.height).toBe(1)
      expect(tree.layout?.width).toBe(80)
    }
  })

  test('p and li default to 1 line tall', () => {
    const engine = createLayoutEngine(80, 24)
    for (const tag of ['p', 'li', 'label'] as const) {
      const tree = engine.buildLayoutTree(h(tag, {}, 'text'), new Map())
      engine.computeLayout(tree)
      expect(tree.layout?.height).toBe(1)
    }
  })

  test('inline elements (span, strong, em, code) shrink to content width', () => {
    const engine = createLayoutEngine(80, 24)
    for (const tag of ['span', 'strong', 'em', 'code'] as const) {
      const tree = engine.buildLayoutTree(h(tag, {}, 'word'), new Map())
      engine.computeLayout(tree)
      expect(tree.layout?.width).toBe(0)
      expect(tree.layout?.height).toBe(1)
    }
  })

  test('container elements (div, section, nav, ul, ol) shrink to fit children', () => {
    const engine = createLayoutEngine(80, 24)
    for (const tag of ['div', 'section', 'nav', 'ul', 'ol'] as const) {
      const tree = engine.buildLayoutTree(h(tag, {}), new Map())
      engine.computeLayout(tree)
      expect(tree.layout?.height).toBe(0)
    }
  })

  test('single-line form elements default to height 1', () => {
    const engine = createLayoutEngine(80, 24)
    for (const tag of ['button', 'input', 'select'] as const) {
      const tree = engine.buildLayoutTree(h(tag, {}), new Map())
      engine.computeLayout(tree)
      expect(tree.layout?.height).toBe(1)
    }
  })

  test('textarea defaults to 3 lines tall', () => {
    const engine = createLayoutEngine(80, 24)
    const tree = engine.buildLayoutTree(h('textarea', {}), new Map())
    engine.computeLayout(tree)
    expect(tree.layout?.height).toBe(3)
  })

  test('HTML layout composes correctly in a realistic component', () => {
    const engine = createLayoutEngine(80, 24)
    const vnode = h('div', { class: 'card' }, [
      h('h2', { class: 'title' }, 'Settings'),
      h('p', { class: 'desc' }, 'Configure your preferences'),
      h('div', { class: 'row' }, [
        h('label', { class: 'lbl' }, 'Name'),
        h('input', { class: 'inp' }),
      ]),
      h('button', { class: 'btn' }, 'Save'),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.card', { width: 40, display: 'flex', flexDirection: 'column', padding: 1 })
    styles.set('.title', { width: 38 })
    styles.set('.desc',  { width: 38 })
    styles.set('.row',   { width: 38, display: 'flex', flexDirection: 'row' })
    styles.set('.lbl',   { width: 10 })
    styles.set('.inp',   { width: 28 })
    styles.set('.btn',   { width: 38 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    expect(tree.children).toHaveLength(4)
    expect(tree.children[0].type).toBe('h2')
    expect(tree.children[1].type).toBe('p')
    expect(tree.children[2].type).toBe('div')
    expect(tree.children[3].type).toBe('button')

    // All children should have computed layout
    for (const child of tree.children) {
      expect(child.layout).not.toBeNull()
    }

    // Row children (label + input)
    const row = tree.children[2]
    expect(row.children).toHaveLength(2)
    expect(row.children[0].type).toBe('label')
    expect(row.children[1].type).toBe('input')
  })
})

describe('Performance Benchmarks', () => {
  test('layout computation should be fast for 100 nodes', () => {
    const engine = createLayoutEngine(800, 600)

    // Create a grid of 100 items (10x10)
    const items = Array.from({ length: 100 }, (_, i) =>
      h('box', { class: 'item' }, `Item ${i}`)
    )

    const vnode = h('box', { class: 'grid' }, items)

    const styles = new Map<string, LayoutProperties>()
    styles.set('.grid', {
      width: 800,
      height: 600,
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap'
    })
    styles.set('.item', { width: 80, height: 60 })

    const startTime = performance.now()
    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)
    const endTime = performance.now()

    const duration = endTime - startTime

    expect(tree.children).toHaveLength(100)
    expect(duration).toBeLessThan(5) // Should be < 5ms for 100 nodes
  })
})
