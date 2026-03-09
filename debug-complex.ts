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
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: red;
  }

  .chat-container {
    width: 100%;
    height: 100%;
    background: blue;
  }
`

// Two divs as children of root
const tree = h('div', {},
  h('div', { class: 'loader' }),
  h('div', { class: 'chat-container' }, 'Chat text')
)

const engine = createLayoutEngine(80, 24)
const styles = await transformCSSToLayout(css)
const root = engine.buildLayoutTree(tree, styles)
engine.computeLayout(root)

console.log('=== Child Styles ===')
for (let i = 0; i < root.children.length; i++) {
  const child = root.children[i]
  console.log(`Child ${i}:`)
  console.log(`  type: ${child.type}`)
  console.log(`  layoutProps.visualStyles:`, child.layoutProps.visualStyles)
  console.log(`  style.bg: ${child.style.bg}`)
  console.log(`  style.fg: ${child.style.fg}`)
}

console.log('\n=== Rendering ===')
const buffer = new ScreenBuffer(80, 24)
const renderer = new BufferRenderer()
renderer.render(root, buffer)

console.log('\nSample cells:')
for (let y = 0; y < 5; y++) {
  const row: string[] = []
  for (let x = 0; x < 40; x++) {
    const cell = buffer.getCell(x, y)
    row.push(cell?.background || ' ')
  }
  console.log(`Y=${y}: ${row.join('')}`)
}

// Check for text bleed
console.log('\nChecking for text bleed:')
for (let y = 0; y < 24; y++) {
  for (let x = 0; x < 80; x++) {
    const cell = buffer.getCell(x, y)
    if (cell && cell.char === 'C') {
      console.log(`  Found 'C' at (${x},${y}) with bg=${cell.background}`)
    }
  }
}
