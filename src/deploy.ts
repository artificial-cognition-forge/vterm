import { resolve } from "path"
import { loadConfig } from "./build/config"

async function run(cmd: string[]): Promise<{ ok: boolean; stdout: string; stderr: string }> {
    const proc = Bun.spawn(cmd, { stdout: "pipe", stderr: "pipe" })
    const [stdout, stderr, exitCode] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text(),
        proc.exited,
    ])
    return { ok: exitCode === 0, stdout: stdout.trim(), stderr: stderr.trim() }
}

async function runInherited(cmd: string[]): Promise<boolean> {
    const proc = Bun.spawn(cmd, { stdout: "inherit", stderr: "inherit", stdin: "inherit" })
    const exitCode = await proc.exited
    return exitCode === 0
}

async function readPackageJson(): Promise<Record<string, any>> {
    const pkgPath = resolve(process.cwd(), "package.json")
    const file = Bun.file(pkgPath)
    if (!(await file.exists())) {
        throw new Error(`No package.json found in ${process.cwd()}`)
    }
    return file.json()
}

export async function deploy(configPath: string): Promise<void> {
    console.log("vterm deploy — publishing to npm")
    console.log()

    // Load vterm config (optional — deploy works without it)
    let npmConfig: { name?: string; registry?: string; access?: 'public' | 'restricted' } = {}
    try {
        const config = await loadConfig(configPath)
        npmConfig = config.npm ?? {}
    } catch {
        // No config file is fine — use package.json defaults
    }

    // Read package.json
    const pkg = await readPackageJson()
    const packageName = npmConfig.name ?? pkg.name
    const version = pkg.version

    if (!packageName) {
        console.error("Error: package name not found in package.json or vterm.config.ts npm.name")
        process.exit(1)
    }

    if (!version) {
        console.error("Error: version not found in package.json")
        process.exit(1)
    }

    console.log(`  Package : ${packageName}`)
    console.log(`  Version : ${version}`)
    if (npmConfig.registry) {
        console.log(`  Registry: ${npmConfig.registry}`)
    }
    console.log()

    // Check npm auth
    const whoami = await run(["npm", "whoami", ...(npmConfig.registry ? ["--registry", npmConfig.registry] : [])])
    if (!whoami.ok) {
        console.error("Error: not logged in to npm. Run `npm login` first.")
        if (whoami.stderr) console.error(whoami.stderr)
        process.exit(1)
    }
    console.log(`  Publishing as: ${whoami.stdout}`)
    console.log()

    // Build publish args
    const publishArgs = ["npm", "publish"]
    if (npmConfig.registry) {
        publishArgs.push("--registry", npmConfig.registry)
    }
    publishArgs.push("--access", npmConfig.access ?? "public")

    console.log(`  Running: ${publishArgs.join(" ")}`)
    console.log()

    const ok = await runInherited(publishArgs)
    if (!ok) {
        console.error("npm publish failed.")
        process.exit(1)
    }

    console.log()
    console.log(`Published ${packageName}@${version}`)
}
