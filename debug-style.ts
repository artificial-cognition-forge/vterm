import { h } from 'vue'
import { createLayoutEngine } from './src/core/layout'
import { transformCSSToLayout } from './src/core/css'

const css = `
  .loader {
    position: absolute;
    z-index: 2;
    width: 100%;
    height: 100%;
    background: red;
  }
`

const tree = h('div', { class: 'loader' }, 'content')

const engine = createLayoutEngine(80, 24)
const styles = await transformCSSToLayout(css)

console.log('=== CSS Transformation ===')
const loaderProps = (styles as any)['.loader']
console.log('Loader props:', JSON.stringify(loaderProps, null, 2))

console.log('\n=== Building Layout Tree ===')
const root = engine.buildLayoutTree(tree, styles)

console.log('\n=== Node Style ===')
console.log('Node type:', root.type)
console.log('Node layoutProps:', JSON.stringify(root.layoutProps, null, 2))
console.log('Node style:', JSON.stringify(root.style, null, 2))
