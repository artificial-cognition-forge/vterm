import { transformCSSToLayout } from '../../src/core/css/transformer'

const css = `.row {
  display: flex;
  flex-direction: row;
}

.item {
  width: 15;
  height: 10;
  background: red;
  border: 1px solid white;
}`

transformCSSToLayout(css).then(result => {
  console.log('Result:', JSON.stringify(result, null, 2))
}).catch(err => {
  console.error('Error:', err)
})
