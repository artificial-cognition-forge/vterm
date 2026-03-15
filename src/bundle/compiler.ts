import { parse, compileScript, compileTemplate } from "@vue/compiler-sfc"
import { resolve, dirname, relative, basename, join } from "path"
import { createHash } from "crypto"

/**
 * Generate a deterministic scope ID for a Vue SFC, matching Vue's own convention.
 * Uses a short hash of the file path so each component gets a unique, stable ID.
 */
function generateScopeId(filePath: string): string {
    const hash = createHash("sha256").update(filePath).digest("hex").slice(0, 8)
    return `data-v-${hash}`
}

// Absolute path to the prod runtime — used as import target in compiled SFC modules
// so bun build never has to resolve package.json exports of @arcforge/vterm.
const PROD_RUNTIME_PATH = resolve(dirname(import.meta.path), "../runtime/prod")
import { transform } from "sucrase"
import { glob } from "glob"
import { transformWithAutoImports, initAutoImports } from "../build/auto-imports"
import type { VTermConfig } from "../types/types"

/**
 * A compiled SFC entry: the output JS path and the original source path.
 */
export interface CompiledSFC {
    sourcePath: string
    outputPath: string
    /** Import specifier to use in bootstrap (relative to .vterm/) */
    importSpecifier: string
}

/**
 * Derive a flat filename for a compiled SFC.
 * app/pages/users/[id].vue → app__pages__users__[id].vue.js
 */
