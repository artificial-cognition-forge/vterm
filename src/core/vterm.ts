/**
 * VTerm - Terminal UI framework with Vue components and CSS
 *
 * New architecture using custom terminal rendering:
 * 1. Layout Renderer (Vue → LayoutNodes)
 * 2. Layout Engine (compute positions/dimensions)
 * 3. Buffer Renderer (LayoutNodes → ScreenBuffer)
 * 4. Frame Differ (ScreenBuffer → ANSI codes)
 * 5. Terminal Driver (ANSI → stdout)
 */

import { TerminalDriver } from "../runtime/terminal/driver"
import { InputParser, type KeyEvent } from "../runtime/terminal/input"
import { BufferRenderer } from "../runtime/renderer/buffer-renderer"
import { InteractionManager } from "../runtime/renderer/interaction"
import { SelectionManager } from "../runtime/renderer/selection"
import { createLayoutRenderer, createLayoutNodeElement, applyCompoundStyles } from "../runtime/renderer/layout-renderer"
import { createLayoutEngine } from "./layout/tree"
import { loadSFC, getAllStyles, registerRenderCallback } from "./compiler/sfc-loader"
import { ScreenSymbol, RenderSymbol, InteractionSymbol, BufferRendererSymbol, SelectionSymbol, HighlightSymbol, ExitSymbol, ReloadSymbol, BeforeExitSymbol } from "./platform/composables/exports"
import { StoreSymbol, StoreOptionsSymbol, type Store } from "./platform/store/store"
import { installRouter, loadDefaultRoutes, getGlobalRouter } from "./router"
import { getElement } from "../runtime/elements/index"
import { setHighlightCallback, configureHighlighter, setHighlightTheme, getHighlightTheme } from "../runtime/elements/highlighter"
import { setVTermError, vtermError } from "./platform/error-state"
import { installConsoleCapture, uninstallConsoleCapture } from "./platform/composables/useConsole"
import { vtermEvent } from "../build/events"
import type { VTermOptions, VTermApp, SnapshotOptions } from "../types/types"
import type { ParsedStyles } from "./css/types"
import type { LayoutNode } from "./layout/types"

/**
 * Create a terminal app using custom terminal rendering
 */
