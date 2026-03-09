import { defineVtermConfig } from '@arclabs/vterm'

export default defineVtermConfig({
  screen: { title: 'VTerm Showcase' },
  quitKeys: ['C-c'],
  npm: {
    access: "public",
  }
})
