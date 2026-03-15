import { resolve, relative, dirname } from "path"
import type { VTermConfig } from "../types/types"
import type { CompiledSFC } from "./compiler"
import { scanRoutes } from "../build/routes"

/**
 * Maps a source .vue path to its compiled import specifier.
 */
function findCompiled(sourcePath: string, compiled: CompiledSFC[]): string | undefined {
    const abs = resolve(sourcePath)
    return compiled.find(c => resolve(c.sourcePath) === abs)?.importSpecifier
}

/**
 * Serialize a plain config value (primitives, arrays, plain objects) to JS source.
 * Functions and class instances are omitted.
 */
function serializeValue(value: unknown): string {
    if (value === null || value === undefined) return "undefined"
    if (typeof value === "string") return JSON.stringify(value)
    if (typeof value === "number" || typeof value === "boolean") return String(value)
    if (Array.isArray(value)) return `[${value.map(serializeValue).join(", ")}]`
    if (typeof value === "object") {
        const entries = Object.entries(value as Record<string, unknown>)
            .filter(([, v]) => typeof v !== "function")
            .map(([k, v]) => `${JSON.stringify(k)}: ${serializeValue(v)}`)
        return `{ ${entries.join(", ")} }`
    }
    return "undefined"
}

/**
 * Generate the .vterm/bootstrap.ts entry point for bun build.
 *
 * The bootstrap imports all compiled SFCs statically (so the bundler can
 * tree-shake and inline them) and calls vterm() with the inlined config.
 */
export async function generateBootstrap(
    config: VTermConfig,
    compiled: CompiledSFC[],
    cwd: string = process.cwd(),
): Promise<string> {
    const lines: string[] = [
        `#!/usr/bin/env bun`,
        `// Auto-generated bootstrap — do not edit`,
        // Resolve the prod runtime path absolutely so bun build can find it
        // regardless of the user app's node_modules layout.
        `import { vterm } from ${JSON.stringify(resolve(dirname(import.meta.path), "../runtime/prod"))}`,
        ``,
    ]

    // Layout import
    let layoutVar: string | undefined
    let layoutStylesVar: string | undefined
    if (typeof config.layout === "string") {
        const specifier = findCompiled(config.layout, compiled)
        if (specifier) {
            layoutVar = "_AppLayout"
            layoutStylesVar = "_AppLayout__styles"
            lines.push(`import ${layoutVar}, { __styles as ${layoutStylesVar} } from "${specifier}"`)
        }
    }

    // Entry import (used when there are no routes)
    let entryVar: string | undefined
    let entryStylesVar: string | undefined
    if (config.entry) {
        const specifier = findCompiled(config.entry, compiled)
        if (specifier) {
            entryVar = "_AppEntry"
            entryStylesVar = "_AppEntry__styles"
            lines.push(`import ${entryVar}, { __styles as ${entryStylesVar} } from "${specifier}"`)
        }
    }

    // Scan routes and emit page imports
    const routes = await scanRoutes(cwd).catch(() => [])
    const routeVars: Array<{ path: string; name: string; meta?: Record<string, any>; varName: string; stylesVar: string }> = []

    // Import component SFCs for their styles, and layout SFCs as named components too
    const componentStylesVars: string[] = []
    const layoutVars: Array<{ name: string; varName: string; stylesVar: string }> = []
    for (const sfcEntry of compiled) {
        const rel = relative(cwd, sfcEntry.sourcePath)
        if (rel.startsWith("app/layout")) {
            // Layout SFC: import the component + its styles, and register in layouts map
            const layoutName = rel.replace(/^app\/layout\//, "").replace(/\.vue$/, "").replace(/\//g, "-")
            const varName = `_Layout_${layoutName.replace(/[^a-zA-Z0-9]/g, "_")}`
            const stylesVar = `${varName}__styles`
            lines.push(`import ${varName}, { __styles as ${stylesVar} } from "${sfcEntry.importSpecifier}"`)
            componentStylesVars.push(stylesVar)
            layoutVars.push({ name: layoutName, varName, stylesVar })
        } else if (rel.startsWith("app/components")) {
            // Component SFC: import only styles
            const varName = `_Mod_${sfcEntry.outputPath.replace(/[^a-zA-Z0-9]/g, "_")}`
            const stylesVar = `${varName}__styles`
            lines.push(`import { __styles as ${stylesVar} } from "${sfcEntry.importSpecifier}"`)
            componentStylesVars.push(stylesVar)
        }
    }

    for (const route of routes) {
        const specifier = findCompiled(route.filePath, compiled)
        if (!specifier) continue
        const varName = `_Page_${route.name.replace(/[^a-zA-Z0-9]/g, "_")}`
        const stylesVar = `${varName}__styles`
        lines.push(`import ${varName}, { __styles as ${stylesVar} } from "${specifier}"`)
        routeVars.push({ path: route.path, name: route.name, meta: route.meta, varName, stylesVar })
    }

    lines.push(``)

    // Build vterm() call
    const configLines: string[] = []

    if (layoutVar) {
        configLines.push(`    layout: ${layoutVar},`)
    }
    if (entryVar && routeVars.length === 0) {
        configLines.push(`    entry: ${entryVar},`)
    }
    if (routeVars.length > 0) {
        const routeEntries = routeVars.map(r => {
            const metaPart = r.meta ? `, meta: ${JSON.stringify(r.meta)}` : ""
            return `        { path: ${JSON.stringify(r.path)}, component: ${r.varName}, name: ${JSON.stringify(r.name)}${metaPart} }`
        })
        configLines.push(`    routes: [\n${routeEntries.join(",\n")}\n    ],`)
    }

    // Collect all __styles into a flat array passed as options.styles
    const allStylesVars = [
        ...(layoutStylesVar ? [layoutStylesVar] : []),
        ...(entryStylesVar ? [entryStylesVar] : []),
        ...componentStylesVars,
        ...routeVars.map(r => r.stylesVar),
    ]
    if (allStylesVars.length > 0) {
        configLines.push(`    styles: [${allStylesVars.join(", ")}],`)
    }

    // Pass per-page layout components as a Map
    if (layoutVars.length > 0) {
        const mapEntries = layoutVars.map(l => `[${JSON.stringify(l.name)}, ${l.varName}]`).join(", ")
        configLines.push(`    layouts: new Map([${mapEntries}]),`)
    }

    // Serialize scalar config options
    const scalarKeys = ["screen", "quitKeys", "highlight", "ui", "store"] as const
    for (const key of scalarKeys) {
        const val = (config as any)[key]
        if (val !== undefined) {
            configLines.push(`    ${key}: ${serializeValue(val)},`)
        }
    }

    lines.push(`vterm({`)
    lines.push(...configLines)
    lines.push(`})`)

    return lines.join("\n") + "\n"
}
