import { h } from 'vue'
import { transformCSSToLayout } from './src/core/css/transformer'
import { createLayoutEngine } from './src/core/layout'
import { ScreenBuffer } from './src/runtime/terminal/buffer'
import { BufferRenderer } from './src/runtime/renderer/buffer-renderer'
import type { LayoutNode } from './src/core/layout/types'

async function test() {
    // Without border first
    const css = `.code { width: 10; height: 3; padding: 1; }`
    const vnode = h('code', { class: 'code' }, 'test')
    
    const parsed = await transformCSSToLayout(css)
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(20, 10)
    const tree = engine.buildLayoutTree(vnode, styles)
    engine.computeLayout(tree)
    
    const buffer = new ScreenBuffer(20, 10)
    const renderer = new BufferRenderer()
    renderer.render(tree, buffer)
    
    console.log('Without border:')
    for (let y = 0; y < 5; y++) {
        let row = ''
        for (let x = 0; x < 12; x++) {
            const cell = buffer.getCell(x, y)
            row += cell?.char ?? ' '
        }
        console.log(`y${y}: "${row}"`)
    }
    
    // Now with border
    const css2 = `.code { width: 10; height: 3; border: 1px solid white; padding: 1; }`
    const vnode2 = h('code', { class: 'code' }, 'test')
    
    const parsed2 = await transformCSSToLayout(css2)
    const styles2 = new Map(Object.entries(parsed2))
    const engine2 = createLayoutEngine(20, 10)
    const tree2 = engine2.buildLayoutTree(vnode2, styles2)
    engine2.computeLayout(tree2)
    
    const buffer2 = new ScreenBuffer(20, 10)
    const renderer2 = new BufferRenderer()
    renderer2.render(tree2, buffer2)
    
    console.log('\nWith border:')
    for (let y = 0; y < 5; y++) {
        let row = ''
        for (let x = 0; x < 12; x++) {
            const cell = buffer2.getCell(x, y)
            row += cell?.char ?? ' '
        }
        console.log(`y${y}: "${row}"`)
    }
}

test()
