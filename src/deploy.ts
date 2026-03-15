import { resolve } from "path"
import { loadConfig } from "./build/config"
import { bundle } from "./bundle"

export type BumpType = "patch" | "minor" | "major" | "none"

// ── Helpers ──────────────────────────────────────────────────────────────────

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

async function readPackageJson(cwd: string): Promise<Record<string, any>> {
    const pkgPath = resolve(cwd, "package.json")
    const file = Bun.file(pkgPath)
    if (!(await file.exists())) {
        throw new Error(`No package.json found in ${cwd}`)
    }
    return file.json()
}

async function writePackageJson(cwd: string, pkg: Record<string, any>): Promise<void> {
    const pkgPath = resolve(cwd, "package.json")
    await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + "\n")
}

/**
 * Bump a semver string. Returns the new version.
 * Handles simple X.Y.Z only — no pre-release suffixes.
 */
function bumpVersion(version: string, bump: BumpType): string {
    if (bump === "none") return version
    const parts = version.split(".").map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) {
        throw new Error(`Cannot bump non-standard version: "${version}". Expected X.Y.Z format.`)
    }
    const [major = 0, minor = 0, patch = 0] = parts
    if (bump === "major") return `${major + 1}.0.0`
    if (bump === "minor") return `${major}.${minor + 1}.0`
    return `${major}.${minor}.${patch + 1}`
}

/**
 * Check if a specific version is already published on npm.
 * Returns true if it exists (meaning we should abort).
 */
async function isVersionPublished(
    packageName: string,
    version: string,
    registry?: string,
): Promise<boolean> {
    const args = ["npm", "view", `${packageName}@${version}`, "version"]
    if (registry) args.push("--registry", registry)
    const result = await run(args)
    return result.ok && result.stdout.trim() === version
}

// ── Git helpers ───────────────────────────────────────────────────────────────

async function gitIsClean(): Promise<boolean> {
    // Checks only package.json — we only care that it's committable
    const result = await run(["git", "status", "--porcelain", "package.json"])
    return result.ok
}

async function gitCommitVersionBump(version: string): Promise<boolean> {
    const add = await run(["git", "add", "package.json"])
    if (!add.ok) return false
    const commit = await run(["git", "commit", "-m", `chore: release v${version}`])
    return commit.ok
}

async function gitTag(version: string): Promise<boolean> {
    const result = await run(["git", "tag", `v${version}`])
    return result.ok
}

async function gitPush(): Promise<boolean> {
    const pushCommit = await run(["git", "push"])
    if (!pushCommit.ok) return false
    const pushTags = await run(["git", "push", "--tags"])
    return pushTags.ok
}

// ── Main deploy ───────────────────────────────────────────────────────────────

export interface DeployOptions {
    bump?: BumpType
    dryRun?: boolean
    noGit?: boolean
    noBump?: boolean
}

