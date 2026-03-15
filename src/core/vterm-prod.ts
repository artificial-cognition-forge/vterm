/**
 * Production vterm() entry point — zero compiler dependencies.
 *
 * This is used by bundled apps (vterm build output). All Vue SFCs have been
 * AOT-compiled to plain JS before this runs, so we never need sfc-loader,
 * @vue/compiler-sfc, sucrase, unimport, or glob at runtime.
 *
 * Everything else (layout engine, renderer, terminal driver, router, CSS
 * pipeline) is identical to the dev-mode path.
 */

import { TerminalDriver } from "../runtime/terminal/driver"
import { InputParser, type KeyEvent } from "../runtime/terminal/input"
import { BufferRenderer } from "../runtime/renderer/buffer-renderer"
import { InteractionManager } from "../runtime/renderer/interaction"
import { SelectionManager } from "../runtime/renderer/selection"
import { createLayoutRenderer, createLayoutNodeElement, applyCompoundStyles } from "../runtime/renderer/layout-renderer"
import { createLayoutEngine } from "./layout/tree"
import { ScreenSymbol, RenderSymbol, InteractionSymbol, BufferRendererSymbol, SelectionSymbol, HighlightSymbol, ExitSymbol, ReloadSymbol, BeforeExitSymbol } from "./platform/composables/exports"
import { StoreSymbol, StoreOptionsSymbol, type Store } from "./platform/store/store"
import { installRouter, getGlobalRouter, RouterView } from "./router"
import { getElement } from "../runtime/elements/index"
import { setHighlightCallback, configureHighlighter, setHighlightTheme, getHighlightTheme } from "../runtime/elements/highlighter"
import { setVTermError, vtermError } from "./platform/error-state"
import { installConsoleCapture, uninstallConsoleCapture } from "./platform/composables/useConsole"
import { vtermEvent } from "../build/events"
import { defineComponent, h, watch, onErrorCaptured } from "vue"
import { setDirectiveRenderCallback } from "./compiler/directives"
import type { VTermOptions, VTermApp, SnapshotOptions } from "../types/types"
import type { ParsedStyles } from "./css/types"
import type { LayoutNode } from "./layout/types"

/**
 * Production variant of vterm().
 *
 * Differences from dev vterm():
 * - Never calls loadSFC() — components are already compiled JS objects
 * - Never imports glob, @vue/compiler-sfc, sucrase, or unimport
 * - CSS styles are collected from __styles exported by each compiled SFC module
 *   and registered before the app boots
 * - Routes must have .component already set (set by bootstrap.ts)
 * - Layout and entry must be passed as component objects (not file paths)
 */
