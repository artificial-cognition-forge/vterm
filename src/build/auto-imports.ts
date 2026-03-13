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
          'useProcess',
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
      "skipLibCheck": true,
      "plugins": [
        {
          "name": "@vue/typescript-plugin",
          "languages": ["vue"]
        }
      ]
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

  // Collect unique local composable files to load
  const localFiles = new Set<string>()
  for (const imp of imports) {
    if (!imp.from ||
        imp.from.startsWith('@arcforge/vterm') ||
        imp.from.startsWith('vue') ||
        imp.from.endsWith('.vue')) {
      continue
    }
    localFiles.add(imp.from)
  }

  // Load all files with a shared scope object that is mutated as exports are
  // collected. Because loadComposableInScope creates a new Function that closes
  // over the scope values at *call time*, we pass a Proxy so that any lookup
  // inside a composable always sees the latest state of the composables map —
  // even if the dependency was registered after the Function was constructed.
  const liveScope = new Proxy({} as Record<string, any>, {
    get(_, key: string) {
      return composables[key] ?? baseScope[key]
    },
    set(_, key: string, value: any) {
      composables[key] = value
      return true
    },
    has(_, key: string) {
      return key in composables || key in baseScope
    },
    ownKeys() {
      return [...new Set([...Object.keys(composables), ...Object.keys(baseScope)])]
    },
    getOwnPropertyDescriptor(_, key: string) {
      const val = composables[key] ?? baseScope[key]
      if (val !== undefined) return { value: val, writable: true, enumerable: true, configurable: true }
      return undefined
    }
  })

  const fileCache = new Map<string, Promise<Record<string, any>>>()
  for (const from of localFiles) {
    if (!fileCache.has(from)) {
      fileCache.set(from, loadComposableInScope(from, liveScope))
    }
    try {
      const loaded = await fileCache.get(from)!
      for (const [key, val] of Object.entries(loaded)) {
        composables[key] = val
      }
    } catch (error) {
      console.error(`Failed to load composable from ${from}:`, error)
    }
  }

  for (const imp of imports) {
    if (!imp.from ||
        imp.from.startsWith('@arcforge/vterm') ||
        imp.from.startsWith('vue') ||
        imp.from.endsWith('.vue')) {
      continue
    }

    if (composables[imp.name] !== undefined) {
      if (imp.as && imp.as !== imp.name) composables[imp.as] = composables[imp.name]
      continue
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
