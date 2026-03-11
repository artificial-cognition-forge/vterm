import { parse, compileScript, compileTemplate, parseCache } from "@vue/compiler-sfc"
import { resolve, dirname } from "path"
import * as vue from "vue"
import { transform } from "sucrase"
import * as router from "../router/index"
import * as composables from "../platform/composables/exports"
import * as store from "../platform/store/store"
import { vtermError, clearVTermError } from "../platform/error-state"
import { transformWithAutoImports, getRuntimeComposables } from "../../build/auto-imports"
import { extractSFCStyles } from "../css"

// Cache to prevent circular dependencies and duplicate loads
const componentCache = new Map<string, any>()

// Global styles registry: selector → LayoutProperties
const globalStyles = new Map<string, any>()

// Store reference to loaded routes (lazy loaded)
let cachedRoutes: any[] | null = null

// Function to load routes lazily
async function loadRoutesIfNeeded() {
    if (cachedRoutes !== null) {
        return cachedRoutes
    }

    try {
        const routesPath = resolve(process.cwd(), ".vterm/routes.ts")
        // Use dynamic import to load the routes module
        const routesModule = await import(routesPath)
        cachedRoutes = routesModule.routes || []
        return cachedRoutes
    } catch (error) {
        console.error("Failed to load file-based routes:", error)
        cachedRoutes = []
        return []
    }
}

// Wrapper function that returns routes synchronously (assumes they're already loaded)
function useFileBasedRoutesSync(): any[] {
    if (cachedRoutes === null) {
        console.warn("Routes not yet loaded. Returning empty array.")
        return []
    }
    return cachedRoutes
}

// Render callback registered by the vterm runtime so directives can trigger
// a terminal re-render after they update internal node state.
let _requestRender: (() => void) | null = null

export function registerRenderCallback(fn: () => void): void {
    _requestRender = fn
}

// Shared module scope - created once and reused for all components
const STATIC_MODULE_SCOPE = Object.freeze({
    ref: vue.ref,
    reactive: vue.reactive,
    computed: vue.computed,
    watch: vue.watch,
    watchEffect: vue.watchEffect,
    onMounted: vue.onMounted,
    onUnmounted: vue.onUnmounted,
    onBeforeMount: vue.onBeforeMount,
    onBeforeUnmount: vue.onBeforeUnmount,
    defineComponent: vue.defineComponent,
    defineProps: vue.defineProps,
    defineEmits: vue.defineEmits,
    withDefaults: vue.withDefaults,
    h: vue.h,
    unref: vue.unref,
    toRef: vue.toRef,
    toRefs: vue.toRefs,
    isRef: vue.isRef,
    inject: vue.inject,
    provide: vue.provide,
    getCurrentInstance: vue.getCurrentInstance,
    useSlots: vue.useSlots,
    useAttrs: vue.useAttrs,
    cloneVNode: vue.cloneVNode,
    // Router utilities
    useRouter: router.useRouter,
    useRoute: router.useRoute,
    RouterView: router.RouterView,
    createRouter: router.createRouter,
    installRouter: router.installRouter,
    loadFileBasedRoutes: useFileBasedRoutesSync, // Use sync version in SFC context
    useFileBasedRoutes: useFileBasedRoutesSync, // Use sync version in SFC context
    // Composables
    useKeys: composables.useKeys,
    useScreen: composables.useScreen,
    useFocus: composables.useFocus,
    useRender: composables.useRender,
    // Error state — exposed so platform error.vue can read/clear the current error
    vtermError,
    clearVTermError,
    // Page metadata (no-op at runtime — extracted at build time into route meta)
    definePageMeta: (_meta: any) => {},
    // Storage utilities
    useStore: store.useStore,
    createStore: store.createStore,
    // Compiler aliases (used by @vue/compiler-sfc)
    _defineComponent: vue.defineComponent,
    _toDisplayString: vue.toDisplayString,
    _createElementVNode: vue.createVNode,
    _createTextVNode: vue.createTextVNode,
    _createCommentVNode: vue.createCommentVNode,
    _openBlock: vue.openBlock,
    _createElementBlock: vue.createElementBlock,
    _createBlock: vue.createBlock,
    _withCtx: vue.withCtx,
    _renderList: vue.renderList,
    _Fragment: vue.Fragment,
    _normalizeClass: vue.normalizeClass,
    _normalizeStyle: vue.normalizeStyle,
    _normalizeProps: vue.normalizeProps,
    _guardReactiveProps: vue.guardReactiveProps,
    _resolveComponent: vue.resolveComponent,
    _resolveDynamicComponent: vue.resolveDynamicComponent,
    _unref: vue.unref,
    _isRef: vue.isRef,
    _toHandlers: vue.toHandlers,
    _mergeProps: vue.mergeProps,
    _createVNode: vue.createVNode,
    _withDirectives: vue.withDirectives,
    // v-model directives for text inputs.
    // The DOM vModelText directive is replaced here because in a custom renderer the
    // "el" is a LayoutNode, not a real DOM element.  We sync the binding value to the
    // node's internal _inputValue so that programmatic resets (e.g. `input.value = ""`)
    // are reflected in the rendered input.  We only overwrite if the values differ so
    // that normal user-typing (where emitUpdate already kept them in sync) is unaffected.
    _vModelText: {
        beforeMount(el: any, binding: any) {
            const val = String(binding.value ?? '')
            el._inputValue = val
            el._cursorPos = val.length
        },
        mounted() {},
        beforeUpdate() {},
        updated(el: any, binding: any) {
            const newVal = String(binding.value ?? '')
            if (el._inputValue !== newVal) {
                el._inputValue = newVal
                el._cursorPos = newVal.length
                // Trigger a terminal re-render — Vue's patchProp fired notifyUpdate()
                // before this directive hook ran, so the old _inputValue was rendered.
                _requestRender?.()
            }
        },
    },
    _vModelCheckbox: { beforeMount() {}, mounted() {}, beforeUpdate() {}, updated() {} },
    _vModelRadio: { beforeMount() {}, mounted() {}, beforeUpdate() {}, updated() {} },
    _vModelSelect: { beforeMount() {}, mounted() {}, beforeUpdate() {}, updated() {} },
    _vModelDynamic: { beforeMount() {}, mounted() {}, beforeUpdate() {}, updated() {} },
    _vShow: vue.vShow,
    _renderSlot: vue.renderSlot,
    _pushScopeId: () => {},
    _popScopeId: () => {},
    _createStaticVNode: vue.createStaticVNode,
    _setBlockTracking: vue.setBlockTracking,
})

