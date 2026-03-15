import { resolve, dirname } from "path"
import { mkdir, writeFile, unlink } from "fs/promises"

export interface BundleOptions {
    outdir: string
    minify: boolean
    sourcemap: boolean
}

export interface BundleResult {
    ok: boolean
    outputPath: string
    errors: string[]
}

async function spawnCapture(cmd: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" })
    const [stdout, stderr, code] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
    ])
    return { ok: code === 0, stdout: stdout.trim(), stderr: stderr.trim() }
}

/**
 * Run `bun build` to produce a bundled dist/index.js from the generated bootstrap entry.
 *
 * We write a temporary bun build script that uses the programmatic API with a plugin
 * that:
 *  1. Redirects @arcforge/vterm → prod runtime (no compiler chain)
 *  2. Applies auto-imports transform to user .ts composable files so bare `ref`,
 *     `computed`, etc. resolve correctly without the dev-mode unimport runtime.
 */
export async function runBundler(
    bootstrapPath: string,
    options: BundleOptions,
    cwd: string = process.cwd(),
): Promise<BundleResult> {
    const outputPath = resolve(options.outdir, "index.js")
    await mkdir(options.outdir, { recursive: true })

    const prodRuntimePath = resolve(dirname(import.meta.path), "../runtime/prod.ts")
    const vtermDir = dirname(bootstrapPath)

    // Resolve the single canonical vue path from the user's app directory so
    // both the compiled SFCs and vterm's runtime share the same Vue instance.
    const { createRequire } = await import("module")
    const appRequire = createRequire(resolve(cwd, "package.json"))
    const canonicalVuePath = appRequire.resolve("vue")

    // Write a bun build runner script in .vterm/ that uses the programmatic API.
    // This lets us use a plugin to handle @arcforge/vterm aliasing AND auto-imports
    // injection for user .ts composable files.
    const runnerPath = resolve(vtermDir, "_bundle-runner.ts")
    const runner = `
import { transformWithAutoImports } from ${JSON.stringify(resolve(dirname(import.meta.path), "../build/auto-imports"))}
import { initAutoImports } from ${JSON.stringify(resolve(dirname(import.meta.path), "../build/auto-imports"))}

await initAutoImports(${JSON.stringify(cwd)})

const prodRuntime = ${JSON.stringify(prodRuntimePath)}
const canonicalVue = ${JSON.stringify(canonicalVuePath)}

const result = await Bun.build({
    entrypoints: [${JSON.stringify(bootstrapPath)}],
    outdir: ${JSON.stringify(options.outdir)},
    target: "bun",
    minify: ${options.minify},
    naming: { entry: "[name].js" },
    plugins: [
        {
            name: "vterm-prod",
            setup(build) {
                // Redirect @arcforge/vterm to prod runtime (no compiler chain)
                build.onResolve({ filter: /^@arcforge\\/vterm$/ }, () => ({
                    path: prodRuntime,
                }))
                // Deduplicate vue — redirect all imports to the app's own vue so
                // vterm's runtime and the compiled SFCs share a single Vue instance.
                // Without this, bun bundles vterm's node_modules/vue separately and
                // inject/getCurrentInstance calls fail with "null is not an object".
                build.onResolve({ filter: /^vue$/ }, () => ({
                    path: canonicalVue,
                }))
                // Apply auto-imports to user .ts files so bare ref/computed etc. resolve
                build.onLoad({ filter: /\\.ts$/ }, async (args) => {
                    // Skip node_modules and already-compiled SFCs
                    if (args.path.includes("node_modules") || args.path.includes(".vterm/compiled")) {
                        return undefined
                    }
                    const source = await Bun.file(args.path).text()
                    const transformed = await transformWithAutoImports(source, args.path)
                    return { contents: transformed, loader: "ts" }
                })
            },
        },
    ],
})

if (!result.success) {
    for (const msg of result.logs) {
        process.stderr.write(String(msg) + "\\n")
    }
    process.exit(1)
}
`

    await writeFile(runnerPath, runner)

    const result = await spawnCapture(["bun", "run", runnerPath])

    // Clean up runner script
    try { await unlink(runnerPath) } catch { /* ignore */ }

    if (!result.ok) {
        return {
            ok: false,
            outputPath,
            errors: [result.stderr || result.stdout || "bun build failed"],
        }
    }

    // bun build names the output after the entry file (bootstrap.js); rename to index.js
    const bunOutputPath = resolve(options.outdir, "bootstrap.js")
    const renamedPath = resolve(options.outdir, "index.js")
    const bunFile = Bun.file(bunOutputPath)
    if (await bunFile.exists()) {
        const content = await bunFile.text()
        // Prepend shebang so the file is directly executable
        const shebang = content.startsWith("#!") ? "" : "#!/usr/bin/env bun\n"
        await Bun.write(renamedPath, shebang + content)
        if (bunOutputPath !== renamedPath) {
            try { await unlink(bunOutputPath) } catch { /* ignore */ }
        }
    }

    return { ok: true, outputPath: renamedPath, errors: [] }
}

/**
 * Run `bun build --compile` to produce a standalone self-contained binary.
 */
export async function runBinaryCompile(
    entryJsPath: string,
    outBinaryPath: string,
): Promise<BundleResult> {
    const args = ["bun", "build", "--compile", entryJsPath, "--outfile", outBinaryPath]
    const result = await spawnCapture(args)

    return {
        ok: result.ok,
        outputPath: outBinaryPath,
        errors: result.ok ? [] : [result.stderr || result.stdout || "bun build --compile failed"],
    }
}