function sfcOutputName(absolutePath: string, cwd: string): string {
    const rel = relative(cwd, absolutePath)
    return rel.replace(/\//g, "__") + ".js"
}

/**
 * Discover all .vue files reachable from config entry + pages directory.
 */
export async function discoverSFCs(config: VTermConfig, cwd: string = process.cwd()): Promise<string[]> {
    const paths = new Set<string>()

    // Entry component
    if (config.entry) {
        paths.add(resolve(config.entry))
    }

    // Layout component
    if (typeof config.layout === "string") {
        paths.add(resolve(config.layout))
    }

    // All pages
    const pagesDir = resolve(cwd, "app/pages")
    try {
        const pageFiles = await glob("**/*.vue", { cwd: pagesDir, absolute: true })
        for (const f of pageFiles) paths.add(f)
    } catch {
        // No pages dir — that's fine
    }

    // All components (may be referenced by pages/entry)
    const componentsDir = resolve(cwd, "app/components")
    try {
        const componentFiles = await glob("**/*.vue", { cwd: componentsDir, absolute: true })
        for (const f of componentFiles) paths.add(f)
    } catch {
        // No components dir
    }

    // Layout directory (per-page layouts)
    const layoutDir = resolve(cwd, "app/layout")
    try {
        const layoutFiles = await glob("**/*.vue", { cwd: layoutDir, absolute: true })
        for (const f of layoutFiles) paths.add(f)
    } catch {
        // No layout dir
    }

    return Array.from(paths)
}

/**
 * AOT-compile a single .vue file to a JS module string.
 * The output uses static ES imports (no runtime Proxy scope).
 */
export async function compileSFCToJS(filePath: string): Promise<string> {
    const absolutePath = resolve(filePath)
    let source = await Bun.file(absolutePath).text()

    // Inject auto-imports into the script setup block specifically.
    // unimport injects import statements at the top of the string it receives.
    // If we pass the entire SFC, the injected imports land OUTSIDE <script setup>
    // and are silently discarded by the SFC parser. Instead, we extract the script
    // block content, inject into that, then splice it back into the SFC source.
    const scriptSetupMatch = source.match(/(<script\s[^>]*setup[^>]*>)([\s\S]*?)(<\/script>)/i)
        ?? source.match(/(<script>)([\s\S]*?)(<\/script>)/i)
    if (scriptSetupMatch) {
        const [fullMatch, openTag, scriptContent, closeTag] = scriptSetupMatch
        const transformedScript = await transformWithAutoImports(scriptContent, absolutePath)
        source = source.replace(fullMatch, `${openTag}${transformedScript}${closeTag}`)
    }

    const { descriptor, errors } = parse(source, { filename: absolutePath })
    if (errors.length) {
        throw new Error(`SFC parse errors in ${filePath}:\n${errors.map(String).join("\n")}`)
    }

    // Generate a deterministic scope ID for this file. We use this both to
    // namespace scoped style selectors and to stamp the component object with
    // __scopeId so Vue's render pipeline calls pushScopeId/popScopeId around
    // each component's render, letting the layout renderer tag each LayoutNode
    // with the right scope and match only the correct scoped CSS rules.
    const hasScopedStyles = descriptor.styles?.some(s => s.scoped)
    const scopeId = hasScopedStyles ? generateScopeId(absolutePath) : null

    let script = ""
    const componentImportLines: string[] = []

    if (descriptor.script || descriptor.scriptSetup) {
        const compiled = compileScript(descriptor, {
            id: scopeId ?? absolutePath,
            inlineTemplate: true,
            templateOptions: {
                compilerOptions: {
                    isCustomElement: () => true,
                    hoistStatic: false,
                    isPreTag: (tag) => tag === "pre" || tag === "code",
                },
            },
        })

        script = compiled.content

        // Strip TypeScript
        const transformed = transform(script, {
            transforms: ["typescript"],
            disableESTransforms: true,
        })
        script = transformed.code

        // Process all import statements:
        //  - .vue component imports → re-emit pointing to compiled output
        //  - vue / @arcforge/vterm imports → strip (re-emitted as static lines)
        //  - local app imports (composables, utils) → preserve as-is
        const allImportRe = /^import\s+.*$/gm
        const localImportLines: string[] = []
        script = script.replace(allImportRe, (line) => {
            // .vue component import — remap to compiled output path
            const vueMatch = line.match(/import\s+(\w+)\s+from\s+['"]([^'"]+\.vue)['"]/)
            if (vueMatch) {
                const name = vueMatch[1]!
                const importPath = vueMatch[2]!
                const absImport = resolve(dirname(absolutePath), importPath)
                const outputName = sfcOutputName(absImport, process.cwd())
                componentImportLines.push(`import ${name} from "./${outputName}"`)
                return ""
            }
            // vue or @arcforge/vterm — strip, re-emitted as static header lines
            if (line.includes(' from "vue"') || line.includes(" from 'vue'") ||
                line.includes('@arcforge/vterm')) {
                return ""
            }
            // Local app import (composable, util, etc.) — resolve to absolute
            // path so it works from .vterm/compiled/ instead of the original dir.
            const relMatch = line.match(/from\s+['"](\.[^'"]+)['"]/)
            if (relMatch) {
                const relPath = relMatch[1]!
                const absPath = resolve(dirname(absolutePath), relPath)
                localImportLines.push(line.replace(relMatch[0]!, `from ${JSON.stringify(absPath)}`))
            } else {
                localImportLines.push(line)
            }
            return ""
        })
        // Re-inject local imports after the static header lines (added below)
        componentImportLines.push(...localImportLines)
        // Replace "export default" with a named const, then re-export
        script = script.replace(/export\s+default\s+/, "const _sfc_main = ")

        if (!script.includes("const _sfc_main")) {
            script = "const _sfc_main = {}\n" + script
        }

        // Inject __scopeId onto the component so Vue's renderer calls
        // pushScopeId/popScopeId around each render, letting the layout renderer
        // tag LayoutNodes and match scoped CSS selectors correctly.
        if (scopeId) {
            script += `\n_sfc_main.__scopeId = ${JSON.stringify(scopeId)}`
        }
    } else if (descriptor.template) {
        const compiledTemplate = compileTemplate({
            id: absolutePath,
            source: descriptor.template.content,
            filename: absolutePath,
            compilerOptions: {
                isCustomElement: () => true,
                hoistStatic: false,
                isPreTag: (tag) => tag === "pre" || tag === "code",
            },
        })
        let templateCode = compiledTemplate.code
        templateCode = templateCode.replace(/import\s+\{[^}]+\}\s+from\s+['"]vue['"]/g, "")
        templateCode = templateCode.replace(/export\s+function\s+render/, "function render")
        script = `${templateCode}\nconst _sfc_main = { render }`
    } else {
        script = "const _sfc_main = {}"
    }

    // Extract CSS blocks — embed raw CSS so the runtime CSS pipeline can process them.
    // For scoped blocks, include the file-level scopeId so styles are namespaced and
    // only match nodes rendered by this component.
    const styleBlocks: Array<{ content: string; scoped: boolean; scopeId?: string; lang?: string }> = []
    if (descriptor.styles?.length) {
        for (const s of descriptor.styles) {
            styleBlocks.push({
                content: s.content,
                scoped: s.scoped ?? false,
                scopeId: s.scoped && scopeId ? scopeId : undefined,
                lang: s.lang ?? undefined,
            })
        }
    }

    // Build the final module
    const lines: string[] = [
        `// Auto-compiled from ${basename(filePath)} — do not edit`,
        // Named imports used directly by user code + underscore-prefixed aliases
        // emitted by @vue/compiler-sfc in compiled template render functions.
        `import { ref, reactive, computed, watch, watchEffect, onMounted, onUnmounted, onBeforeMount, onBeforeUnmount, defineComponent, h, unref, toRef, toRefs, isRef, inject, provide, getCurrentInstance, useSlots, useAttrs, cloneVNode, toDisplayString, openBlock, createElementBlock, createElementVNode, createTextVNode, createCommentVNode, createBlock, withCtx, renderList, Fragment, normalizeClass, normalizeStyle, normalizeProps, guardReactiveProps, resolveComponent, resolveDynamicComponent, toHandlers, mergeProps, createVNode, withDirectives, vShow, renderSlot, createStaticVNode, setBlockTracking } from "vue"`,
        `const _defineComponent = defineComponent, _toDisplayString = toDisplayString, _createElementVNode = createElementVNode, _createTextVNode = createTextVNode, _createCommentVNode = createCommentVNode, _openBlock = openBlock, _createElementBlock = createElementBlock, _createBlock = createBlock, _withCtx = withCtx, _renderList = renderList, _Fragment = Fragment, _normalizeClass = normalizeClass, _normalizeStyle = normalizeStyle, _normalizeProps = normalizeProps, _guardReactiveProps = guardReactiveProps, _resolveComponent = resolveComponent, _resolveDynamicComponent = resolveDynamicComponent, _unref = unref, _isRef = isRef, _toHandlers = toHandlers, _mergeProps = mergeProps, _createVNode = createVNode, _withDirectives = withDirectives, _vShow = vShow, _renderSlot = renderSlot, _createStaticVNode = createStaticVNode, _setBlockTracking = setBlockTracking`,
        `import { useRouter, useRoute, RouterView, RouterLink, createRouter, installRouter, loadFileBasedRoutes, useFileBasedRoutes } from ${JSON.stringify(PROD_RUNTIME_PATH)}`,
        `import { useKeys, useScreen, useFocus, useRender, useTerminal, useProcess } from ${JSON.stringify(PROD_RUNTIME_PATH)}`,
        `import { useStore, createStore, definePageMeta, __vModelText, __pushScopeId, __popScopeId } from ${JSON.stringify(PROD_RUNTIME_PATH)}`,
        `const _vModelText = __vModelText, _pushScopeId = __pushScopeId, _popScopeId = __popScopeId`,
        ...componentImportLines,
        ``,
        `// Embedded styles for runtime CSS pipeline`,
        `export const __styles = ${JSON.stringify(styleBlocks)}`,
        ``,
        script,
        ``,
        `export default _sfc_main`,
    ]

    return lines.join("\n")
}

/**
 * AOT-compile all discovered .vue files and write them to .vterm/compiled/.
 * Returns the mapping of sourcePath → CompiledSFC for use by bootstrap generator.
 */
export async function compileAllSFCs(config: VTermConfig, cwd: string = process.cwd()): Promise<CompiledSFC[]> {
    const vtermDir = resolve(cwd, ".vterm")
    const compiledDir = resolve(vtermDir, "compiled")

    // Ensure output directory exists
    await Bun.write(resolve(compiledDir, ".gitkeep"), "")

    // Init auto-imports (needed by compileSFCToJS)
    await initAutoImports(cwd)

    const sfcPaths = await discoverSFCs(config, cwd)
    const results: CompiledSFC[] = []

    for (const sourcePath of sfcPaths) {
        try {
            const outputName = sfcOutputName(sourcePath, cwd)
            const outputPath = resolve(compiledDir, outputName)
            const js = await compileSFCToJS(sourcePath)
            await Bun.write(outputPath, js)
            results.push({
                sourcePath,
                outputPath,
                importSpecifier: `./compiled/${outputName}`,
            })
            console.log(`  compiled ${relative(cwd, sourcePath)} → .vterm/compiled/${outputName}`)
        } catch (err) {
            console.error(`  ERROR compiling ${relative(cwd, sourcePath)}: ${err}`)
            throw err
        }
    }

    return results
}
