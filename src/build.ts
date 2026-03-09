import { prepareProject } from "./build/prepare"

/**
 * Build command orchestrator - generates type declarations and configuration
 *
 * This is essentially an alias for the prepare command, but named "build" for
 * consistency with common tooling conventions. It prepares the project for
 * development or production use by generating:
 * - Auto-import type declarations (.vterm/auto-imports.d.ts)
 * - TypeScript configuration (.vterm/tsconfig.json)
 * - Routes module (.vterm/routes.ts)
 */
export async function build(): Promise<void> {
  await prepareProject()
}
