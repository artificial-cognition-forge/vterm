/**
 * Bug reproduction test for nested flex container issue
 *
 * Issue: When children are placed inside a flex container,
 * they render correctly. But when they're in a block container
 * or when specific layout patterns are used, rendering may fail.
 */

import { test, expect, describe } from 'bun:test'
import { h } from 'vue'
import { createLayoutEngine } from '../src/core/layout/tree'
import type { LayoutProperties } from '../src/core/layout/types'

describe('nested layout bug reproduction', () => {
  test('root-level siblings with explicit root height', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'root' }, [
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.root', { width: 80, height: 24 })
    styles.set('.content2', { width: 5, height: '100%' })
    styles.set('.content', { width: 25, height: '100%' })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    expect(tree.children).toHaveLength(2)
    expect(tree.children[0]?.layout?.width).toBe(5)
    expect(tree.children[0]?.layout?.height).toBe(24)
    expect(tree.children[1]?.layout?.width).toBe(25)
    expect(tree.children[1]?.layout?.height).toBe(24)
    console.log('✓ Root-level siblings:', tree.children[0]?.layout?.width, tree.children[1]?.layout?.width)
  })

  test('children in flex row container', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'container' }, [
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', { width: 80, height: 24, display: 'flex', flexDirection: 'row' })
    styles.set('.content2', { width: 5 })
    styles.set('.content', { width: 25 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    console.log('\n=== FLEX ROW ===')
    console.log('Container:', tree.layout?.width, 'x', tree.layout?.height)
    console.log('Child 0:', tree.children[0]?.layout?.width, 'x', tree.children[0]?.layout?.height)
    console.log('Child 1:', tree.children[1]?.layout?.width, 'x', tree.children[1]?.layout?.height)

    expect(tree.children).toHaveLength(2)
    expect(tree.children[0]?.layout?.width).toBe(5)
    expect(tree.children[1]?.layout?.width).toBe(25)
  })

  test('children in flex column container', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'container' }, [
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', { width: 80, height: 24, display: 'flex', flexDirection: 'column' })
    styles.set('.content2', { width: '100%', height: 5 })
    styles.set('.content', { width: '100%', height: 10 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    console.log('\n=== FLEX COLUMN ===')
    console.log('Container:', tree.layout?.width, 'x', tree.layout?.height)
    console.log('Child 0:', tree.children[0]?.layout?.width, 'x', tree.children[0]?.layout?.height)
    console.log('Child 1:', tree.children[1]?.layout?.width, 'x', tree.children[1]?.layout?.height)

    expect(tree.children).toHaveLength(2)
    expect(tree.children[0]?.layout?.height).toBe(5)
    expect(tree.children[1]?.layout?.height).toBe(10)
  })
})
