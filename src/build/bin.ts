import { resolve, join } from "path"
import { mkdirSync, existsSync, readFileSync, writeFileSync, chmodSync } from "fs"

/**
 * Write a bin/ shell script that runs `vterm dev` and patch package.json bin field.
 * The binary name is taken from package.json "name".
 */
export async function buildBin(): Promise<void> {
    const cwd = process.cwd()
    const pkgPath = resolve(cwd, "package.json")

    if (!existsSync(pkgPath)) return

    const pkg = JSON.parse(readFileSync(pkgPath, "utf-8"))
    const name: string = pkg.name
    if (!name) return

    const binDir = resolve(cwd, "bin")
    const outFile = join(binDir, name)

    if (!existsSync(binDir)) {
        mkdirSync(binDir, { recursive: true })
    }

    // Resolve the project root relative to the bin script so it works from any cwd
    const script = [
        `#!/usr/bin/env sh`,
        `SCRIPT=$(realpath "$0")`,
        `DIR=$(dirname "$SCRIPT")`,
        `cd "$DIR/.."`,
        `exec vterm dev "$@"`,
        ``,
    ].join("\n")
    writeFileSync(outFile, script, "utf-8")
    chmodSync(outFile, 0o755)

    pkg.bin = { [name]: `./bin/${name}` }
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n", "utf-8")

    console.log(`✓ bin/${name} written`)
}
