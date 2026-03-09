import { defineVtermConfig } from '@arcforge/vterm'

export default defineVtermConfig({
  entry: './app/index.vue',
  layout: false,
  screen: { title: 'Mouse Blocking Demo' },
  quitKeys: ['C-c'],
})
