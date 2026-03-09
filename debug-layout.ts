import { h } from 'vue'
import { createLayoutEngine } from './src/core/layout'
import { transformCSSToLayout } from './src/core/css'

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

const tree = h('div', {},
  h('div', { class: 'loader' }),
  h('div', { class: 'chat-container' }, 'Chat text')
)

const engine = createLayoutEngine(80, 24)
const styles = await transformCSSToLayout(css)
const root = engine.buildLayoutTree(tree, styles)
engine.computeLayout(root)

console.log('=== Computed Layouts ===')
console.log('Root layout:', root.layout ? {x: root.layout.x, y: root.layout.y, w: root.layout.width, h: root.layout.height} : 'NULL!')

for (let i = 0; i < root.children.length; i++) {
  const child = root.children[i]
  console.log(`\nChild ${i}:`)
  console.log(`  layout:`, child.layout ? {x: child.layout.x, y: child.layout.y, w: child.layout.width, h: child.layout.height} : 'NULL!')
  console.log(`  style.bg: ${child.style.bg}`)
  console.log(`  style.invisible: ${child.style.invisible}`)
  console.log(`  style.transparent: ${child.style.transparent}`)
}
