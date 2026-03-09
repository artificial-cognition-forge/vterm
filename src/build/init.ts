import { join } from "path"
import { mkdir } from "fs"

/**
 * Scaffold a new vterm project at the given (pre-validated) directory path.
 */
export async function initProject(projectDir: string, projectName: string): Promise<void> {
    console.log(`\nCreating vterm project: ${projectName}\n`)

    await ensureDirectory(projectDir)
    await ensureDirectory(join(projectDir, "app"))

    await writePackageJson(projectDir, projectName)
    await writeTsConfig(projectDir)
    await writeVTermConfig(projectDir, projectName)
    await writeIndexVue(join(projectDir, "app"))

    console.log(`\n✓ Created ${projectName}\n`)
    console.log("Next steps:")
    console.log(`  cd ${projectName}`)
    console.log("  bun install")
    console.log("  vterm dev")
    console.log()
}

async function ensureDirectory(path: string): Promise<void> {
    await new Promise<void>((resolve, reject) => {
        mkdir(path, { recursive: true }, err => {
            if (err) reject(err)
            else resolve()
        })
    })
}

async function writePackageJson(projectDir: string, projectName: string): Promise<void> {
    const content = JSON.stringify(
        {
            name: projectName,
            version: "0.0.1",
            type: "module",
            scripts: {
                dev: "vterm dev",
                prepare: "vterm prepare",
            },
            devDependencies: {
                "@arcforge/vterm": "latest",
                "@types/bun": "latest",
                typescript: "^5",
            },
        },
        null,
        2
    )
    await write(join(projectDir, "package.json"), content)
}

async function writeTsConfig(projectDir: string): Promise<void> {
    const content = JSON.stringify(
        {
            extends: "./.vterm/tsconfig.json",
            compilerOptions: {
                target: "ESNext",
                module: "ESNext",
                moduleResolution: "bundler",
                strict: true,
            },
        },
        null,
        2
    )
    await write(join(projectDir, "tsconfig.json"), content)
}

async function writeVTermConfig(projectDir: string, projectName: string): Promise<void> {
    const title = projectName
        .split(/[-_]/)
        .map(w => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")

    const content = `export default defineVtermConfig({
  screen: { title: '${title}' },
  quitKeys: ['C-c'],
})
`
    await write(join(projectDir, "vterm.config.ts"), content)
}

async function writeIndexVue(appDir: string): Promise<void> {
    const content = `<template>
  <div class="container">
    <div class="text">Hello World!</div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

text {
  color: white;
}
</style>
`
    await write(join(appDir, "index.vue"), content)
}

async function write(path: string, content: string): Promise<void> {
    await Bun.write(path, content)
    console.log(`  created  ${path}`)
}
