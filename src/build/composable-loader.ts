import { transform } from "sucrase"

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

    const code = `"use strict";\n${script}\nreturn { ${exportNames.join(", ")} };`

    const factory = new Function(...Object.keys(moduleScope), code)
    return factory(...Object.values(moduleScope))
}
