import { defineVtermConfig } from '../../src/types/types'

export default defineVtermConfig({
  entry: './app/index.vue',
  screen: { title: 'minimal' },
  highlight: {
    theme: "dark-plus"
  }

})
