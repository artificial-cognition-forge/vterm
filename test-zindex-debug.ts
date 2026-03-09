import { h } from 'vue'
import { createLayoutEngine } from './src/core/layout'
import { transformCSSToLayout } from './src/core/css'
import { buildStackingContextTree } from './src/core/layout/stacking-context'

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

const tree = h('div', { class: 'app' },
  h('div', { class: 'loader' }),
  h('div', { class: 'content' }, 'Content text should be hidden')
)

const engine = createLayoutEngine(80, 24)
const styles = await transformCSSToLayout(css)
const root = engine.buildLayoutTree(tree, styles)
engine.computeLayout(root)

const context = buildStackingContextTree(root)

console.log('=== Root Context ===')
console.log('Render order:')
for (const layer of context.renderOrder) {
  console.log(`  Layer: type=${layer.type}, z=${layer.zIndex}, pass=${layer.pass}, nodes=${layer.nodes.length}`)
  for (const node of layer.nodes) {
    console.log(`    - ${node.type}: content="${node.content ? node.content.substring(0, 20) : 'null'}"`)
  }
}

console.log('\nNested contexts:', context.nestedContexts.length)
for (let i = 0; i < context.nestedContexts.length; i++) {
  const nc = context.nestedContexts[i]
  console.log(`\nNested context ${i}: z-index=${nc.root.layoutProps.zIndex}`)
  console.log(`  Root: type=${nc.root.type}, bg=${nc.root.style.bg}`)
  console.log(`  Render order:`)
  for (const layer of nc.renderOrder) {
    console.log(`    Layer: type=${layer.type}, z=${layer.zIndex}, pass=${layer.pass}, nodes=${layer.nodes.length}`)
    for (const node of layer.nodes) {
      console.log(`      - ${node.type}: bg=${node.style.bg}, content="${node.content ? node.content.substring(0, 10) : 'null'}"`)
    }
  }
}
