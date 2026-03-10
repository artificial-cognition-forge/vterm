import { resolve } from "path"
import { existsSync } from "fs"
import { glob } from "glob"

export interface LayoutEntry {
  name: string
  filePath: string
}

/**
 * Scan app/layout/ for layout components and return their names + paths.
 */
export async function scanLayouts(cwd: string = process.cwd()): Promise<LayoutEntry[]> {
  const layoutDir = resolve(cwd, 'app/layout')
  if (!existsSync(layoutDir)) return []

  try {
    const files = await glob('**/*.vue', { cwd: layoutDir, absolute: false })
    return files.map(file => ({
      name: file.replace(/\.vue$/, '').replace(/\//g, '-'),
      filePath: resolve(layoutDir, file),
    }))
  } catch {
    return []
  }
}

/**
 * Generate a .vterm/layouts.d.ts that augments @arcforge/vterm's PageMeta
 * interface with the exact layout names available in app/layout/.
 *
 * This gives IDE type checking and autocomplete for definePageMeta({ layout: '...' }).
 */
export async function generateLayoutsTypeDeclarations(cwd: string = process.cwd()): Promise<string> {
  const layouts = await scanLayouts(cwd)

  // Even with no layouts we emit a fallback so `layout` is always typed.
  const layoutUnion = layouts.length > 0
    ? layouts.map(l => `'${l.name}'`).join(' | ')
    : 'string'

  return `// Auto-generated layout types from app/layout/
// Do not edit manually — regenerated on dev server start and vterm build

declare module '@arcforge/vterm' {
  interface PageMeta {
    /** Layout to wrap this page. \`false\` disables the layout. Defaults to \`'default'\`. */
    layout?: ${layoutUnion} | false
  }
}

export {}
`
}
