/**
 * Debug script to reproduce the text-bleed-through issue
 * Mimics the axon cli structure
 */

import { h } from 'vue'
import { ScreenBuffer } from './src/runtime/terminal/buffer'
import { BufferRenderer } from './src/runtime/renderer/buffer-renderer'
import { createLayoutEngine } from './src/core/layout'
import { transformCSSToLayout } from './src/core/css'
import { buildStackingContextTree } from './src/core/layout/stacking-context'

const css = `
  .loader {
    position: absolute;
    z-index: 2;
    width: 100%;
    height: 100%;
    background: red;
  }

  .chat-container {
    width: 100%;
    height: 100%;
  }
`

// Root with loader on top, chat-container below
const tree = h('div', {},
  h('div', { class: 'loader' }),
  h('div', { class: 'chat-container' }, 'This is chat text that should NOT be visible')
)

const engine = createLayoutEngine(80, 24)
const styles = await transformCSSToLayout(css)
const root = engine.buildLayoutTree(tree, styles)
engine.computeLayout(root)

console.log('=== Tree Structure ===')
console.log('Root children:', root.children.length)
for (let i = 0; i < root.children.length; i++) {
  const child = root.children[i]
  console.log(`Child ${i}: type=${child.type}, content=${child.content ? child.content.substring(0, 20) : 'null'}, z-index=${child.layoutProps.zIndex}, position=${child.layoutProps.position}`)
}

const context = buildStackingContextTree(root)
console.log('\n=== Stacking Context ===')
console.log('Root context render order:')
for (const layer of context.renderOrder) {
  console.log(`  Layer: type=${layer.type}, zindex=${layer.zIndex}, pass=${layer.pass}, nodes=${layer.nodes.length}`)
  for (const node of layer.nodes) {
    console.log(`    - ${node.type}: bg=${node.style.bg}, content=${node.content ? node.content.substring(0, 20) : 'null'}`)
  }
}
console.log('Nested contexts:', context.nestedContexts.length)
for (let i = 0; i < context.nestedContexts.length; i++) {
  const nc = context.nestedContexts[i]
  console.log(`  Nested ${i}: z-index=${nc.root.layoutProps.zIndex}`)
}

const buffer = new ScreenBuffer(80, 24)
const renderer = new BufferRenderer()
renderer.render(root, buffer)

console.log('\n=== Rendered Buffer Sample ===')
console.log('Cell (0,0):', buffer.getCell(0, 0) ? {char: buffer.getCell(0, 0)?.char, bg: buffer.getCell(0, 0)?.background} : 'null')
console.log('Cell (0,1):', buffer.getCell(0, 1) ? {char: buffer.getCell(0, 1)?.char, bg: buffer.getCell(0, 1)?.background} : 'null')
console.log('Cell (0,5):', buffer.getCell(0, 5) ? {char: buffer.getCell(0, 5)?.char, bg: buffer.getCell(0, 5)?.background} : 'null')

// Check if any text is visible (should be all reds or spaces with red background)
let textVisible = false
for (let y = 0; y < 24; y++) {
  for (let x = 0; x < 80; x++) {
    const cell = buffer.getCell(x, y)
    if (cell && cell.char && cell.char.trim() && cell.background !== 'red') {
      console.log(`\n⚠️  TEXT BLEED DETECTED at (${x},${y}): "${cell.char}" with bg=${cell.background}`)
      textVisible = true
      break
    }
  }
  if (textVisible) break
}

if (!textVisible) {
  console.log('\n✓ No text bleed - loader is properly covering content')
}
