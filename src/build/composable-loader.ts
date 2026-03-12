import { transform } from "sucrase"
import { resolve, dirname } from "path"

/**
 * Load a TypeScript composable file in VTerm's module scope.
 *
 * Composables loaded via regular import() resolve `vue` through the user project's
 * node_modules, which may be a different Vue instance from VTerm's renderer. When
 * two Vue instances exist, the component render effects (Vue-A) don't track reactive
 * deps created by composable refs (Vue-B), so state changes never trigger re-renders.
 *
 * This function loads the composable in VTerm's module scope — the same way SFC
 * <script setup> blocks are executed — so that `ref`, `reactive`, etc. all come
 * from VTerm's Vue, making reactivity work correctly across the full pipeline.
 */
export async function loadComposableInScope(
    filepath: string,
    moduleScope: Record<string, any>
): Promise<Record<string, any>> {
    const source = await Bun.file(filepath).text()

    // Strip TypeScript types with sucrase (same transform used for SFC scripts)
    const transformed = transform(source, {
        transforms: ["typescript"],
        disableESTransforms: true,
    })
    let script = transformed.code

    // Extract external package imports before stripping them so we can resolve
    // them and inject their named exports into the scope.
    // Matches: import { A, B as C } from "pkg" (non-relative, non-type)
    const externalImports: Array<{ names: Array<{ imported: string; local: string }>; pkg: string }> = []
    const importRegex = /^\s*import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/gm
    let match: RegExpExecArray | null
    while ((match = importRegex.exec(script)) !== null) {
        const pkg = match[2]!
        // Skip relative imports and vue/vterm (already in scope)
        if (pkg.startsWith('.') || pkg === 'vue' || pkg.startsWith('@arcforge/vterm')) continue
        const names = match[1]!.split(',').map(s => s.trim()).filter(Boolean).map(s => {
            const [imported, local] = s.split(/\s+as\s+/)
            return { imported: imported!.trim(), local: (local ?? imported)!.trim() }
        })
        externalImports.push({ names, pkg })
    }

    // Resolve external packages using Bun.resolve relative to the composable's
    // own directory so the user project's node_modules are used (not vterm's).
    const fileDir = dirname(filepath)
    for (const { names, pkg } of externalImports) {
        try {
            const resolved = await Bun.resolve(pkg, fileDir)
            const mod = await import(resolved)
            for (const { imported, local } of names) {
                const val = mod[imported] ?? mod.default?.[imported]
                if (val !== undefined) {
                    ;(moduleScope as any)[local] = val
                }
            }
        } catch {
            // Package not resolvable — leave undefined, will surface at runtime
        }
    }

    // Collect exported names so we can return them from the new Function wrapper
    const exportNames: string[] = []

    // export function / export async function
    script = script.replace(/\bexport\s+(async\s+)?function\s+(\w+)/g, (_, async_, name: string) => {
        if (!exportNames.includes(name)) exportNames.push(name)
        return `${async_ ?? ""}function ${name}`
    })

    // export const/let/var name
    script = script.replace(/\bexport\s+(const|let|var)\s+(\w+)/g, (_, kind: string, name: string) => {
        if (!exportNames.includes(name)) exportNames.push(name)
        return `${kind} ${name}`
    })

    // export class Name
    script = script.replace(/\bexport\s+class\s+(\w+)/g, (_, name: string) => {
        if (!exportNames.includes(name)) exportNames.push(name)
        return `class ${name}`
    })

    // export { name1, name2, name3 as alias }
    script = script.replace(/\bexport\s+\{([^}]+)\}/g, (_, names: string) => {
        for (const item of names.split(",").map((s: string) => s.trim())) {
            const finalName = item.split(/\s+as\s+/).pop()!.trim()
            if (finalName && !exportNames.includes(finalName)) exportNames.push(finalName)
        }
        return `/* export { ${names} } */`
    })

    // Strip all import statements — framework APIs (ref, reactive, useRender, etc.)
    // are provided via moduleScope, and type imports are already erased by sucrase.
    script = script.replace(/^\s*import\b[^\n]*/gm, m => `// ${m}`)

    if (exportNames.length === 0) return {}

    // Use `with` so identifier lookups resolve dynamically against the scope
    // object at *call time*. This means composables loaded later (e.g. useModels)
    // are visible to composables that reference them (e.g. useChat), even when
    // the scope object is mutated after the Function is constructed.
    // Note: `with` requires sloppy mode (no "use strict" on the outer wrapper).
    const code = `with (__scope__) {\n${script}\nreturn { ${exportNames.join(", ")} };\n}`

    const factory = new Function("__scope__", code)
    return factory(moduleScope)
}
