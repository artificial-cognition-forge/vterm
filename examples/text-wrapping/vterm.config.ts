import { defineVtermConfig } from '@arcforge/vterm'

export default defineVtermConfig({
  entry: './app/index.vue',
  layout: false,
  screen: { title: 'Text Wrapping Demo' },
  quitKeys: ['C-c'],
})