export async function deploy(configPath: string, options: DeployOptions = {}): Promise<void> {
    const cwd = process.cwd()
    console.log("vterm deploy — publishing to npm")
    console.log()

    // ── 1. Load config (optional) ─────────────────────────────────────────────
    let npmConfig: NonNullable<Awaited<ReturnType<typeof loadConfig>>["npm"]> = {}
    try {
        const config = await loadConfig(configPath)
        npmConfig = config.npm ?? {}
    } catch {
        // No config file is fine — use package.json defaults
    }

    const dryRun = options.dryRun || npmConfig.dryRun || false
    const bump: BumpType = options.noBump ? "none" : (options.bump ?? "patch")

    // Resolve git config
    const gitCfg = npmConfig.git
    const gitEnabled = options.noGit ? false : gitCfg !== false
    const gitCommit = gitEnabled && (gitCfg === true || gitCfg == null || (typeof gitCfg === "object" && gitCfg.commit !== false))
    const gitTagEnabled = gitEnabled && (gitCfg === true || gitCfg == null || (typeof gitCfg === "object" && gitCfg.tag !== false))
    const gitPushEnabled = gitEnabled && typeof gitCfg === "object" && gitCfg.push === true

    // ── 2. Read package.json ──────────────────────────────────────────────────
    const pkg = await readPackageJson(cwd)
    const packageName = npmConfig.name ?? pkg.name
    const currentVersion: string = pkg.version

    if (!packageName) {
        console.error("Error: package name not found in package.json or vterm.config.ts npm.name")
        process.exit(1)
    }
    if (!currentVersion) {
        console.error("Error: version not found in package.json")
        process.exit(1)
    }

    // ── 3. Bump version ───────────────────────────────────────────────────────
    const newVersion = bumpVersion(currentVersion, bump)
    const bumped = newVersion !== currentVersion

    console.log(`  Package : ${packageName}`)
    console.log(`  Version : ${currentVersion}${bumped ? ` → ${newVersion}` : " (no bump)"}`)
    if (npmConfig.registry) console.log(`  Registry: ${npmConfig.registry}`)
    if (npmConfig.tag) console.log(`  Tag     : ${npmConfig.tag}`)
    if (dryRun) console.log(`  Dry run : yes`)
    console.log()

    // ── 4. Check npm auth ─────────────────────────────────────────────────────
    const whoami = await run(["npm", "whoami", ...(npmConfig.registry ? ["--registry", npmConfig.registry] : [])])
    if (!whoami.ok) {
        console.error("Error: not logged in to npm. Run `npm login` first.")
        if (whoami.stderr) console.error(whoami.stderr)
        process.exit(1)
    }
    console.log(`  Publishing as: ${whoami.stdout}`)
    console.log()

    // ── 5. Check version not already published ────────────────────────────────
    if (!dryRun) {
        const alreadyPublished = await isVersionPublished(packageName, newVersion, npmConfig.registry)
        if (alreadyPublished) {
            console.error(`Error: ${packageName}@${newVersion} is already published on npm.`)
            console.error(`       Bump the version or use a different bump type.`)
            process.exit(1)
        }
    }

    // ── 6. Write bumped version to package.json ───────────────────────────────
    if (bumped) {
        pkg.version = newVersion
        await writePackageJson(cwd, pkg)
        console.log(`  Updated package.json → v${newVersion}`)
        console.log()
    }

    // ── 7. Build production bundle ────────────────────────────────────────────
    console.log("Building production bundle...")
    console.log()
    await bundle(configPath, { name: npmConfig.name, version: newVersion })

    // ── 8. Git: commit version bump + tag ─────────────────────────────────────
    if (bumped && gitCommit) {
        console.log("Creating git commit...")
        const committed = await gitCommitVersionBump(newVersion)
        if (!committed) {
            console.warn("  Warning: git commit failed — continuing anyway")
        } else {
            console.log(`  Committed: chore: release v${newVersion}`)
        }
    }

    if (bumped && gitTagEnabled) {
        console.log("Creating git tag...")
        const tagged = await gitTag(newVersion)
        if (!tagged) {
            console.warn(`  Warning: git tag v${newVersion} failed — continuing anyway`)
        } else {
            console.log(`  Tagged: v${newVersion}`)
        }
    }

    // ── 9. npm publish ────────────────────────────────────────────────────────
    const outputDir = resolve(cwd, ".output")
    const publishArgs = ["npm", "publish", outputDir]
    if (npmConfig.registry) publishArgs.push("--registry", npmConfig.registry)
    publishArgs.push("--access", npmConfig.access ?? "public")
    if (npmConfig.tag) publishArgs.push("--tag", npmConfig.tag)
    if (dryRun) publishArgs.push("--dry-run")

    console.log()
    console.log(`  Running: ${publishArgs.join(" ")}`)
    console.log()

    const ok = await runInherited(publishArgs)
    if (!ok) {
        console.error("npm publish failed.")
        // Revert package.json bump if publish failed and we wrote it
        if (bumped) {
            pkg.version = currentVersion
            await writePackageJson(cwd, pkg)
            console.error(`  Reverted package.json to v${currentVersion}`)
        }
        process.exit(1)
    }

    // ── 10. Git push ──────────────────────────────────────────────────────────
    if (gitPushEnabled) {
        console.log("Pushing to remote...")
        const pushed = await gitPush()
        if (!pushed) {
            console.warn("  Warning: git push failed — published to npm but remote not updated")
        } else {
            console.log("  Pushed commit and tags")
        }
    }

    console.log()
    if (dryRun) {
        console.log(`✓ Dry run complete — ${packageName}@${newVersion} was NOT published`)
    } else {
        console.log(`✓ Published ${packageName}@${newVersion}`)
    }
}
