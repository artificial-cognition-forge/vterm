import { resolve, join } from "path"
import { existsSync, readdirSync, mkdir } from "fs"

/**
 * Initialize a new vterm project
 */
export async function initProject(targetDir: string = "."): Promise<void> {
    const cwd = process.cwd()
    const projectDir = targetDir === "." ? cwd : resolve(cwd, targetDir)

    console.log(`Initializing vterm project in ${projectDir}...`)

    // Check if directory exists and has files
    if (targetDir !== "." && existsSync(projectDir)) {
        const files = await getDirectoryFiles(projectDir)
        if (files.length > 0) {
            console.error(`Error: Directory "${targetDir}" already exists and is not empty`)
            process.exit(1)
        }
    }

    // Create project directory if needed
    if (targetDir !== ".") {
        await ensureDirectory(projectDir)
    }

    // Create app directory
    const appDir = join(projectDir, "app")
    await ensureDirectory(appDir)

    // Write files
    await writePackageJson(projectDir)
    await writeTsConfig(projectDir)
    await writeVTermConfig(projectDir)
    await writeIndexVue(appDir)

    console.log("✓ Project initialized successfully!")
    console.log()
    console.log("Next steps:")
    console.log(`  cd ${targetDir === "." ? "." : targetDir}`)
    console.log("  bun install")
    console.log("  vterm dev")
}

async function ensureDirectory(path: string): Promise<void> {
    await new Promise<void>((resolvePromise, reject) => {
        mkdir(path, { recursive: true }, err => {
            if (err) reject(err)
            else resolvePromise()
        })
    })
}

async function writePackageJson(projectDir: string): Promise<void> {
    const packageName = projectDir.split("/").pop() || "my-vterm-app"
    const content = JSON.stringify(
        {
            name: packageName,
            version: "0.0.1",
            type: "module",
            scripts: {
                dev: "vterm dev",
                prepare: "vterm prepare",
            },
            devDependencies: {
                "@arclabs/vterm": "latest",
                "@types/bun": "latest",
                typescript: "^5",
            },
        },
        null,
        2
    )
    const path = join(projectDir, "package.json")
    await Bun.write(path, content)
    console.log(`  Created ${path}`)
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
    const path = join(projectDir, "tsconfig.json")
    await Bun.write(path, content)
    console.log(`  Created ${path}`)
}

async function writeVTermConfig(projectDir: string): Promise<void> {
    const packageName = projectDir.split("/").pop() || "My VTerm App"
    const content = `import type { VTermConfig } from '@arclabs/vterm'

export default {
  entry: './app/index.vue',
  screen: { title: '${packageName}' },
  renderInterval: 100,
  quitKeys: ['escape', 'q', 'C-c'],
} satisfies VTermConfig
`
    const path = join(projectDir, "vterm.config.ts")
    await Bun.write(path, content)
    console.log(`  Created ${path}`)
}

async function writeIndexVue(appDir: string): Promise<void> {
    const content = `<template>
  <div class="container">
    <text class="title" content="Welcome to VTerm" />
    <text class="docs" :top="2" content="https://vterm.dev/docs" />
    <button :top="4" @press="increment">
      Count: {{ count }}
    </button>
  </div>
</template>

<script setup lang="ts">
const count = ref(0)
const increment = () => count.value++
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 100%;
}

.title {
  color: white;
}

.docs {
  color: dimgray;
}
</style>
`
    const path = join(appDir, "index.vue")
    await Bun.write(path, content)
    console.log(`  Created ${path}`)
}

function getDirectoryFiles(dir: string): string[] {
    try {
        return readdirSync(dir)
    } catch {
        return []
    }
}
