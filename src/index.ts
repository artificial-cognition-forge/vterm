#!/usr/bin/env bun
import { parseArgs } from "util"
import { resolve } from "path"
import { dev } from "./dev"
import { init } from "./init"
import { build } from "./build"
import { bundle } from "./bundle"
import { deploy, type BumpType } from "./deploy"
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
        config:      { type: "string",  short: "c" },
        help:        { type: "boolean", short: "h" },
        level:       { type: "string",  short: "l" },
        filter:      { type: "string",  short: "f" },
        follow:      { type: "boolean" },
        "no-follow": { type: "boolean" },
        // bundle options
        outdir:      { type: "string" },
        binary:      { type: "boolean" },
        "no-minify": { type: "boolean" },
        sourcemap:   { type: "boolean" },
        name:        { type: "string" },
        version:     { type: "string" },
        // deploy options
        "dry-run":   { type: "boolean" },
        "no-git":    { type: "boolean" },
        "no-bump":   { type: "boolean" },
    },
    allowPositionals: true,
})

// Get the command (first positional argument), splitting colon modifier (e.g. deploy:minor)
const [command, commandModifier] = (positionals[0] ?? "").split(":")

// Handle help flag
if (values.help || !command) {
    console.log(`Usage: vterm <command> [options]`)
    console.log()
    console.log(`Commands:`)
    console.log(`  init [dir]         Initialize a new vterm project`)
    console.log(`  prepare            Generate type declarations and configuration`)
    console.log(`  build              Build a production package in .output/`)
    console.log(`  dev                Start development server`)
    console.log(`  tail               Stream dev logs from .vterm/dev.log.jsonl`)
    console.log(`  deploy             Publish to npm (default: patch bump)`)
    console.log(`  deploy:patch       Bump patch version and publish`)
    console.log(`  deploy:minor       Bump minor version and publish`)
    console.log(`  deploy:major       Bump major version and publish`)
    console.log(`  docs               Launch the vterm documentation browser`)
    console.log()
    console.log(`Options:`)
    console.log(`  --config, -c       Path to vterm.config.ts`)
    console.log(`  --help, -h         Show this help message`)
    console.log(`  --level,  -l       Filter tail by level (log|info|warn|error|debug)`)
    console.log(`  --filter, -f       Filter tail by substring`)
    console.log(`  --no-follow        Print existing log entries and exit`)
    console.log()
    console.log(`Bundle options:`)
    console.log(`  --outdir <dir>     Output directory (default: .output/)`)
    console.log(`  --binary           Also produce a standalone executable`)
    console.log(`  --no-minify        Disable minification`)
    console.log(`  --sourcemap        Emit source maps`)
    console.log(`  --name <name>      Override package name`)
    console.log(`  --version <ver>    Override package version`)
    console.log()
    console.log(`Deploy options:`)
    console.log(`  --dry-run          Build and validate without publishing`)
    console.log(`  --no-git           Skip git commit and tag`)
    console.log(`  --no-bump          Publish current version without bumping`)
    process.exit(values.help ? 0 : 1)
}

// Handle commands
switch (command) {
    case "init": {
        await init(positionals[1])
        break
    }

    case "prepare": {
        await build()
        break
    }

    case "build": {
        const configPath = values.config || "vterm.config.ts"
        await bundle(configPath, {
            outdir: values.outdir,
            binary: values.binary,
            minify: values["no-minify"] ? false : true,
            sourcemap: values.sourcemap,
            name: values.name,
            version: values.version,
        })
        break
    }

    case "dev": {
        const configPath = values.config || "vterm.config.ts"
        await dev(configPath)
        break
    }

    case "deploy": {
        const configPath = values.config || "vterm.config.ts"
        const validBumps = ["patch", "minor", "major", "none"]
        const bump = validBumps.includes(commandModifier) ? commandModifier as BumpType : undefined
        await deploy(configPath, {
            bump,
            dryRun: values["dry-run"],
            noGit: values["no-git"],
            noBump: values["no-bump"],
        })
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
        console.error(`  prepare       Generate type declarations and configuration`)
        console.error(`  build         Build a production package in .output/`)
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