export async function vtermProd(options: VTermOptions): Promise<VTermApp> {
    const _bootStart = Date.now()
    const { entry, layout, onMounted, quitKeys = ['C-c'], highlight, selection, ui, context } = options

    vtermEvent("vterm:boot", { cwd: process.cwd() })

    installConsoleCapture()
    vtermEvent("vterm:console:capture")

    if (highlight) configureHighlighter(highlight)
    vtermEvent("vterm:highlight:config", { theme: highlight?.theme })

    const inputParser = new InputParser()
    const driver = new TerminalDriver({
        inputParser,
        alternateScreen: true,
        hideCursor: true,
        cursor: ui?.cursor,
    })
    driver.initialize()
    vtermEvent("vterm:driver:init", { width: driver.width, height: driver.height })

    let currentLayoutRoot: LayoutNode | null = null
    let _doLayout: ((root: LayoutNode) => void) | null = null
    const triggerLayout = () => { if (currentLayoutRoot && _doLayout) _doLayout(currentLayoutRoot) }

    const interactionManager = new InteractionManager(triggerLayout, triggerLayout)
    const selectionManager = new SelectionManager(triggerLayout, selection)

    inputParser.on("mouse", mouseEvent => {
        if (mouseEvent.type === "mousedown") {
            if (mouseEvent.button === "back") { getGlobalRouter()?.back(); return }
            if (mouseEvent.button === "forward") { getGlobalRouter()?.forward(); return }
        }
        try {
            if (currentLayoutRoot) interactionManager.handleMouseEvent(mouseEvent, currentLayoutRoot)
        } catch (err) {
            if (vtermError.value === null) setVTermError(err, 'event')
        }
        const activeIsEditor = interactionManager.getActiveNode()?.type === 'editor'
        if (!activeIsEditor) {
            selectionManager.handleMouseEvent(mouseEvent)
        } else {
            selectionManager.clearSelection()
        }
        if (mouseEvent.type === 'mouseup' && selectionManager.hasSelection()) {
            selectionManager.copyToClipboard(driver.getBuffer())
        }
        scheduleRender()
    })

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

    const bufferRenderer = new BufferRenderer(interactionManager, selectionManager, ui)

    let renderScheduled = false
    const performRender = () => { renderScheduled = false; driver.render() }
    const scheduleRender = () => {
        if (renderScheduled) return
        renderScheduled = true
        queueMicrotask(performRender)
    }
    const immediateRender = () => {
        if (currentLayoutRoot) performLayout(currentLayoutRoot)
        else driver.render()
    }

    setHighlightCallback(triggerLayout)

    // Wire v-model directive re-render callback
    setDirectiveRenderCallback(immediateRender)

    // ── Component resolution ─────────────────────────────────────────────────
    // In production mode all components arrive as plain JS objects — no loadSFC.

    // Register all styles passed from compiled SFC modules.
    // The bootstrap collects __styles from every imported module and passes them
    // here as options.styles — one entry per compiled SFC module.
    const allStyles: ParsedStyles = {}
    if (options.styles?.length) {
        const { extractSFCStyles } = await import("./css")
        for (const styleBlocks of options.styles) {
            if (!styleBlocks?.length) continue
            const parsed = await extractSFCStyles(styleBlocks as any)
            for (const [selector, style] of Object.entries(parsed)) {
                allStyles[selector] = style as any
            }
        }
    }

    const layoutComponent: any = (typeof layout === 'object' && layout !== null)
        ? layout
        : null

    // Routes come in with .component already set by bootstrap.ts
    const routes: any[] = options.routes ?? []

    // Per-page layouts come in via options.layouts (Map<name, component>)
    const layoutsMap: Map<string, any> = options.layouts instanceof Map
        ? options.layouts
        : new Map()

    vtermEvent("vterm:routes:load", {
        count: routes.length,
        paths: routes.map((r: any) => r.path ?? r.name ?? "?"),
    })

    // Build-in error page — shows the actual error message
    const errorPageComponent = (options as any).errorPage ?? defineComponent({
        name: 'VTermError',
        setup() {
            return () => h("div", { style: { color: "red", padding: "1", display: "flex", flexDirection: "column" } }, [
                h("p", { style: { color: "brightred" } }, "Runtime Error"),
                h("p", { style: { color: "white" } }, String(vtermError.value?.message ?? vtermError.value ?? "Unknown error")),
                h("p", { style: { color: "yellow" } }, String(vtermError.value?.stack?.split("\n")[1] ?? "")),
            ])
        },
    })

    // Determine root component
    let component: any
    if (routes.length > 0) {
        component = layoutComponent ?? defineComponent({
            name: "AppRoot",
            setup() { return () => h(RouterView) },
        })
    } else {
        if (!entry) throw new Error("No entry component or routes provided to vterm()")
        component = typeof entry === 'string'
            ? (() => { throw new Error(`vterm build error: entry must be a component object in production, got string "${entry}"`) })()
            : entry
    }

    // Wrap in error boundary
    const _originalComponent = component
    component = defineComponent({
        name: 'VTermRoot',
        setup() {
            onErrorCaptured((err: unknown) => { setVTermError(err, 'component'); return false })
            return () => vtermError.value !== null ? h(errorPageComponent) : h(_originalComponent)
        },
    })

    // ── Layout engine ────────────────────────────────────────────────────────
    const layoutEngine = createLayoutEngine(driver.width, driver.height, allStyles)

    let _errorRecoveryActive = false
    const performLayout = (layoutRoot: LayoutNode) => {
        try {
            applyCompoundStyles(layoutRoot, allStyles)
            layoutEngine.computeLayout(layoutRoot)
            interactionManager.updateFocusableNodes(layoutRoot)
            const buffer = driver.getBuffer()
            bufferRenderer.render(layoutRoot, buffer)
            const focused = interactionManager.getFocusedNode()
            if (focused) {
                const behavior = getElement(focused.type)
                const cursorPos = behavior?.getCursorPos?.(focused)
                if (cursorPos) driver.setCursor(cursorPos.x, cursorPos.y)
                else driver.clearCursor()
            } else {
                driver.clearCursor()
            }
            scheduleRender()
            _errorRecoveryActive = false
        } catch (error) {
            if (!_errorRecoveryActive) {
                _errorRecoveryActive = true
                queueMicrotask(() => setVTermError(error, 'layout'))
            }
        }
    }

    _doLayout = performLayout

    const container = createLayoutNodeElement("div", allStyles)
    container.layoutProps = { ...container.layoutProps, width: "100%", height: "100%", scrollableY: true }

    const { createApp } = createLayoutRenderer(allStyles, () => {
        currentLayoutRoot = container
        performLayout(container)
    })

    const resizeHandler = () => {
        layoutEngine.updateContainerSize(driver.width, driver.height)
        if (currentLayoutRoot) {
            currentLayoutRoot.layout = null
            performLayout(currentLayoutRoot)
        }
    }
    driver.on("resize", resizeHandler)

    vtermEvent("vterm:component:build", { mode: routes.length > 0 ? (layoutComponent ? "layout" : "router") : "entry" })

    const app = createApp(component)
    vtermEvent("vterm:app:create")

    app.provide(ScreenSymbol, driver)
    app.provide(RenderSymbol, immediateRender)
    app.provide(InteractionSymbol, interactionManager)
    app.provide(BufferRendererSymbol, bufferRenderer)
    app.provide(SelectionSymbol, selectionManager)
    app.provide(HighlightSymbol, { getTheme: getHighlightTheme, setTheme: setHighlightTheme })

    const beforeExitHandlers = new Set<() => boolean | void | Promise<boolean | void>>()
    const beforeExitRegistry = {
        add: (fn: () => boolean | void | Promise<boolean | void>) => {
            beforeExitHandlers.add(fn); return () => beforeExitHandlers.delete(fn)
        },
        run: async (): Promise<boolean> => {
            for (const fn of beforeExitHandlers) { if (await fn() === false) return false }
            return true
        },
    }
    app.provide(BeforeExitSymbol, beforeExitRegistry)

    const doExit = async () => {
        if (!await beforeExitRegistry.run()) return
        vtermEvent("vterm:shutdown")
        try { await vtermApp.unmount() }
        catch { try { driver.cleanup() } catch { } }
        finally { process.exit(0) }
    }
    app.provide(ExitSymbol, doExit)
    app.provide(ReloadSymbol, async () => { if (options.onReload) await options.onReload() })

    const storeRegistry = new Map<string, Store>()
    app.provide(StoreSymbol, storeRegistry)
    app.provide(StoreOptionsSymbol, options.store || {})
    app.provide('vterm-layouts', layoutsMap)

    if (context) {
        for (const [key, value] of Object.entries(context)) app.provide(key, value)
    }

    if (routes.length > 0) {
        const router = installRouter(app, routes, { notFoundComponent: (options as any).notFoundComponent })
        watch((router as any).currentPath, () => driver.forceFullRedraw())
    }

    app.config.warnHandler = () => {}
    app.config.performance = false
    app.config.compilerOptions.isCustomElement = () => true
    app.config.errorHandler = (err: unknown, instance: any, info: string) => {
        process.stderr.write("VUE ERROR [" + info + "]: " + String((err as any)?.stack ?? err) + "\n")
        if (vtermError.value === null) setVTermError(err, 'vue')
    }

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

    await new Promise(resolve => queueMicrotask(resolve))
    immediateRender()
    vtermEvent("vterm:boot:complete", { durationMs: Date.now() - _bootStart })

    // ── Snapshot ─────────────────────────────────────────────────────────────
    const snapshotFn = (opts?: SnapshotOptions): string => {
        const buffer = driver.getBuffer()
        if (!opts?.format || opts.format === 'text') return buffer.getLines().join('\n')
        const lines: string[] = []
        for (let y = 0; y < buffer.height; y++) {
            let line = ''
            let prevColor: string | null = null, prevBg: string | null = null
            let prevBold = false, prevUnderline = false, prevItalic = false
            let prevDim = false, prevInverse = false, needsReset = false
            for (let x = 0; x < buffer.width; x++) {
                const cell = buffer.getCell(x, y)!
                const styleChanged = cell.color !== prevColor || cell.background !== prevBg ||
                    cell.bold !== prevBold || cell.underline !== prevUnderline ||
                    cell.italic !== prevItalic || cell.dim !== prevDim || cell.inverse !== prevInverse
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
                            black: 30, red: 31, green: 32, yellow: 33, blue: 34, magenta: 35,
                            cyan: 36, white: 37, gray: 90, grey: 90, brightred: 91, brightgreen: 92,
                            brightyellow: 93, brightblue: 94, brightmagenta: 95, brightcyan: 96, brightwhite: 97,
                        }
                        const n = named[cell.color.toLowerCase()]
                        if (n !== undefined) codes.push(n)
                        else if (cell.color.startsWith('#')) {
                            const r = parseInt(cell.color.slice(1, 3), 16)
                            const g = parseInt(cell.color.slice(3, 5), 16)
                            const b = parseInt(cell.color.slice(5, 7), 16)
                            line += `\x1b[38;2;${r};${g};${b}m`
                        }
                    }
                    if (cell.background) {
                        const namedBg: Record<string, number> = {
                            black: 40, red: 41, green: 42, yellow: 43, blue: 44, magenta: 45,
                            cyan: 46, white: 47, gray: 100, grey: 100, brightred: 101, brightgreen: 102,
                            brightyellow: 103, brightblue: 104, brightmagenta: 105, brightcyan: 106, brightwhite: 107,
                        }
                        const n = namedBg[cell.background.toLowerCase()]
                        if (n !== undefined) codes.push(n)
                        else if (cell.background.startsWith('#')) {
                            const r = parseInt(cell.background.slice(1, 3), 16)
                            const g = parseInt(cell.background.slice(3, 5), 16)
                            const b = parseInt(cell.background.slice(5, 7), 16)
                            line += `\x1b[48;2;${r};${g};${b}m`
                        }
                    }
                    if (codes.length > 0) line += `\x1b[${codes.join(';')}m`
                    needsReset = cell.bold || cell.dim || cell.italic || cell.underline ||
                        cell.inverse || cell.color !== null || cell.background !== null
                    prevColor = cell.color; prevBg = cell.background
                    prevBold = cell.bold; prevUnderline = cell.underline
                    prevItalic = cell.italic; prevDim = cell.dim; prevInverse = cell.inverse
                }
                line += cell.char
            }
            if (needsReset) line += '\x1b[0m'
            lines.push(line)
        }
        return lines.join('\n')
    }

    const vtermApp: VTermApp = {
        screen: driver as any,
        app,
        snapshot: snapshotFn,
        async unmount() {
            uninstallConsoleCapture()
            process.off('uncaughtException', _uncaughtHandler)
            process.off('unhandledRejection', _rejectionHandler)
            driver.off("resize", resizeHandler)
            for (const store of storeRegistry.values()) await store.close()
            app.unmount()
            driver.cleanup()
            driver.destroy()
        },
        render() { immediateRender() },
    }

    driver.key(quitKeys, doExit)
    if (onMounted) onMounted(vtermApp)
    return vtermApp
}
