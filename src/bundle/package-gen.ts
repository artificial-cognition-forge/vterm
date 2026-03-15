import { resolve, join } from "path"

/**
 * Options for package.json generation.
 */
export interface PackageGenOptions {
    name?: string
    version?: string
    outdir: string
}

async function readUserPackageJson(cwd: string): Promise<Record<string, any>> {
    const pkgPath = resolve(cwd, "package.json")
    const file = Bun.file(pkgPath)
    if (!(await file.exists())) return {}
    return file.json()
}

/**
 * Write dist/package.json (and copy README if present).
 */
export async function generatePackageJson(
    options: PackageGenOptions,
    cwd: string = process.cwd(),
): Promise<void> {
    const userPkg = await readUserPackageJson(cwd)

    const name = options.name ?? userPkg.name ?? "vterm-app"
    const version = options.version ?? userPkg.version ?? "1.0.0"
    const description = userPkg.description ?? ""

    // The bin name is the last segment of a scoped package, or the full name
    const binName = name.includes("/") ? name.split("/").pop()! : name

    const pkg = {
        name,
        version,
        description,
        type: "module",
        bin: { [binName]: "./index.js" },
        engines: { bun: ">=1.0.0" },
        files: ["index.js"],
    }

    await Bun.write(
        resolve(options.outdir, "package.json"),
        JSON.stringify(pkg, null, 2) + "\n",
    )

    // Copy README if present
    for (const readme of ["README.md", "readme.md", "Readme.md"]) {
        const src = Bun.file(resolve(cwd, readme))
        if (await src.exists()) {
            await Bun.write(resolve(options.outdir, "README.md"), src)
            break
        }
    }
}