// Cache for runtime composables
let runtimeComposablesCache: Record<string, any> | null = null

/**
 * Get the complete module scope including runtime composables
 */
async function getModuleScope(): Promise<Record<string, any>> {
    if (!runtimeComposablesCache) {
        runtimeComposablesCache = await getRuntimeComposables()
    }
    return { ...STATIC_MODULE_SCOPE, ...runtimeComposablesCache }
}

/**
 * Clear the component cache - useful for hot reload
 */
export function clearComponentCache() {
    componentCache.clear()
    runtimeComposablesCache = null
    globalStyles.clear()
    cachedRoutes = null
    // Clear Vue's internal SFC parse cache so that the next compilation gets a
    // fresh, unmutated descriptor. Without this, compileScript mutates the cached
    // descriptor on first use and subsequent hot-reload compilations receive the
    // stale mutated object, causing imported components (e.g. <Sidebar />) to be
    // compiled as string elements instead of component references.
    parseCache.clear()
}

/**
 * Get all global styles
 */
export function getAllStyles(): Map<string, any> {
    return globalStyles
}

/**
 * Get compiled styles for a class name
 */
export function getStyleForClass(className: string): any {
    // Try exact match first
    if (globalStyles.has(`.${className}`)) {
        return globalStyles.get(`.${className}`)
    }

    // Try without dot
    if (globalStyles.has(className)) {
        return globalStyles.get(className)
    }

    return null
}

/**
 * Get compiled styles for an element type
 */
export function getStyleForElement(elementType: string): any {
    if (globalStyles.has(elementType)) {
        return globalStyles.get(elementType)
    }
    return null
}

/**
 * Get all styles that apply to an element
 * Handles element type selectors, class selectors, and basic descendant selectors
 */
export function getStylesForElement(
    elementType: string,
    classes: string[] = [],
    parentClasses: string[][] = []
): any {
    let mergedStyles: any = {}

    // Helper to deep merge styles
    const merge = (target: any, source: any) => {
        for (const key in source) {
            if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
                target[key] = target[key] || {}
                merge(target[key], source[key])
            } else {
                target[key] = source[key]
            }
        }
    }

    // 1. Apply element type styles (e.g., "div", "text", "section")
    const elementStyle = getStyleForElement(elementType)
    if (elementStyle) {
        merge(mergedStyles, elementStyle)
    }

    // 2. Apply class styles (e.g., ".item", ".blue")
    for (const className of classes) {
        const classStyle = getStyleForClass(className)
        if (classStyle) {
            merge(mergedStyles, classStyle)
        }
    }

    // 3. Apply descendant selector styles (e.g., ".parent .child")
    // This is a simplified implementation - doesn't handle complex CSS selectors
    for (const className of classes) {
        for (const ancestorClasses of parentClasses) {
            for (const ancestorClass of ancestorClasses) {
                // Try ".parent .child" pattern
                const descendantSelector = `.${ancestorClass} .${className}`
                if (globalStyles.has(descendantSelector)) {
                    merge(mergedStyles, globalStyles.get(descendantSelector))
                }

                // Try "parent .child" pattern (element + class)
                const mixedSelector = `${ancestorClass} .${className}`
                if (globalStyles.has(mixedSelector)) {
                    merge(mergedStyles, globalStyles.get(mixedSelector))
                }
            }
        }
    }

    return Object.keys(mergedStyles).length > 0 ? mergedStyles : null
}

/**
 * Load and compile a Vue SFC file at runtime
 */
