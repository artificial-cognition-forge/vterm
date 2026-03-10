/**
 * Reproduces the exact MDN example bug
 *
 * Original: works fine
 * <div>
 *   <div class="content2">b</div>
 *   <div class="content">a</div>
 * </div>
 *
 * Modified: breaks
 * <div class="container">  <!-- container has display: flex -->
 *   <div class="content2">b</div>
 *   <div class="content">a</div>
 * </div>
 */

import { test, expect, describe } from 'bun:test'
import { h } from 'vue'
import { createLayoutEngine } from '../src/core/layout/tree'
import type { LayoutProperties } from '../src/core/layout/types'

describe('MDN example flex bug', () => {
  const sharedStyles = new Map<string, LayoutProperties>()
  sharedStyles.set('.content2', { width: 5, height: '100%', background: 'pink' })
  sharedStyles.set('.content', { width: 25, height: '100%', background: 'pink' })

  test('original: plain div wrapper (works)', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', {}, [
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const tree = engine.buildLayoutTree(vnode, sharedStyles)
    engine.computeLayout(tree)

    expect(tree.children).toHaveLength(2)
    expect(tree.children[0]?.layout?.width).toBe(5)
    expect(tree.children[1]?.layout?.width).toBe(25)
    console.log('✓ Original works:')
    console.log('  Content2:', tree.children[0]?.layout?.width, 'x', tree.children[0]?.layout?.height)
    console.log('  Content:', tree.children[1]?.layout?.width, 'x', tree.children[1]?.layout?.height)
  })

  test('modified: flex container (breaks)', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'container' }, [
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const styles = new Map<string, LayoutProperties>(sharedStyles)
    styles.set('.container', { display: 'flex' })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    expect(tree.children).toHaveLength(2)

    console.log('\n✗ Modified (flex container):')
    console.log('  Container:', tree.layout?.width, 'x', tree.layout?.height, '(display: flex)')
    console.log('  Content2:', tree.children[0]?.layout?.width, 'x', tree.children[0]?.layout?.height)
    console.log('  Content:', tree.children[1]?.layout?.width, 'x', tree.children[1]?.layout?.height)

    // This is what we expect:
    expect(tree.children[0]?.layout?.width).toBe(5)
    expect(tree.children[1]?.layout?.width).toBe(25)
  })

  test('fix attempt: flex container with explicit height', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'container' }, [
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const styles = new Map<string, LayoutProperties>(sharedStyles)
    styles.set('.container', { display: 'flex', height: 24 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    console.log('\n✓ With explicit height on container:')
    console.log('  Container:', tree.layout?.width, 'x', tree.layout?.height)
    console.log('  Content2:', tree.children[0]?.layout?.width, 'x', tree.children[0]?.layout?.height)
    console.log('  Content:', tree.children[1]?.layout?.width, 'x', tree.children[1]?.layout?.height)

    expect(tree.children[0]?.layout?.width).toBe(5)
    expect(tree.children[0]?.layout?.height).toBe(24)
    expect(tree.children[1]?.layout?.width).toBe(25)
    expect(tree.children[1]?.layout?.height).toBe(24)
  })
})
