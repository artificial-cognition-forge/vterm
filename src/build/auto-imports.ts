import { createUnimport } from 'unimport'
import { resolve } from 'path'

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
        from: '@arclabs/vterm',
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
          // Storage
          'useStore',
          'createStore',
          // Config
          'defineVtermConfig',
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
export async function transformWithAutoImports(code: string): Promise<string> {
  if (!unimportInstance) {
    throw new Error('Auto-imports not initialized. Call initAutoImports() first.')
  }

  const result = await unimportInstance.injectImports(code)
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
      "../app/**/*.ts",
      "../app/**/*.vue"
    ]
  }, null, 2)
}

/**
 * Get runtime composables for the module scope
 * Returns an object with all auto-discovered composables
 */
export async function getRuntimeComposables(): Promise<Record<string, any>> {
  if (!unimportInstance) {
    return {}
  }

  const imports = await unimportInstance.getImports()
  const composables: Record<string, any> = {}

  for (const imp of imports) {
    // Only include imports from local files (not from @arclabs/vterm)
    if (imp.from && !imp.from.startsWith('@arclabs/vterm') && !imp.from.startsWith('vue')) {
      try {
        const module = await import(imp.from)
        composables[imp.as || imp.name] = module[imp.name]
      } catch (error) {
        console.error(`Failed to load composable ${imp.name} from ${imp.from}:`, error)
      }
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
