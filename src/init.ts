import { createInterface } from "readline"
import { existsSync } from "fs"
import { resolve } from "path"
import { initProject } from "./build/init"
import { prepareProject } from "./build/prepare"

/**
 * Init command orchestrator - prompts for project name then scaffolds a new vterm project
 */
export async function init(nameArg?: string): Promise<void> {
  const projectName = nameArg?.trim() || await promptProjectName()

  if (!projectName) {
    console.error("Project name is required.")
    process.exit(1)
  }

  const projectDir = resolve(process.cwd(), projectName)

  if (existsSync(projectDir)) {
    console.error(`Error: Directory "${projectName}" already exists.`)
    process.exit(1)
  }

  await initProject(projectDir, projectName)

  process.chdir(projectDir)
  await prepareProject()
}

async function promptProjectName(): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise(resolve => {
    rl.question("Project name: ", answer => {
      rl.close()
      resolve(answer.trim())
    })
  })
}