export async function vterm(options: VTermOptions): Promise<VTermApp> {
    const _bootStart = Date.now()
    const { entry, layout, onMounted, quitKeys = ['C-c'], highlight, selection, ui, context } = options

    vtermEvent("vterm:boot", { cwd: process.cwd() })

    // Capture console output before anything else so no early logs are missed
    installConsoleCapture()
    vtermEvent("vterm:console:capture")

    // Configure syntax highlighter before any components load
    if (highlight) configureHighlighter(highlight)
    vtermEvent("vterm:highlight:config", { theme: highlight?.theme })

    // Initialize input parser for keyboard events
    const inputParser = new InputParser()

    const driver = new TerminalDriver({
        inputParser,
        alternateScreen: true,
        hideCursor: true,
        cursor: ui?.cursor,
    })

    // Initialize driver (raw mode, alternate screen, etc.)
    driver.initialize()
    vtermEvent("vterm:driver:init", { width: driver.width, height: driver.height })

    // Declare early so callbacks below can safely close over it without hitting the TDZ.
    // performLayout is also declared here as a stable indirection — the real implementation
    // is assigned later once all dependencies are ready. This avoids TDZ crashes when
    // input events fire during the async boot gap before performLayout is initialized.
    let currentLayoutRoot: LayoutNode | null = null
    let _doLayout: ((root: LayoutNode) => void) | null = null
    const triggerLayout = () => { if (currentLayoutRoot && _doLayout) _doLayout(currentLayoutRoot) }

    // Initialize interaction manager with both state change and render callbacks
    const interactionManager = new InteractionManager(
        triggerLayout,
        triggerLayout,
    )

    // Initialize selection manager
    const selectionManager = new SelectionManager(triggerLayout, selection)

    // Listen to mouse events — forward to both managers independently
    inputParser.on("mouse", mouseEvent => {
        // Back/forward mouse buttons trigger router navigation
        if (mouseEvent.type === "mousedown") {
            if (mouseEvent.button === "back") {
                getGlobalRouter()?.back()
                return
            }
            if (mouseEvent.button === "forward") {
                getGlobalRouter()?.forward()
                return
            }
        }

        try {
            if (currentLayoutRoot) {
                interactionManager.handleMouseEvent(mouseEvent, currentLayoutRoot)
            }
        } catch (err) {
            // User event handler threw — route to error page instead of crashing
            if (vtermError.value === null) setVTermError(err, 'event')
        }

        // Suppress native selection when the drag originated inside an editor —
        // editors manage their own text selection internally.
        const activeIsEditor = interactionManager.getActiveNode()?.type === 'editor'

        if (!activeIsEditor) {
            selectionManager.handleMouseEvent(mouseEvent)
        } else {
            // Clear any lingering native selection so it doesn't persist.
            selectionManager.clearSelection()
        }

        // Auto-copy to clipboard when a drag selection is finalized
        if (mouseEvent.type === 'mouseup' && selectionManager.hasSelection()) {
            const buffer = driver.getBuffer()
            selectionManager.copyToClipboard(buffer)
        }

        // Always re-render after mouse events — press handlers may mutate reactive
        // state (e.g. class bindings) that won't show until the next paint.
        scheduleRender()
    })

    // Route keypresses to focused interactive elements via the element behavior registry.
    // Skipped if a prior handler (e.g. useKeys mode switch) marked the key as consumed.
    inputParser.on("keypress", (key: KeyEvent) => {
        if (key.consumed) return

        const focused = interactionManager.getFocusedNode()
        if (!focused) return

        const behavior = getElement(focused.type)
        if (!behavior?.handleKey) return

        try {
            behavior.handleKey(focused, key, triggerLayout)
        } catch (err) {
            if (vtermError.value === null) setVTermError(err, 'event')
        }
    })

    // Initialize buffer renderer
    const bufferRenderer = new BufferRenderer(interactionManager, selectionManager, ui)

    // Setup render scheduling — always immediate via microtask queue
    let renderScheduled = false

    const performRender = () => {
        renderScheduled = false
        driver.render()
    }

    const scheduleRender = () => {
        if (renderScheduled) return
        renderScheduled = true
        queueMicrotask(performRender)
    }

    // Immediate render function — re-runs the full layout pipeline then paints.
    // Must call performLayout (not just driver.render) so that reactive state
    // changes made before this call are reflected in the screen buffer.
    const immediateRender = () => {
        if (currentLayoutRoot) {
            performLayout(currentLayoutRoot)
        } else {
            driver.render()
        }
    }

    // Allow the async syntax highlighter to trigger re-renders when tokens are ready
    setHighlightCallback(triggerLayout)

    // Load layout component if needed
    let layoutComponent: any = null
    let _layoutPath: string | null = null
    if (layout !== false) {
        try {
            const { resolve } = await import("path")
            const { existsSync } = await import("fs")

            if (typeof layout === "string") {
                _layoutPath = resolve(process.cwd(), layout)
            } else {
                _layoutPath = resolve(process.cwd(), "app/app.vue")
            }

            if (_layoutPath && existsSync(_layoutPath)) {
                layoutComponent = await loadSFC(_layoutPath)
            }
        } catch (error) {
            _layoutPath = null
        }
    }
    vtermEvent("vterm:layout:load", { path: _layoutPath })

    // Load file-based routes
    let routes: any[] = []
    try {
        const { resolve } = await import("path")
        const routesPath = resolve(process.cwd(), ".vterm/routes.ts")
        const routesModule = await import(routesPath + "?t=" + Date.now())
        if (routesModule.routes && routesModule.routes.length > 0) {
            // Load components one by one, catching errors for individual components
            // so that one bad component doesn't break the entire routing
            routes = await Promise.all(
                routesModule.routes.map(async (route: any) => {
                    if (route.componentPath) {
                        try {
                            const component = await loadSFC(route.componentPath)
                            return { ...route, component }
                        } catch (componentError) {
                            // Create an error component that displays the compilation error
                            const { defineComponent, h } = await import("vue")
                            const errorMsg = componentError instanceof Error
                                ? componentError.message
                                : String(componentError)
                            const component = defineComponent({
                                name: 'ComponentError',
                                setup() {
                                    return () => h("div", {
                                        width: "100%",
                                        height: "100%",
                                        style: {
                                            color: "red",
                                            padding: "1",
                                            overflow: "hidden"
                                        }
                                    }, [
                                        h("p", { style: { color: "red" } }, `❌ Failed to load component`),
                                        h("p", { style: { color: "yellow" } }, `Path: ${route.componentPath}`),
                                        h("p", { style: { color: "white" } }, `Error: ${errorMsg}`),
                                    ])
                                },
                            })
                            return { ...route, component }
                        }
                    }
                    return route
                })
            )
        } else {
            // No user routes found, load default platform routes
            const defaultRoutes = loadDefaultRoutes()
            if (defaultRoutes.length > 0) {
                routes = await Promise.all(
                    defaultRoutes.map(async (route: any) => {
                        if (route.component) {
                            // component is already a file path for default routes
                            const component = await loadSFC(route.component)
                            return { ...route, component }
                        }
                        return route
                    })
                )
            }
        }
    } catch (error) {
        // Try loading default routes as fallback
        try {
            const defaultRoutes = loadDefaultRoutes()
            if (defaultRoutes.length > 0) {
                routes = await Promise.all(
                    defaultRoutes.map(async (route: any) => {
                        if (route.component) {
                            // component is already a file path for default routes
                            const component = await loadSFC(route.component)
                            return { ...route, component }
                        }
                        return route
                    })
                )
            }
        } catch (defaultError) {
            // No routes available
        }
    }

    vtermEvent("vterm:routes:load", {
        count: routes.length,
        paths: routes.map((r: any) => r.path ?? r.name ?? "?"),
    })

    // Load per-page layouts from app/layout/ directory
    const layoutsMap = new Map<string, any>()
    try {
        const { resolve: resolvePath } = await import("path")
        const { existsSync } = await import("fs")
        const { glob } = await import("glob")

        const layoutDir = resolvePath(process.cwd(), 'app/layout')
        if (existsSync(layoutDir)) {
            const layoutFiles = await glob('**/*.vue', { cwd: layoutDir, absolute: false })
            for (const file of layoutFiles) {
                const name = file.replace(/\.vue$/, '').replace(/\//g, '-')
                const component = await loadSFC(resolvePath(layoutDir, file))
                layoutsMap.set(name, component)
            }
        }
    } catch {
        // No layouts directory - skip
    }

    vtermEvent("vterm:layouts:load", { names: [...layoutsMap.keys()] })

    // Load the built-in error page — always available regardless of routing setup
    const { resolve: _resolvePath } = await import("path")
    const errorPageComponent = await loadSFC(_resolvePath(import.meta.dir, "./platform/pages/error.vue"))

    // Determine component to render
    let component: any
    if (routes.length > 0) {
        if (layoutComponent) {
            component = layoutComponent
        } else {
            const { defineComponent, h } = await import("vue")
            const { RouterView } = await import("./router")
            component = defineComponent({
                name: "AppRoot",
                setup() {
                    return () => h(RouterView)
                },
            })
        }
    } else {
        if (!entry) {
            throw new Error(
                "No entry component specified and no routes found in app/pages directory"
            )
        }
        component = await loadSFC(entry)
    }

    // Wrap root component in an ErrorBoundary so any Vue component error is caught
    // and the error page is shown instead of crashing the process.
    const { defineComponent: _defComp, h: _h, onErrorCaptured: _onErrCapt } = await import("vue")
    const _originalComponent = component
    component = _defComp({
        name: 'VTermRoot',
        setup() {
            _onErrCapt((err: unknown) => {
                setVTermError(err, 'component')
                return false // prevent further propagation
            })
            return () => vtermError.value !== null
                ? _h(errorPageComponent)
                : _h(_originalComponent)
        },
    })

    // Get all styles from the global styles registry (populated by loadSFC)
    const globalStylesMap = getAllStyles()
    const allStyles: ParsedStyles = Object.fromEntries(globalStylesMap.entries())

    // Initialize layout engine with terminal dimensions and styles (for CSS variable resolution)
    const layoutEngine = createLayoutEngine(driver.width, driver.height, allStyles)


    // Guard: prevent an error-page render failure from looping
    let _errorRecoveryActive = false

    // Function to perform layout computation and rendering
    const performLayout = (layoutRoot: LayoutNode) => {
        try {
            // Apply compound (descendant) selector styles now that the tree is assembled.
            // patchProp runs before insert so has no ancestor context; this pass fills the gap.
            applyCompoundStyles(layoutRoot, allStyles)

            // Compute layout for the tree
            layoutEngine.computeLayout(layoutRoot)

            // Update focusable nodes in interaction manager
            interactionManager.updateFocusableNodes(layoutRoot)

            // Render layout tree to screen buffer
            const buffer = driver.getBuffer()
            bufferRenderer.render(layoutRoot, buffer)

            // Position cursor for focused interactive elements via element registry
            const focused = interactionManager.getFocusedNode()
            if (focused) {
                const behavior = getElement(focused.type)
                const cursorPos = behavior?.getCursorPos?.(focused)
                if (cursorPos) {
                    driver.setCursor(cursorPos.x, cursorPos.y)
                } else {
                    driver.clearCursor()
                }
            } else {
                driver.clearCursor()
            }

            // Schedule terminal render
            scheduleRender()
            _errorRecoveryActive = false // reset after a clean render
        } catch (error) {
            if (!_errorRecoveryActive) {
                _errorRecoveryActive = true
                // Defer so we don't mutate reactive state mid-render-cycle
                queueMicrotask(() => setVTermError(error, 'layout'))
            }
            // Never re-throw — keeps the process alive and quitKeys working
        }
    }

    // Wire up the stable indirection now that performLayout is fully initialized
    _doLayout = performLayout

    // Allow directives (e.g. _vModelText) to trigger a terminal re-render after
    // they update internal node state — they run after patchProp's notifyUpdate().
    registerRenderCallback(() => {
        if (currentLayoutRoot) performLayout(currentLayoutRoot)
    })

    // Create mount container — must be created before the layout renderer so the
    // callback can always use it as the layout root. The renderer may otherwise
    // track an intermediate node (e.g. the first flex child inserted) and miss
    // sibling elements entirely.
    const container = createLayoutNodeElement("div", allStyles)
    container.layoutProps = { ...container.layoutProps, width: "100%", height: "100%", scrollableY: true }

    // Create layout renderer with update callback
    // Always use the mount container as the layout root regardless of which node
    // the renderer's internal tracking chose — it sets rootContainer to the first
    // insert's parent which may be an inner node, not the true tree root.
    const { createApp } = createLayoutRenderer(allStyles, () => {
        currentLayoutRoot = container
        performLayout(container)
    })

    // Listen for terminal resize events and recompute layout
    const resizeHandler = () => {
        // Synchronize layout engine with driver dimensions
        // At this point:
        // - driver.width/height are updated
        // - driver.buffer is resized
        // - prevBuffer is null (forces full redraw)
        layoutEngine.updateContainerSize(driver.width, driver.height)

        // Clear any stale layout state to ensure clean reflow
        // (This prevents old cached layout from bleeding into new resize)
        if (currentLayoutRoot) {
            // Invalidate cached styles on root to force full recalculation
            currentLayoutRoot.layout = null
            performLayout(currentLayoutRoot)
        }
    }
    driver.on("resize", resizeHandler)

    vtermEvent("vterm:component:build", { mode: routes.length > 0 ? (layoutComponent ? "layout" : "router") : "entry" })

    // Create Vue app
    const app = createApp(component)
    vtermEvent("vterm:app:create")

    // Provide terminal driver and render function
    app.provide(ScreenSymbol, driver)
    app.provide(RenderSymbol, immediateRender)
    app.provide(InteractionSymbol, interactionManager)
    app.provide(BufferRendererSymbol, bufferRenderer)
    app.provide(SelectionSymbol, selectionManager)
    app.provide(HighlightSymbol, {
        getTheme: getHighlightTheme,
        setTheme: setHighlightTheme,
    })

    // Before-exit interceptor registry — handlers can return false to cancel exit
    const beforeExitHandlers = new Set<() => boolean | void | Promise<boolean | void>>()
    const beforeExitRegistry = {
        add: (fn: () => boolean | void | Promise<boolean | void>) => {
            beforeExitHandlers.add(fn)
            return () => beforeExitHandlers.delete(fn)
        },
        run: async (): Promise<boolean> => {
            for (const fn of beforeExitHandlers) {
                const result = await fn()
                if (result === false) return false
            }
            return true
        },
    }
    app.provide(BeforeExitSymbol, beforeExitRegistry)

    const doExit = async () => {
        const allowed = await beforeExitRegistry.run()
        if (!allowed) return
        vtermEvent("vterm:shutdown")
        try {
            await vtermApp.unmount()
        } catch {
            try { driver.cleanup() } catch { }
        } finally {
            process.exit(0)
        }
    }

    app.provide(ExitSymbol, doExit)

    app.provide(ReloadSymbol, async () => {
        if (options.onReload) {
            await options.onReload()
        }
    })

    // Provide store registry
    const storeRegistry = new Map<string, Store>()
    app.provide(StoreSymbol, storeRegistry)
    app.provide(StoreOptionsSymbol, options.store || {})

    // Provide layouts registry for RouterView
    app.provide('vterm-layouts', layoutsMap)

    // Inject user-supplied context values so all components can inject them by key
    if (context) {
        for (const [key, value] of Object.entries(context)) {
            app.provide(key, value)
        }
    }

    // Load platform 404 component for use as not-found fallback
    let notFoundComponent: any = undefined
    try {
        const { resolve, dirname } = await import("path")
        const { fileURLToPath } = await import("url")
        const { existsSync } = await import("fs")
        const platformPagesDir = resolve(dirname(fileURLToPath(import.meta.url)), "platform/pages")
        const notFoundPath = resolve(platformPagesDir, "404.vue")
        if (existsSync(notFoundPath)) {
            notFoundComponent = await loadSFC(notFoundPath)
        }
    } catch {
        // fallback to inline if SFC fails to load
    }

    // Install router if routes exist
    if (routes.length > 0) {
        const router = installRouter(app, routes, { notFoundComponent })
        // Force a full terminal redraw on every navigation so stale content
        // from the previous page is completely erased before the new page renders.
        const { watch } = await import("vue")
        watch((router as any).currentPath, () => {
            driver.forceFullRedraw()
        })
    }

    // Suppress Vue warnings
    app.config.warnHandler = () => { }
    app.config.performance = false

    // All tags are custom elements in the terminal renderer (not browser DOM)
    app.config.compilerOptions.isCustomElement = () => true

    // Catch any Vue error that escapes the ErrorBoundary (e.g. errors in the
    // error page itself) so the process never crashes.
    app.config.errorHandler = (err: unknown) => {
        if (vtermError.value === null) {
            setVTermError(err, 'vue')
        }
    }

    // Mount the app — root container fills the terminal so height: 100% resolves correctly.
    // scrollableY: true gives page-level overflow: auto — content taller than the screen
    // can be scrolled without the user having to mark anything explicitly.
    // Global safety net: registered BEFORE mount so errors thrown during
    // onMounted hooks are captured before the first render.
    const _uncaughtHandler = (err: unknown) => {
        if (vtermError.value === null) setVTermError(err, 'uncaughtException')
    }
    const _rejectionHandler = (reason: unknown) => {
        if (vtermError.value === null) setVTermError(reason, 'unhandledRejection')
    }
    process.on('uncaughtException', _uncaughtHandler)
    process.on('unhandledRejection', _rejectionHandler)

    vtermEvent("vterm:app:mount")
    app.mount(container)

    // Trigger initial layout and render after mount completes
    await new Promise(resolve => queueMicrotask(resolve))

    immediateRender()

    vtermEvent("vterm:boot:complete", { durationMs: Date.now() - _bootStart })

    // Serialize the current screen buffer to a string snapshot
    const snapshotFn = (opts?: SnapshotOptions): string => {
        const buffer = driver.getBuffer()
        if (!opts?.format || opts.format === 'text') {
            return buffer.getLines().join('\n')
        }

        // ANSI format: emit escape codes for color/style changes
        const lines: string[] = []
        for (let y = 0; y < buffer.height; y++) {
            let line = ''
            let prevColor: string | null = null
            let prevBg: string | null = null
            let prevBold = false
            let prevUnderline = false
            let prevItalic = false
            let prevDim = false
            let prevInverse = false
            let needsReset = false

            for (let x = 0; x < buffer.width; x++) {
                const cell = buffer.getCell(x, y)!
                const styleChanged =
                    cell.color !== prevColor ||
                    cell.background !== prevBg ||
                    cell.bold !== prevBold ||
                    cell.underline !== prevUnderline ||
                    cell.italic !== prevItalic ||
                    cell.dim !== prevDim ||
                    cell.inverse !== prevInverse

                if (styleChanged) {
                    if (needsReset) line += '\x1b[0m'
                    const codes: number[] = []
                    if (cell.bold) codes.push(1)
                    if (cell.dim) codes.push(2)
                    if (cell.italic) codes.push(3)
                    if (cell.underline) codes.push(4)
                    if (cell.inverse) codes.push(7)
                    if (cell.color) {
                        const named: Record<string, number> = {
                            black: 30, red: 31, green: 32, yellow: 33, blue: 34,
                            magenta: 35, cyan: 36, white: 37, gray: 90, grey: 90,
                            brightred: 91, brightgreen: 92, brightyellow: 93,
                            brightblue: 94, brightmagenta: 95, brightcyan: 96, brightwhite: 97,
                        }
                        const n = named[cell.color.toLowerCase()]
                        if (n !== undefined) {
                            codes.push(n)
                        } else if (cell.color.startsWith('#')) {
                            const r = parseInt(cell.color.slice(1, 3), 16)
                            const g = parseInt(cell.color.slice(3, 5), 16)
                            const b = parseInt(cell.color.slice(5, 7), 16)
                            line += `\x1b[38;2;${r};${g};${b}m`
                        }
                    }
                    if (cell.background) {
                        const namedBg: Record<string, number> = {
                            black: 40, red: 41, green: 42, yellow: 43, blue: 44,
                            magenta: 45, cyan: 46, white: 47, gray: 100, grey: 100,
                            brightred: 101, brightgreen: 102, brightyellow: 103,
                            brightblue: 104, brightmagenta: 105, brightcyan: 106, brightwhite: 107,
                        }
                        const n = namedBg[cell.background.toLowerCase()]
                        if (n !== undefined) {
                            codes.push(n)
                        } else if (cell.background.startsWith('#')) {
                            const r = parseInt(cell.background.slice(1, 3), 16)
                            const g = parseInt(cell.background.slice(3, 5), 16)
                            const b = parseInt(cell.background.slice(5, 7), 16)
                            line += `\x1b[48;2;${r};${g};${b}m`
                        }
                    }
                    if (codes.length > 0) line += `\x1b[${codes.join(';')}m`

                    needsReset = cell.bold || cell.dim || cell.italic || cell.underline ||
                        cell.inverse || cell.color !== null || cell.background !== null
                    prevColor = cell.color
                    prevBg = cell.background
                    prevBold = cell.bold
                    prevUnderline = cell.underline
                    prevItalic = cell.italic
                    prevDim = cell.dim
                    prevInverse = cell.inverse
                }
                line += cell.char
            }
            if (needsReset) line += '\x1b[0m'
            lines.push(line)
        }
        return lines.join('\n')
    }

    // Create app control object
    const vtermApp: VTermApp = {
        screen: driver as any, // Expose driver as screen for backwards compatibility
        app,
        snapshot: snapshotFn,
        async unmount() {
            // Restore console methods
            uninstallConsoleCapture()

            // Remove global error handlers
            process.off('uncaughtException', _uncaughtHandler)
            process.off('unhandledRejection', _rejectionHandler)

            // Remove resize listener
            driver.off("resize", resizeHandler)

            // Close stores
            for (const store of storeRegistry.values()) {
                await store.close()
            }

            // Unmount Vue app
            app.unmount()

            // Cleanup terminal driver
            driver.cleanup()
            driver.destroy()
        },
        render() {
            immediateRender()
        },
    }

    // Register quit key handlers — in raw mode Ctrl+C is a keypress, not SIGINT,
    // so we must register it explicitly here or it silently does nothing.
    driver.key(quitKeys, doExit)

    // Call onMounted callback
    if (onMounted) {
        onMounted(vtermApp)
    }

    return vtermApp
}
