import { createUnimport } from 'unimport'
import { resolve } from 'path'
import { loadComposableInScope } from './composable-loader'

/**
 * Auto-import configuration for vterm apps
 * Convention-based, no config needed - scans app/ directory
 */

let unimportInstance: ReturnType<typeof createUnimport> | null = null

/**
 * Initialize the auto-import system
 * Should be called once when the dev server starts
 */
export async function initAutoImports(cwd: string = process.cwd()) {
  if (unimportInstance) {
    return unimportInstance
  }

  unimportInstance = createUnimport({
    presets: [
      // Auto-import all vterm APIs
      {
        from: '@arcforge/vterm',
        imports: [
          // Vue reactivity
          'ref',
          'reactive',
          'computed',
          'watch',
          'watchEffect',
          'shallowRef',
          'shallowReactive',
          'toRef',
          'toRefs',
          'unref',
          'isRef',
          // Vue composition
          'onMounted',
          'onUnmounted',
          'onBeforeMount',
          'onBeforeUnmount',
          'defineComponent',
          'h',
          'inject',
          'provide',
          'getCurrentInstance',
          // Router
          'createRouter',
          'useRouter',
          'useRoute',
          'RouterView',
          'RouterLink',
          'installRouter',
          'loadFileBasedRoutes',
          'useFileBasedRoutes',
          // Composables
          'useKeys',
          'useScreen',
          'useFocus',
          'useRender',
          'useTerminal',
          // Storage
          'useStore',
          'createStore',
          // Config
          'defineVtermConfig',
          // Page metadata (no-op at runtime, extracted at build time)
          'definePageMeta',
        ],
      },
    ],
    // Scan app/ directories for auto-imports
    dirs: [
      resolve(cwd, 'app/composables/**/*.{ts,js}'),
      resolve(cwd, 'app/utils/**/*.{ts,js}'),
      resolve(cwd, 'app/components/**/*.vue'),
    ],
  })

  // Scan directories to discover exports
  await unimportInstance.init()

  return unimportInstance
}

/**
 * Transform code to inject auto-imports
 * Call this BEFORE compiling/transforming the script
 */
export async function transformWithAutoImports(code: string, id?: string): Promise<string> {
  if (!unimportInstance) {
    throw new Error('Auto-imports not initialized. Call initAutoImports() first.')
  }

  const result = await unimportInstance.injectImports(code, id)
  return result.code
}

/**
 * Scan directories and update the auto-import registry
 * Useful for hot reload when new files are added
 */
export async function scanAutoImports() {
  if (!unimportInstance) {
    return
  }

  await unimportInstance.scanDirs()
}

/**
 * Generate TypeScript declarations for auto-imports
 * Returns the .d.ts file content as a string
 */
export async function generateTypeDeclarations(): Promise<string> {
  if (!unimportInstance) {
    throw new Error('Auto-imports not initialized. Call initAutoImports() first.')
  }

  const declarations = await unimportInstance.generateTypeDeclarations()
  return declarations
}

/**
 * Generate tsconfig.json for auto-imports
 * This should be extended by the user's tsconfig.json
 */
export function generateTsConfig(): string {
  return JSON.stringify({
    "compilerOptions": {
      "target": "ESNext",
      "module": "ESNext",
      "moduleResolution": "bundler",
      "types": [],
      "strict": true,
      "skipLibCheck": true
    },
    "include": [
      "./auto-imports.d.ts",
      "./layouts.d.ts",
      "../vterm.config.ts",
      "../app/**/*.ts",
      "../app/**/*.vue"
    ]
  }, null, 2)
}

/**
 * Get runtime composables for the module scope.
 *
 * @param baseScope - VTerm's module scope (ref, reactive, useRender, etc.).
 *   When provided, composable TS files are executed inside this scope so they
 *   use the same Vue instance as SFC components. Without it, files fall back to
 *   regular import(), which may resolve a different Vue and break reactivity.
 */
export async function getRuntimeComposables(baseScope: Record<string, any> = {}): Promise<Record<string, any>> {
  if (!unimportInstance) {
    return {}
  }

  const imports = await unimportInstance.getImports()
  const composables: Record<string, any> = {}

  // Cache per-file results so each file is only loaded once even when multiple
  // exports come from the same composable.
  const fileCache = new Map<string, Promise<Record<string, any>>>()

  for (const imp of imports) {
    // Only include imports from local composable/utility files.
    // Skip framework imports and .vue component files — components are
    // handled by loadSFC's import extraction, not by dynamic require here.
    if (!imp.from ||
        imp.from.startsWith('@arcforge/vterm') ||
        imp.from.startsWith('vue') ||
        imp.from.endsWith('.vue')) {
      continue
    }

    try {
      // Load in VTerm's module scope so the composable uses the same Vue
      // instance as SFC components, keeping reactivity in a single system.
      if (!fileCache.has(imp.from)) {
        fileCache.set(imp.from, loadComposableInScope(imp.from, baseScope))
      }
      const loaded = await fileCache.get(imp.from)!
      if (loaded[imp.name] !== undefined) {
        composables[imp.as || imp.name] = loaded[imp.name]
        continue
      }
    } catch {
      // Fall through to the regular import() fallback below.
    }

    // Fallback: regular import() — may resolve a different Vue instance but
    // is better than silently omitting the export.
    try {
      const module = await import(imp.from)
      composables[imp.as || imp.name] = module[imp.name]
    } catch (error) {
      console.error(`Failed to load composable ${imp.name} from ${imp.from}:`, error)
    }
  }

  return composables
}

/**
 * Clear the auto-import instance (for testing or reload)
 */
export function clearAutoImports() {
  unimportInstance = null
}
