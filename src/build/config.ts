import { resolve, dirname } from "path"
import type { VTermConfig } from "../types"

/**
 * Load and validate vterm configuration from a file
 */
export async function loadConfig(configPath: string): Promise<VTermConfig> {
  const fullPath = resolve(process.cwd(), configPath)
  const configDir = dirname(fullPath)

  try {
    // Dynamic import to load config
    const configModule = await import(fullPath)
    const config = configModule.default

    if (!config) {
      throw new Error(`Config file must have a default export: ${fullPath}`)
    }

    // Resolve paths relative to config file directory
    const resolvedConfig: VTermConfig = {
      ...config,
    }

    // Resolve entry path if provided
    if (config.entry) {
      resolvedConfig.entry = resolve(configDir, config.entry)
    }

    // Resolve layout path if provided and is a string
    if (typeof config.layout === 'string') {
      resolvedConfig.layout = resolve(configDir, config.layout)
    }

    return resolvedConfig
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "MODULE_NOT_FOUND") {
      throw new Error(`Config file not found: ${fullPath}`)
    }
    throw error
  }
}
