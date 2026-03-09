/**
 * Complete z-index test with proper layout dimensions
 */
import { h } from 'vue'
import { ScreenBuffer } from './src/runtime/terminal/buffer'
import { BufferRenderer } from './src/runtime/renderer/buffer-renderer'
import { createLayoutEngine } from './src/core/layout'
import { transformCSSToLayout } from './src/core/css'

const css = `
  .app {
    width: 100%;
    height: 100%;
    background: blue;
  }

  .loader {
    position: absolute;
    z-index: 2;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: red;
  }

  .content {
    width: 100%;
    height: 100%;
  }
`

// Proper structure with explicit root dimensions
const tree = h('div', { class: 'app' },
  h('div', { class: 'loader' }),
  h('div', { class: 'content' }, 'Content text should be hidden')
)

const engine = createLayoutEngine(80, 24)
const styles = await transformCSSToLayout(css)
const root = engine.buildLayoutTree(tree, styles)
engine.computeLayout(root)

console.log('=== Layouts ===')
console.log('Root:', root.layout ? `${root.layout.width}x${root.layout.height}` : 'NULL')
for (let i = 0; i < root.children.length; i++) {
  const child = root.children[i]
  console.log(`Child ${i}:`, child.layout ? `${child.layout.width}x${child.layout.height}, bg=${child.style.bg}` : 'NULL')
}

const buffer = new ScreenBuffer(80, 24)
const renderer = new BufferRenderer()
renderer.render(root, buffer)

console.log('\n=== Rendering Check ===')
let redCells = 0
let blueCells = 0
let textCells = 0

for (let y = 0; y < 24; y++) {
  for (let x = 0; x < 80; x++) {
    const cell = buffer.getCell(x, y)
    if (cell?.background === 'red') redCells++
    if (cell?.background === 'blue') blueCells++
    if (cell?.char && cell.char.trim()) textCells++
  }
}

console.log(`Red cells: ${redCells} (should be 80x24 = 1920)`)
console.log(`Blue cells: ${blueCells} (should be 0 - hidden behind red)`)
console.log(`Text cells: ${textCells} (should be 0 - hidden behind red)`)

if (redCells >= 1920 && blueCells === 0 && textCells === 0) {
  console.log('\n✅ SUCCESS: Loader properly covers all content!')
} else {
  console.log('\n❌ FAILURE: Content is bleeding through!')
  console.log('\nSample row (y=0, x=0..40):')
  for (let x = 0; x < 40; x++) {
    const cell = buffer.getCell(x, 0)
    process.stdout.write(cell?.background === 'red' ? 'R' : cell?.background === 'blue' ? 'B' : 'X')
  }
  console.log()
}
