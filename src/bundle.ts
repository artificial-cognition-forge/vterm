import { resolve } from "path"
import { loadConfig } from "./build/config"
import { prepareProject } from "./build/prepare"
import { compileAllSFCs } from "./bundle/compiler"
import { generateBootstrap } from "./bundle/bootstrap"
import { runBundler, runBinaryCompile } from "./bundle/packager"
import { generatePackageJson } from "./bundle/package-gen"

export interface BundleOptions {
    /** Output directory (default: dist/) */
    outdir?: string
    /** Also produce a standalone binary via bun build --compile */
    binary?: boolean
    /** Minify output (default: true) */
    minify?: boolean
    /** Emit source maps */
    sourcemap?: boolean
    /** Override package name */
    name?: string
    /** Override package version */
    version?: string
}

/**
 * Production bundle command orchestrator.
 *
 * Pipeline:
 *   1. Load vterm config
 *   2. prepareProject() — generate .vterm/ type artifacts
 *   3. compileAllSFCs() — AOT compile every reachable .vue → .vterm/compiled/
 *   4. generateBootstrap() — write .vterm/bootstrap.ts entry point
 *   5. runBundler() — bun build → dist/index.js
 *   6. generatePackageJson() — write dist/package.json (+ README)
 *   7. (if --binary) runBinaryCompile() → dist/<name>
 */
export async function bundle(configPath: string, options: BundleOptions = {}): Promise<void> {
    const cwd = process.cwd()
    const outdir = resolve(cwd, options.outdir ?? ".output")
    const minify = options.minify ?? true
    const sourcemap = options.sourcemap ?? false

    console.log("vterm bundle — building production package")
    console.log()

    // ── 1. Load config ───────────────────────────────────────────────────────
    console.log("Loading config...")
    const config = await loadConfig(configPath)

    // ── 2. Prepare project (.vterm/ type artifacts) ──────────────────────────
    console.log("Preparing project...")
    await prepareProject()

    // ── 3. AOT SFC compilation ───────────────────────────────────────────────
    console.log("Compiling Vue SFCs (AOT)...")
    const compiled = await compileAllSFCs(config, cwd)
    console.log(`  ${compiled.length} component(s) compiled`)

    // ── 4. Generate bootstrap entry ──────────────────────────────────────────
    console.log("Generating bundle entry point...")
    const bootstrapSrc = await generateBootstrap(config, compiled, cwd)
    const bootstrapPath = resolve(cwd, ".vterm/bootstrap.ts")
    await Bun.write(bootstrapPath, bootstrapSrc)
    console.log(`  wrote .vterm/bootstrap.ts`)

    // ── 5. Bundle ────────────────────────────────────────────────────────────
    console.log(`Bundling → ${outdir}/index.js ...`)
    const bundleResult = await runBundler(bootstrapPath, { outdir, minify, sourcemap })
    if (!bundleResult.ok) {
        console.error("Bundle failed:")
        for (const err of bundleResult.errors) console.error(" ", err)
        process.exit(1)
    }
    console.log(`  bundled → ${bundleResult.outputPath}`)

    // ── 6. Package.json ──────────────────────────────────────────────────────
    console.log("Generating dist/package.json...")
    await generatePackageJson({ outdir, name: options.name, version: options.version }, cwd)

    // ── 7. (Optional) Binary ─────────────────────────────────────────────────
    if (options.binary) {
        const userPkg = await Bun.file(resolve(cwd, "package.json")).json().catch(() => ({}))
        const pkgName = options.name ?? userPkg.name ?? "vterm-app"
        const binName = pkgName.includes("/") ? pkgName.split("/").pop()! : pkgName
        const binaryPath = resolve(outdir, binName)
        console.log(`Compiling binary → ${binaryPath} ...`)
        const binaryResult = await runBinaryCompile(bundleResult.outputPath, binaryPath)
        if (!binaryResult.ok) {
            console.error("Binary compilation failed:")
            for (const err of binaryResult.errors) console.error(" ", err)
            // Non-fatal — the JS bundle is still good
        } else {
            console.log(`  binary → ${binaryResult.outputPath}`)
        }
    }

    console.log()
    console.log(`✓ Bundle complete → ${outdir}/`)
}
