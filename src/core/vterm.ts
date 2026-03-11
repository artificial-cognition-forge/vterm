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
import { ScreenSymbol, RenderSymbol, InteractionSymbol } from "./platform/composables/exports"
import { StoreSymbol, StoreOptionsSymbol, type Store } from "./platform/store/store"
import { installRouter, loadDefaultRoutes, getGlobalRouter } from "./router"
import { getElement } from "../runtime/elements/index"
import { setHighlightCallback, configureHighlighter } from "../runtime/elements/highlighter"
import { setVTermError, vtermError } from "./platform/error-state"
import type { VTermOptions, VTermApp } from "../types/types"
import type { ParsedStyles } from "./css/types"
import type { LayoutNode } from "./layout/types"

/**
 * Create a terminal app using custom terminal rendering
 */
export async function vterm(options: VTermOptions): Promise<VTermApp> {
    const { entry, layout, onMounted, quitKeys = ['C-c'], highlight, selection, ui } = options

    // Configure syntax highlighter before any components load
    if (highlight) configureHighlighter(highlight)

    // Initialize input parser for keyboard events
    const inputParser = new InputParser()

    const driver = new TerminalDriver({
        inputParser,
        alternateScreen: true,
        hideCursor: true,
    })

    // Initialize driver (raw mode, alternate screen, etc.)
    driver.initialize()

    // Initialize interaction manager with both state change and render callbacks
    const interactionManager = new InteractionManager(
        () => {
            // Trigger re-render when interactive state changes (hover, focus, active)
            // Use performLayout (not just performRender) so cursor position is updated on focus changes
            if (currentLayoutRoot) {
                performLayout(currentLayoutRoot)
            }
        },
        () => {
            // Trigger render when element behavior changes state
            if (currentLayoutRoot) {
                performLayout(currentLayoutRoot)
            }
        }
    )

    // Initialize selection manager
    const selectionManager = new SelectionManager(() => {
        if (currentLayoutRoot) {
            performLayout(currentLayoutRoot)
        }
    }, selection)

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

        selectionManager.handleMouseEvent(mouseEvent)

        // Auto-copy to clipboard when a drag selection is finalized
        if (mouseEvent.type === 'mouseup' && selectionManager.hasSelection()) {
            const buffer = driver.getBuffer()
            selectionManager.copyToClipboard(buffer)
        }

        // Trigger re-render for wheel scroll and selection changes
        if (mouseEvent.type === 'wheelup' || mouseEvent.type === 'wheeldown' || selectionManager.hasSelection()) {
            scheduleRender()
        }
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
            behavior.handleKey(focused, key, () => {
                if (currentLayoutRoot) performLayout(currentLayoutRoot)
            })
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

    // Immediate render function (bypasses throttling)
    const immediateRender = () => {
        driver.render()
    }

    // Allow the async syntax highlighter to trigger re-renders when tokens are ready
    setHighlightCallback(() => {
        if (currentLayoutRoot) performLayout(currentLayoutRoot)
    })

    // Load layout component if needed
    let layoutComponent: any = null
    if (layout !== false) {
        try {
            const { resolve } = await import("path")
            const { existsSync } = await import("fs")

            let layoutPath: string | null = null
            if (typeof layout === "string") {
                layoutPath = resolve(process.cwd(), layout)
            } else {
                layoutPath = resolve(process.cwd(), "app/app.vue")
            }

            if (layoutPath && existsSync(layoutPath)) {
                layoutComponent = await loadSFC(layoutPath)
            }
        } catch (error) {
            // No layout - continue
        }
    }

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

    // Initialize layout engine with terminal dimensions
    const layoutEngine = createLayoutEngine(driver.width, driver.height)

    // Track the current layout root for reflow on resize
    let currentLayoutRoot: LayoutNode | null = null

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
        // Update layout engine with new terminal dimensions
        layoutEngine.updateContainerSize(driver.width, driver.height)

        // Recompute layout with current root if it exists
        if (currentLayoutRoot) {
            performLayout(currentLayoutRoot)
        }
    }
    driver.on("resize", resizeHandler)

    // Create Vue app
    const app = createApp(component)

    // Provide terminal driver and render function
    app.provide(ScreenSymbol, driver)
    app.provide(RenderSymbol, immediateRender)
    app.provide(InteractionSymbol, interactionManager)

    // Provide store registry
    const storeRegistry = new Map<string, Store>()
    app.provide(StoreSymbol, storeRegistry)
    app.provide(StoreOptionsSymbol, options.store || {})

    // Provide layouts registry for RouterView
    app.provide('vterm-layouts', layoutsMap)

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
    app.mount(container)

    // Trigger initial layout and render after mount completes
    await new Promise(resolve => queueMicrotask(resolve))

    immediateRender()

    // Global safety net: catch uncaught exceptions / unhandled rejections so the
    // terminal never hangs and quit keys keep working.
    const _uncaughtHandler = (err: unknown) => {
        if (vtermError.value === null) setVTermError(err, 'uncaughtException')
    }
    const _rejectionHandler = (reason: unknown) => {
        if (vtermError.value === null) setVTermError(reason, 'unhandledRejection')
    }
    process.on('uncaughtException', _uncaughtHandler)
    process.on('unhandledRejection', _rejectionHandler)

    // Create app control object
    const vtermApp: VTermApp = {
        screen: driver as any, // Expose driver as screen for backwards compatibility
        app,
        async unmount() {
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
    driver.key(quitKeys, async () => {
        try {
            await vtermApp.unmount()
        } catch {
            // Ensure terminal is always restored even if unmount fails
            try { driver.cleanup() } catch { }
        } finally {
            process.exit(0)
        }
    })

    // Call onMounted callback
    if (onMounted) {
        onMounted(vtermApp)
    }

    return vtermApp
}
