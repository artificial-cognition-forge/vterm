import { ref, computed } from "vue"
import type { Route, Router, RouteMatch } from "./types"
import { matchRoute, parseQuery } from "./matcher"

/**
 * Global router reference — set when installRouter() is called.
 * Allows element behaviors (anchor.ts) to navigate outside Vue's inject context.
 */
let _globalRouter: Router | null = null

export function getGlobalRouter(): Router | null {
    return _globalRouter
}

export function createRouter(routes: Route[]) {
    const currentPath = ref("/")
    const history: string[] = ["/"]

    const currentRoute = computed<RouteMatch>(() => {
        const path = currentPath.value
        const query = parseQuery(path)

        for (const route of routes) {
            const { match, params } = matchRoute(route.path, path)
            if (match) {
                return { path, params, query }
            }
        }

        return { path, params: {}, query }
    })

    const navigate = (path: string) => {
        currentPath.value = path
        history.push(path)
    }

    const push = navigate

    const replace = (path: string) => {
        currentPath.value = path
        history[history.length - 1] = path
    }

    const back = () => {
        if (history.length > 1) {
            history.pop()
            currentPath.value = history[history.length - 1]
        }
    }

    const router: Router = {
        currentPath,
        currentRoute,
        navigate,
        push,
        replace,
        back,
    }

    return {
        router,
        routes,
    }
}

export function installRouter(
    app: any,
    routes: Route[],
    options?: {
        notFoundComponent?: any
        serverErrorComponent?: any
    }
) {
    const { router } = createRouter(routes)

    _globalRouter = router

    app.provide(Symbol.for("vterm-router"), router)
    app.provide("vterm-routes", routes)

    if (options?.notFoundComponent) {
        app.provide("vterm-error-not-found", options.notFoundComponent)
    }
    if (options?.serverErrorComponent) {
        app.provide("vterm-error-server", options.serverErrorComponent)
    }

    return router
}

/**
 * Load default platform routes from src/core/platform/pages
 */
export function loadDefaultRoutes(): Route[] {
    try {
        const { resolve, dirname } = require("path")
        const { existsSync } = require("fs")
        const { fileURLToPath } = require("url")

        // Get the directory of this file
        const currentDir = dirname(fileURLToPath(import.meta.url))

        // Platform pages directory
        const platformPagesDir = resolve(currentDir, "../../platform/pages")

        const routes: Route[] = []

        // Check for index.vue (root route)
        const indexPath = resolve(platformPagesDir, "index.vue")
        if (existsSync(indexPath)) {
            routes.push({
                path: "/",
                component: indexPath, // Use file path, will be loaded by SFC loader
                name: "home",
            })
        }

        // Check for 404.vue (not found route)
        const notFoundPath = resolve(platformPagesDir, "404.vue")
        if (existsSync(notFoundPath)) {
            routes.push({
                path: "/:pathMatch(.*)*",
                component: notFoundPath,
                name: "not-found",
            })
        }

        return routes
    } catch (error) {
        console.error("Failed to load default routes:", error)
        return []
    }
}

export function loadFileBasedRoutes(): Route[] {
    try {
        const routesPath = `${process.cwd()}/.vterm/routes.ts`

        const routesModule = Bun.file(routesPath)
            .text()
            .then(async code => {
                console.warn("loadFileBasedRoutes: async loading not yet implemented")
                return []
            })

        return []
    } catch (error) {
        console.error("Failed to load file-based routes:", error)
        return []
    }
}

export function useFileBasedRoutes(): Route[] {
    return loadFileBasedRoutes()
}
