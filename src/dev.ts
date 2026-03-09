import { loadConfig } from "./build/config"
import { startDevServer } from "./build/server"

/**
 * Dev command orchestrator - starts the development server with hot reload
 *
 * @param configPath - Path to vterm.config.ts (defaults to "vterm.config.ts")
 */
export async function dev(configPath: string = "vterm.config.ts"): Promise<void> {
  const config = await loadConfig(configPath)
  await startDevServer(config)
}
