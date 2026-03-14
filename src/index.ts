#!/usr/bin/env bun
import { parseArgs } from "util"
import { resolve } from "path"
import { dev } from "./dev"
import { init } from "./init"
import { build } from "./build"
import { deploy } from "./deploy"
import { tail } from "./cli/tail"
import type { LogLevel } from "./build/logger"

// Bundled apps shipped with vterm — maps CLI command → app dir name
const BUNDLED_APPS: Record<string, string> = {
    docs: "docs",
}

// Parse CLI args
const { values, positionals } = parseArgs({
    args: Bun.argv.slice(2),
    options: {
        config:     { type: "string",  short: "c" },
        help:       { type: "boolean", short: "h" },
        level:      { type: "string",  short: "l" },
        filter:     { type: "string",  short: "f" },
        follow:     { type: "boolean" },
        "no-follow": { type: "boolean" },
    },
    allowPositionals: true,
})

// Get the command (first positional argument)
const command = positionals[0]

// Handle help flag
if (values.help || !command) {
    console.log(`Usage: vterm <command> [options]`)
    console.log()
    console.log(`Commands:`)
    console.log(`  init [dir]    Initialize a new vterm project`)
    console.log(`  build         Generate type declarations and configuration`)
    console.log(`  dev           Start development server`)
    console.log(`  tail          Stream dev logs from .vterm/dev.log.jsonl`)
    console.log(`  deploy        Publish package to npm`)
    console.log(`  docs          Launch the vterm documentation browser`)
    console.log()
    console.log(`Options:`)
    console.log(`  --config, -c      Path to vterm.config.ts`)
    console.log(`  --help, -h        Show this help message`)
    console.log(`  --level,  -l      Filter tail by level (log|info|warn|error|debug)`)
    console.log(`  --filter, -f      Filter tail by substring`)
    console.log(`  --no-follow       Print existing log entries and exit`)
    process.exit(values.help ? 0 : 1)
}

// Handle commands
switch (command) {
    case "init": {
        await init(positionals[1])
        break
    }

    case "build":
    case "prepare": {
        await build()
        break
    }

    case "dev": {
        const configPath = values.config || "vterm.config.ts"
        await dev(configPath)
        break
    }

    case "deploy": {
        const configPath = values.config || "vterm.config.ts"
        await deploy(configPath)
        break
    }

    case "tail": {
        await tail({
            level: values.level as LogLevel | undefined,
            filter: values.filter,
            follow: !values["no-follow"],
        })
        break
    }

    default: {
        // Check if this is a bundled app command
        const appDir = BUNDLED_APPS[command]
        if (appDir) {
            const configPath = resolve(import.meta.dir, `../apps/${appDir}/vterm.config.ts`)
            await dev(configPath)
            break
        }

        console.error(`Unknown command: ${command}`)
        console.error(`Usage: vterm <command> [options]`)
        console.error()
        console.error(`Commands:`)
        console.error(`  init [dir]    Initialize a new vterm project`)
        console.error(`  build         Generate type declarations and configuration`)
        console.error(`  dev           Start development server`)
        console.error(`  deploy        Publish package to npm`)
        console.error(`  docs          Launch the vterm documentation browser`)
        console.error()
        console.error(`Options:`)
        console.error(`  --config, -c  Path to vterm.config.ts`)
        process.exit(1)
    }
}

export * from "./exports"