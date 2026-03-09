import { resolve, dirname, join } from "path"
import { unlinkSync } from "fs"
import { tmpdir } from "os"
import type { VTermConfig } from "../types"
import { defineVtermConfig } from "../types/types"

/**
 * Load and validate vterm configuration from a file.
 *
 * Transforms the config file before importing to:
 * 1. Strip imports from '@arcforge/vterm' (circular dep: vterm is the running process)
 * 2. Inject defineVtermConfig as a global so config files don't need to import it
 */
export async function loadConfig(configPath: string): Promise<VTermConfig> {
  const fullPath = resolve(process.cwd(), configPath)
  const configDir = dirname(fullPath)

  const configFile = Bun.file(fullPath)
  if (!(await configFile.exists())) {
    throw new Error(`Config file not found: ${fullPath}`)
  }

  // Inject defineVtermConfig as a global — config files can use it without importing
  ;(globalThis as any).defineVtermConfig = defineVtermConfig

  // Strip imports from @arcforge/vterm to prevent circular dependency.
  // The CLI itself IS @arcforge/vterm, so dynamic-importing a config that imports
  // from the same package creates a TDZ cycle in Bun's module system.
  const code = stripVtermImports(await configFile.text())

  const tmpFile = join(tmpdir(), `vterm-config-${Date.now()}.ts`)
  await Bun.write(tmpFile, code)

  try {
    const configModule = await import(tmpFile)
    const config = configModule.default

    if (!config) {
      throw new Error(`Config file must have a default export: ${fullPath}`)
    }

    const resolvedConfig: VTermConfig = { ...config }

    if (config.entry) {
      resolvedConfig.entry = resolve(configDir, config.entry)
    }

    if (typeof config.layout === 'string') {
      resolvedConfig.layout = resolve(configDir, config.layout)
    }

    return resolvedConfig
  } finally {
    try { unlinkSync(tmpFile) } catch {}
  }
}

/**
 * Strip `import ... from '@arcforge/vterm'` lines from config file source.
 * defineVtermConfig is injected via globalThis instead.
 */
function stripVtermImports(code: string): string {
  return code.replace(/^import\s+(?:type\s+)?\{[^}]*\}\s+from\s+['"]@arcforge\/vterm['"]\s*;?\r?\n?/gm, '')
}
