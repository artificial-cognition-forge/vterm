import { initProject } from "./build/init"
import { prepareProject } from "./build/prepare"

/**
 * Init command orchestrator - initializes a new vterm project
 *
 * @param targetDir - Directory to initialize the project in (defaults to ".")
 */
export async function init(targetDir: string = "."): Promise<void> {
  await initProject(targetDir)

  // Run prepare after init to generate type declarations
  process.chdir(targetDir === "." ? process.cwd() : targetDir)
  await prepareProject()
}
