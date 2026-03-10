import { watch, mkdir } from "fs"
import { dirname, resolve } from "path"
import { vterm } from "../core/vterm"
import { clearComponentCache } from "../core/compiler/sfc-loader"
import { initAutoImports, clearAutoImports, generateTypeDeclarations, generateTsConfig } from "./auto-imports"
import { generateRoutesModule } from "./routes"
import { getGlobalRouter } from "../core/router"
import type { VTermConfig, VTermApp } from "../types/types"

/**
 * Start the development server with file watching and hot reload
 */
export async function startDevServer(config: VTermConfig): Promise<void> {
  const {
    entry,
    layout,
    screen: screenOptions = {},
    quitKeys = ["C-c"],
    store: storeOptions,
    highlight,
    selection,
    ui,
  } = config

  // Entry path is already resolved by loadConfig
  const entryPath = entry

  // Variables to hold current app instance
  let app: VTermApp | null = null
  let watcher: ReturnType<typeof watch> | null = null
  let reloadTimeout: Timer | null = null

  /**
   * Display error (just log to console, terminal will be restored)
   */
  function displayError(error: Error) {
    console.error('\n\n=== ERROR ===')
    console.error(error.message)
    console.error('\n=== STACK TRACE ===')
    console.error(error.stack)
    console.error('\n=== HINT ===')
    console.error('Fix the error and the app will reload automatically (Hot Reload)\n')
  }

  /**
   * Create and start the app
   */
  async function createApp() {
    try {
      // Create and start the runtime app with buffer rendering
      app = await vterm({
        entry: entryPath,
        layout,
        quitKeys,
        store: storeOptions,
        highlight,
        selection,
        ui,
      })
    } catch (error) {
      console.error("Failed to create app:", error)
      displayError(error as Error)
    }
  }

  /**
   * Cleanup current app
   */
  function cleanup() {
    if (reloadTimeout) {
      clearTimeout(reloadTimeout)
      reloadTimeout = null
    }
    if (watcher) {
      watcher.close()
      watcher = null
    }
    if (app) {
      app.unmount()
      app = null
    }
  }

  /**
   * Reload the app (for file watching)
   */
  async function reloadApp() {
    // Save current route before unmounting so we can restore it after reload
    const previousRoute = getGlobalRouter()?.currentPath?.value ?? '/'

    // Cleanup current app (terminal will be restored)
    if (app) {
      await app.unmount()
      app = null
    }

    // Clear the component cache to force reload
    clearComponentCache()

    // Clear and reinitialize auto-imports to pick up new files
    clearAutoImports()
    await initAutoImports()

    // Regenerate routes from app/pages
    try {
      const routesModule = await generateRoutesModule()
      const routesPath = resolve(process.cwd(), '.vterm/routes.ts')
      await Bun.write(routesPath, routesModule)
    } catch (error) {
      console.error('Failed to regenerate routes:', error)
    }

    // Recreate the app
    await createApp()

    // Restore the previous route so the user stays on the same page
    if (previousRoute !== '/') {
      getGlobalRouter()?.navigate(previousRoute)
    }
  }

  // Initialize auto-imports before creating the app
  await initAutoImports()

  // Generate TypeScript declarations and config for auto-imports
  const vtermDir = resolve(process.cwd(), '.vterm')

  // Use promises instead of callback to ensure proper async flow
  await new Promise<void>((resolve, reject) => {
    mkdir(vtermDir, { recursive: true }, (err) => {
      if (err) {
        reject(err)
      } else {
        resolve()
      }
    })
  }).catch((err) => {
    console.error('Failed to create .vterm directory:', err)
    throw err
  })

  try {
    // Generate auto-imports.d.ts
    const declarations = await generateTypeDeclarations()
    const declarationsPath = resolve(vtermDir, 'auto-imports.d.ts')
    await Bun.write(declarationsPath, declarations)

    // Generate tsconfig.json
    const tsconfig = generateTsConfig()
    const tsconfigPath = resolve(vtermDir, 'tsconfig.json')
    await Bun.write(tsconfigPath, tsconfig)

    // Generate routes.ts from app/pages
    const routesModule = await generateRoutesModule()
    const routesPath = resolve(vtermDir, 'routes.ts')
    await Bun.write(routesPath, routesModule)
  } catch (error) {
    console.error('Failed to generate type declarations:', error)
    throw error
  }

  // Create initial app (now routes are guaranteed to be generated)
  await createApp()

  // Watch app directory for changes with debouncing
  // This ensures that changes to any component (.vue files) trigger a reload
  // If using file-based routing, watch the app directory; otherwise watch entry's directory
  const watchDir = entryPath ? dirname(entryPath) : resolve(process.cwd(), 'app')
  watcher = watch(watchDir, { recursive: true }, (eventType, filename) => {
    // Ignore changes in .vterm directory (generated files)
    if (filename && filename.includes('.vterm')) {
      return
    }

    // Only reload for .vue, .ts, .js file changes
    if (eventType === "change" && filename && /\.(vue|ts|js)$/.test(filename)) {
      // Debounce rapid file changes (e.g., from editor atomic saves)
      if (reloadTimeout) {
        clearTimeout(reloadTimeout)
      }
      reloadTimeout = setTimeout(() => {
        reloadTimeout = null
        reloadApp()
      }, 50) // 50ms debounce
    }
  })

  // Handle process signals
  process.on("SIGINT", () => {
    cleanup()
    process.exit(0)
  })

  process.on("SIGTERM", () => {
    cleanup()
    process.exit(0)
  })

  // Keep the process running
  // The app is now running and will respond to file changes
}
