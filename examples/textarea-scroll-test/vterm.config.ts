import { defineVtermConfig } from '@arcforge/vterm'

export default defineVtermConfig({
  entry: './app/index.vue',
  layout: false,
  screen: { title: 'Textarea Scroll Test' },
  quitKeys: ['C-c'],
})
