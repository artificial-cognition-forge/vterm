/**
 * Bug test: Clipping box with height=0 prevents children from rendering
 *
 * When a flex container has no explicit height (height=0),
 * the clipping box for its children becomes height=0,
 * which prevents any rendering.
 */

import { test, expect, describe } from 'bun:test'
import { h } from 'vue'
import { createLayoutEngine } from '../src/core/layout/tree'
import { RenderingPass } from '../src/runtime/renderer/rendering-pass'
import { ScreenBuffer } from '../src/runtime/terminal/buffer'
import type { LayoutProperties } from '../src/core/layout/types'

describe('rendering clipping box bug', () => {
  test('flex container with height=0 has children but no clip box', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'container' }, [
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', { display: 'flex', width: 80 }) // No height!
    styles.set('.content2', { width: 5, height: 5 })
    styles.set('.content', { width: 25, height: 5 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    console.log('Container layout:',  {
      w: tree.layout?.width,
      h: tree.layout?.height,
      display: tree.layoutProps.display
    })
    console.log('Children layout:', [
      { w: tree.children[0]?.layout?.width, h: tree.children[0]?.layout?.height },
      { w: tree.children[1]?.layout?.width, h: tree.children[1]?.layout?.height }
    ])

    // Container has no explicit height → height=0
    expect(tree.layout?.height).toBe(0)

    // But children should still have their explicit heights!
    expect(tree.children[0]?.layout?.height).toBe(5)
    expect(tree.children[1]?.layout?.height).toBe(5)

    // Try to render - this should show the children but might not due to clip box bug
    const buffer = new ScreenBuffer(80, 24)
    const pass = new RenderingPass(buffer, tree, { isTextPass: false })
    pass.render()

    console.log('\n=== RENDERING RESULT ===')
    console.log('Buffer content (first 5 chars of first 10 rows):')
    for (let y = 0; y < 10; y++) {
      let row = ''
      for (let x = 0; x < 5; x++) {
        const cell = buffer.getCell(x, y)
        row += cell.char || '.'
      }
      console.log(`Row ${y}: [${row}]`)
    }

    // The bug: if clip box is height=0, nothing gets rendered
    // The children have dimensions but are invisible due to clipping
  })

  test('comparison: block container renders children correctly', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'container' }, [
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', { width: 80 }) // Block layout (no display: flex)
    styles.set('.content2', { width: 5, height: 5 })
    styles.set('.content', { width: 25, height: 5 })

    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)

    const buffer = new ScreenBuffer(80, 24)
    const pass = new RenderingPass(buffer, tree, { isTextPass: false })
    pass.render()

    console.log('\n=== BLOCK CONTAINER (WORKS) ===')
    console.log('Buffer content (first 5 chars of first 10 rows):')
    for (let y = 0; y < 10; y++) {
      let row = ''
      for (let x = 0; x < 5; x++) {
        const cell = buffer.getCell(x, y)
        row += cell.char || '.'
      }
      console.log(`Row ${y}: [${row}]`)
    }
  })
})
