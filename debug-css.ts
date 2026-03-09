import { transformCSSToLayout } from './src/core/css'

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

const styles = await transformCSSToLayout(css)

console.log('=== Transformed CSS Styles ===')
console.log('Type:', typeof styles)
console.log('Keys:', Object.keys(styles))

for (const className in styles) {
  const props = (styles as any)[className]
  console.log(`\n.${className}:`)
  console.log(JSON.stringify(props, null, 2))
}
