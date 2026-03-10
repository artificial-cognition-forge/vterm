/**
 * Comprehensive test for nested flex/block layout bug
 *
 * This test reproduces the exact scenario the user reported:
 * - Working case: three sibling divs
 * - Broken case: two divs nested inside a wrapper div
 */

import { test, expect, describe } from 'bun:test'
import { h } from 'vue'
import { createLayoutEngine } from '../src/core/layout/tree'
import type { LayoutProperties } from '../src/core/layout/types'

describe('nested layout comprehensive tests', () => {
  test('three root-level siblings (working case)', () => {
    const engine = createLayoutEngine(80, 24)

    // Exact structure from user's working case
    const vnode = h('div', {}, [
      h('div', {}),  // empty wrapper
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.content2', { width: 5, height: '100%' })
    styles.set('.content', { width: 25, height: '100%' })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    expect(tree.children).toHaveLength(3)
    expect(tree.children[1]?.layout?.width).toBe(5)
    expect(tree.children[2]?.layout?.width).toBe(25)
    console.log('✓ Root siblings:', {
      child0: tree.children[0]?.layout,
      child1: tree.children[1]?.layout,
      child2: tree.children[2]?.layout,
    })
  })

  test('two nested children (broken case)', () => {
    const engine = createLayoutEngine(80, 24)

    // Exact structure from user's broken case
    const vnode = h('div', {}, [
      h('div', {}, [
        h('div', { class: 'content2' }, 'b'),
        h('div', { class: 'content' }, 'a'),
      ]),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.content2', { width: 5, height: '100%' })
    styles.set('.content', { width: 25, height: '100%' })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    console.log('\n=== NESTED CASE ===')
    console.log('Root:', tree.layout)
    console.log('Wrapper:', tree.children[0]?.layout)
    console.log('Content2:', tree.children[0]?.children[0]?.layout)
    console.log('Content:', tree.children[0]?.children[1]?.layout)

    expect(tree.children).toHaveLength(1)
    const wrapper = tree.children[0]!
    expect(wrapper.children).toHaveLength(2)
    expect(wrapper.children[0]?.layout?.width).toBe(5)
    expect(wrapper.children[1]?.layout?.width).toBe(25)
  })

  test('nested with explicit wrapper height', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'wrapper' }, [
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.wrapper', { width: 80, height: 24 })
    styles.set('.content2', { width: 5, height: '100%' })
    styles.set('.content', { width: 25, height: '100%' })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    expect(tree.children).toHaveLength(2)
    expect(tree.children[0]?.layout?.width).toBe(5)
    expect(tree.children[0]?.layout?.height).toBe(24)
    expect(tree.children[1]?.layout?.width).toBe(25)
    expect(tree.children[1]?.layout?.height).toBe(24)
  })

  test('deeply nested flex containers (grandchildren)', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'root' }, [
      h('div', { class: 'container' }, [
        h('div', { class: 'child1' }, 'a'),
        h('div', { class: 'child2' }, 'b'),
      ]),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.root', { width: 80, height: 24, display: 'flex', flexDirection: 'column' })
    styles.set('.container', { display: 'flex', flexDirection: 'row' })
    styles.set('.child1', { width: 10, height: 5 })
    styles.set('.child2', { width: 20, height: 5 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const container = tree.children[0]!
    console.log('\n=== DEEPLY NESTED ===')
    console.log('Container:', container.layout)
    console.log('Child1:', container.children[0]?.layout)
    console.log('Child2:', container.children[1]?.layout)

    expect(container.layout?.width).toBeGreaterThan(0)
    expect(container.children[0]?.layout?.width).toBe(10)
    expect(container.children[1]?.layout?.width).toBe(20)
  })
})
