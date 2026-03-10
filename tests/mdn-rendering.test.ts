/**
 * Actual rendering test of the MDN example that's broken
 */

import { test, expect, describe } from 'bun:test'
import { h } from 'vue'
import { createLayoutEngine } from '../src/core/layout/tree'
import { BufferRenderer } from '../src/runtime/renderer/buffer-renderer'
import { ScreenBuffer } from '../src/runtime/terminal/buffer'
import { buildStackingContextTree } from '../src/core/layout/stacking-context'
import type { LayoutProperties } from '../src/core/layout/types'

describe('MDN example actual rendering', () => {
  test('MDN flex example - check what actually renders', () => {
    const engine = createLayoutEngine(80, 24)

    const vnode = h('div', { class: 'container' }, [
      h('div', { class: 'content2' }, 'b'),
      h('div', { class: 'content' }, 'a'),
    ])

    const styles = new Map<string, LayoutProperties>()
    styles.set('.container', { display: 'flex' })
    styles.set('.content2', { width: 5, height: 24, background: 'yellow' })
    styles.set('.content', { width: 25, height: 24, background: 'blue' })

    const tree = engine.buildLayoutTree(vnode, styles)

    console.log('\n=== TREE BEFORE LAYOUT ===')
    console.log('buildLayoutTree returned:', { id: tree.id, type: tree.type, class: tree.props.class, children: tree.children.length })
    function printTree(node: any, indent = '') {
      console.log(`${indent}${node.id}: ${node.type} class="${node.props.class}" content="${node.content}"`)
      for (const child of node.children) {
        printTree(child, indent + '  ')
      }
    }
    printTree(tree)

    engine.computeLayout(tree)

    console.log('\n=== LAYOUT AFTER COMPUTE ===')
    console.log('Tree root after layout:', { id: tree.id, type: tree.type, class: tree.props.class, children: tree.children.length })
    console.log('Full tree structure AFTER layout:')
    printTree(tree)

    console.log('\nDirect children analysis with full props:')
    console.log('Children:')
    for (let i = 0; i < tree.children.length; i++) {
      const child = tree.children[i]!
      console.log(`  [${i}] id=${child.id} type=${child.type} class="${child.props.class}"`)
      console.log(`       layout: x=${child.layout?.x} y=${child.layout?.y} w=${child.layout?.width} h=${child.layout?.height}`)
      console.log(`       layoutProps: width=${child.layoutProps.width} height=${child.layoutProps.height} background=${child.layoutProps.background}`)
      console.log(`       style: fg=${child.style.fg} bg=${child.style.bg}`)
    }

    // Build stacking context to see what gets rendered
    const context = buildStackingContextTree(tree)
    console.log('\n=== STACKING CONTEXT ===')
    console.log('Root context:', {
      root: context.root.type,
      children: context.childrenByZIndex.size,
      nestedContexts: context.nestedContexts.length
    })
    console.log('Children by Z-Index:', Array.from(context.childrenByZIndex.keys()))
    for (const [zIdx, nodes] of context.childrenByZIndex) {
      console.log(`  ${zIdx}:`, nodes.map(n => `${n.type}(${n.id})`).join(', '))
    }

    // Try to render
    const buffer = new ScreenBuffer(80, 24)
    const renderer = new BufferRenderer()
    renderer.render(tree, buffer)

    console.log('\n=== RENDERED OUTPUT ===')
    // Show first 10 rows, first 30 columns
    for (let y = 0; y < 10; y++) {
      let row = ''
      for (let x = 0; x < 30; x++) {
        const cell = buffer.getCell(x, y)
        row += cell.char || ' '
      }
      console.log(`Row ${String(y).padStart(2)}: [${row}]`)
    }

    // Check if anything was actually rendered
    let renderedCount = 0
    for (let y = 0; y < buffer.height; y++) {
      for (let x = 0; x < buffer.width; x++) {
        const cell = buffer.getCell(x, y)
        if (cell.char && cell.char !== ' ') renderedCount++
      }
    }
    console.log(`\nTotal rendered cells: ${renderedCount}`)
    console.log('Expected at least 24 cells (5 + 25 wide, 1 high for each column)')
  })
})
