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
import { createLayoutRenderer, createLayoutNodeElement } from "../runtime/renderer/layout-renderer"
import { createLayoutEngine } from "./layout/tree"
import { loadSFC, getAllStyles, registerRenderCallback } from "./compiler/sfc-loader"
import { ScreenSymbol, RenderSymbol, InteractionSymbol } from "./platform/composables/exports"
import { StoreSymbol, StoreOptionsSymbol, type Store } from "./platform/store/store"
import { installRouter, loadDefaultRoutes } from "./router"
import { getElement } from "../runtime/elements/index"
import { setHighlightCallback, configureHighlighter } from "../runtime/elements/highlighter"
import type { VTermOptions, VTermApp } from "../types/types"
import type { ParsedStyles } from "./css/types"
import type { LayoutNode } from "./layout/types"

/**
 * Create a terminal app using custom terminal rendering
 */
export async function vterm(options: VTermOptions): Promise<VTermApp> {
    const { entry, layout, onMounted, quitKeys = ['C-c'], highlight, selection } = options

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

    // Initialize interaction manager
    const interactionManager = new InteractionManager(() => {
        // Trigger re-render when interactive state changes (hover, focus, active)
        // Use performLayout (not just performRender) so cursor position is updated on focus changes
        if (currentLayoutRoot) {
            performLayout(currentLayoutRoot)
        }
    })

    // Initialize selection manager
    const selectionManager = new SelectionManager(() => {
        if (currentLayoutRoot) {
            performLayout(currentLayoutRoot)
        }
    }, selection)

    // Listen to mouse events — forward to both managers independently
    inputParser.on("mouse", mouseEvent => {
        interactionManager.handleMouseEvent(mouseEvent, currentLayoutRoot)
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

        behavior.handleKey(focused, key, () => {
            if (currentLayoutRoot) performLayout(currentLayoutRoot)
        })
    })

    // Initialize buffer renderer
    const bufferRenderer = new BufferRenderer(interactionManager, selectionManager)

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
        delete require.cache[routesPath]
        const routesModule = await import(routesPath + "?t=" + Date.now())
        if (routesModule.routes && routesModule.routes.length > 0) {
            routes = await Promise.all(
                routesModule.routes.map(async (route: any) => {
                    if (route.componentPath) {
                        const component = await loadSFC(route.componentPath)
                        return { ...route, component }
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

    // Get all styles from the global styles registry (populated by loadSFC)
    const globalStylesMap = getAllStyles()
    const allStyles: ParsedStyles = Object.fromEntries(globalStylesMap.entries())

    // Initialize layout engine with terminal dimensions
    const layoutEngine = createLayoutEngine(driver.width, driver.height)

    // Track the current layout root for reflow on resize
    let currentLayoutRoot: LayoutNode | null = null

    // Function to perform layout computation and rendering
    const performLayout = (layoutRoot: LayoutNode) => {
        try {
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
        } catch (error) {
            console.error("Render error:", error)
            throw error
        }
    }

    // Allow directives (e.g. _vModelText) to trigger a terminal re-render after
    // they update internal node state — they run after patchProp's notifyUpdate().
    registerRenderCallback(() => {
        if (currentLayoutRoot) performLayout(currentLayoutRoot)
    })

    // Create layout renderer with update callback
    // The layoutRoot parameter is Vue's tracked root container - this is what gets populated
    // when Vue mounts and renders components into it
    const { createApp } = createLayoutRenderer(allStyles, (layoutRoot: LayoutNode | null) => {
        if (!layoutRoot) return

        // Store the layout root for resize handling
        currentLayoutRoot = layoutRoot

        performLayout(layoutRoot)
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

    // Install router if routes exist
    if (routes.length > 0) {
        installRouter(app, routes)
    }

    // Suppress Vue warnings
    app.config.warnHandler = () => { }
    app.config.performance = false

    // All tags are custom elements in the terminal renderer (not browser DOM)
    app.config.compilerOptions.isCustomElement = () => true

    // Mount the app — root container fills the terminal so height: 100% resolves correctly.
    // scrollableY: true gives page-level overflow: auto — content taller than the screen
    // can be scrolled without the user having to mark anything explicitly.
    const container = createLayoutNodeElement("div", allStyles)
    container.layoutProps = { ...container.layoutProps, width: "100%", height: "100%", scrollableY: true }
    app.mount(container)

    // Trigger initial layout and render after mount completes
    await new Promise(resolve => queueMicrotask(resolve))

    immediateRender()

    // Create app control object
    const vtermApp: VTermApp = {
        screen: driver as any, // Expose driver as screen for backwards compatibility
        app,
        async unmount() {
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
        await vtermApp.unmount()
        process.exit(0)
    })

    // Call onMounted callback
    if (onMounted) {
        onMounted(vtermApp)
    }

    return vtermApp
}
