import { buildStackingContextTree } from './src/core/layout/stacking-context'
import { h } from 'vue'
import { createLayoutEngine } from './src/core/layout'
import { transformCSSToLayout } from './src/core/css'

const css = `
  .app {
    width: 100%;
    height: 100%;
  }

  .loader {
    position: absolute;
    z-index: 2;
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
  h('div', { class: 'content' }, 'text')
)

const engine = createLayoutEngine(80, 24)
const styles = await transformCSSToLayout(css)
const root = engine.buildLayoutTree(tree, styles)
engine.computeLayout(root)

const context = buildStackingContextTree(root)

console.log('=== Detailed Render Order ===')
for (let i = 0; i < context.renderOrder.length; i++) {
  const layer = context.renderOrder[i]
  console.log(`[${i}] type=${layer.type}, zIndex=${JSON.stringify(layer.zIndex)}, pass=${layer.pass}, nodes=${layer.nodes.length}`)
}