export async function loadSFC(filepath: string): Promise<any> {
    // Check cache first
    const absolutePath = resolve(filepath)
    if (componentCache.has(absolutePath)) {
        return componentCache.get(absolutePath)
    }

    // Read the SFC file asynchronously using Bun
    let source = await Bun.file(absolutePath).text()

    // Apply auto-imports to the entire source BEFORE parsing
    // Pass the file path so unimport knows it's a Vue SFC and injects
    // imports inside the <script> block rather than at the top of the file.
    source = await transformWithAutoImports(source, absolutePath)

    // Parse the SFC
    const { descriptor, errors } = parse(source, {
        filename: absolutePath,
    })

    if (errors.length) {
        throw new Error(`SFC parse errors:\n${errors.join("\n")}`)
    }

    // Process styles if present
    if (descriptor.styles && descriptor.styles.length > 0) {
        const styleBlocks = descriptor.styles.map(s => ({
            content: s.content,
            scoped: s.scoped,
        }))

        const parsedStyles = await extractSFCStyles(styleBlocks)

        // Register styles in global registry
        for (const [selector, style] of Object.entries(parsedStyles)) {
            globalStyles.set(selector, style)
        }
    }

    // Compile the script with inline template
    let script = ""
    const componentImports: Record<string, any> = {}

    if (descriptor.script || descriptor.scriptSetup) {
        const compiled = compileScript(descriptor, {
            id: absolutePath,
            inlineTemplate: true,
            templateOptions: {
                compilerOptions: {
                    isCustomElement: () => true,
                    hoistStatic: false, // Disable static hoisting to avoid insertStaticContent issues
                    // Treat <code> as preformatted so whitespace/newlines are preserved
                    isPreTag: (tag: string) => tag === 'pre' || tag === 'code',
                },
            },
        })
        script = compiled.content

        // Use sucrase to strip TypeScript syntax
        const transformed = transform(script, {
            transforms: ["typescript"],
            disableESTransforms: true,
        })
        script = transformed.code

        // Extract and resolve component imports (before removing them)
        const defaultImportRegex = /import\s+(\w+)\s+from\s+['"]([^'"]+\.vue)['"]/g
        let match
        while ((match = defaultImportRegex.exec(script)) !== null) {
            const componentName = match[1]
            const importPath = match[2]
            if (componentName && importPath) {
                const componentPath = resolve(dirname(absolutePath), importPath)
                // Recursively load the imported component
                componentImports[componentName] = await loadSFC(componentPath)
            }
        }

        // Transform the script to remove import/export statements
        // Remove default imports (including .vue components)
        script = script.replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, match => {
            return `// ${match} (provided by runtime)`
        })
        // Remove named imports
        script = script.replace(/import\s+{[^}]+}\s+from\s+['"][^'"]+['"]/g, match => {
            return `// ${match} (provided by runtime)`
        })
        // Remove namespace imports
        script = script.replace(/import\s+\*\s+as\s+\w+\s+from\s+['"][^'"]+['"]/g, match => {
            return `// ${match} (provided by runtime)`
        })
        // Remove "export default" and replace with const declaration
        const originalScript = script
        script = script.replace(/export\s+default\s+/g, "const _sfc_main = ")

        // If no export default was found, ensure _sfc_main is still defined
        if (script === originalScript && !script.includes("const _sfc_main")) {
            script = "const _sfc_main = {}\n" + script
        }
    } else if (descriptor.template) {
        // No script block but has template - compile template only
        const compiledTemplate = compileTemplate({
            id: absolutePath,
            source: descriptor.template.content,
            filename: absolutePath,
            compilerOptions: {
                isCustomElement: () => true,
                hoistStatic: false, // Disable static hoisting to avoid insertStaticContent issues
                isPreTag: (tag: string) => tag === 'pre' || tag === 'code',
            },
        })

        // Transform to remove imports and create component
        let templateCode = compiledTemplate.code
        templateCode = templateCode.replace(/import\s+{[^}]+}\s+from\s+['"]vue['"]/g, "")
        templateCode = templateCode.replace(/export\s+function\s+render/g, "function render")

        script = `
      ${templateCode}
      const _sfc_main = { render }
    `
    } else {
        // No script and no template - create a minimal component
        script = "const _sfc_main = {}"
    }

    // Get the complete module scope including runtime composables
    const baseScope = await getModuleScope()

    // Create module scope by extending with component imports.
    // _cache must be a fresh array per component so compiled render functions
    // don't share memoized values (event handlers, static vnodes) across components.
    const moduleScope = {
        ...(Object.keys(componentImports).length > 0 ? { ...baseScope, ...componentImports } : baseScope),
        _cache: [],
    }

    // Build the component code (template is now inlined in script)
    const componentCode = `
    "use strict";
    ${script}
    if (typeof _sfc_main === 'undefined') {
      throw new Error('Component compilation failed: _sfc_main is not defined. Script output:\\n' + ${JSON.stringify(script.substring(0, 500))});
    }
    return _sfc_main;
  `

    // Create a function from the code
    const componentFactory = new Function(...Object.keys(moduleScope), componentCode)

    // Execute with the module scope
    const component = componentFactory(...Object.values(moduleScope))

    // Cache the component
    componentCache.set(absolutePath, component)

    return component
}
