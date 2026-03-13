import { prepareProject } from "./build/prepare"

/**
 * Build command orchestrator - generates type declarations, configuration,
 * and a bin/ shell script wired to `vterm dev`.
 */
export async function build(): Promise<void> {
    await prepareProject()
}
