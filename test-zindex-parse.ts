import { transformCSSToLayout } from './src/core/css'

const css = `
  .bottom { position: absolute; left: 0; top: 0; width: 20; height: 10; background: green; z-index: 1; }
  .top { position: absolute; left: 5; top: 2; width: 10; height: 8; background: red; z-index: 10; }
`

const styles = await transformCSSToLayout(css)
console.log('Parsed CSS styles:')
console.log('.bottom:', styles['.bottom'])
console.log('.top:', styles['.top'])
