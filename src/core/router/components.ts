import { defineComponent, h, inject } from "vue"
import type { Route, Router } from "./types"
import { matchRoute } from "./matcher"

/**
 * RouterLink - renders an <a> tag with active route classes.
 *
 * Usage: <RouterLink to="/settings">Settings</RouterLink>
 *
 * Active classes (style with CSS):
 *   .router-link-active       — link is a prefix match of current route
 *   .router-link-exact-active — link exactly matches current route
 *
 * Navigation is handled automatically by the <a> element behavior (keyboard
 * enter and mouse click both work without adding @press handlers).
 */
export const RouterLink = defineComponent({
    name: "RouterLink",
    props: {
        to: { type: String, required: true },
    },
    setup(props, { slots }) {
        const router = inject(Symbol.for("vterm-router")) as Router | undefined

        return () => {
            const currentPath = (router as any)?.currentPath?.value ?? "/"
            const to = props.to

            const isExactActive = currentPath === to
            const isActive =
                isExactActive ||
                (to.length > 1 && currentPath.startsWith(to + "/"))

            const classes: string[] = []
            if (isActive) classes.push("router-link-active")
            if (isExactActive) classes.push("router-link-exact-active")

            return h(
                "a",
                { href: to, class: classes.join(" ") || undefined },
                slots.default?.()
            )
        }
    },
})

export const RouterView = defineComponent({
    name: "RouterView",
    setup() {
        const router = inject(Symbol.for("vterm-router"))
        if (!router) {
            throw new Error("RouterView must be used within a router context")
        }

        const routes = (inject("vterm-routes") as Route[]) || []
        const layouts = inject("vterm-layouts") as Map<string, any> | undefined
        const NotFoundComponent = inject("vterm-error-not-found") as any
        const ServerErrorComponent = inject("vterm-error-server") as any

        return () => {
            const currentPath = (router as any).currentPath.value
            const route = (router as any).currentRoute.value

            const matchedRoute = routes.find(r => {
                const { match } = matchRoute(r.path, currentPath)
                return match
            })

            if (!matchedRoute || !matchedRoute.component) {
                if (!matchedRoute) {
                    console.warn("[RouterView] No route matched:", currentPath)
                } else {
                    console.warn("[RouterView] No component for route:", matchedRoute.path)
                }
                return NotFoundComponent
                    ? h(NotFoundComponent)
                    : h("div", { width: "100%", height: "100%" }, [
                        h("p", `404: Route not found - ${currentPath}`),
                        h("a", { href: "/" }, "Go to home"),
                    ])
            }

            try {
                const pageVNode = h(matchedRoute.component, { ...route.params, route })

                // Determine which layout to use:
                // - route.meta.layout = 'name'  → use named layout
                // - route.meta.layout = false   → no layout (render page directly)
                // - no meta.layout              → use 'default' layout if it exists
                const meta = matchedRoute.meta || {}
                const layoutName = meta.layout !== undefined ? meta.layout : 'default'

                if (layoutName !== false && layouts?.has(String(layoutName))) {
                    const layoutComponent = layouts.get(String(layoutName))
                    return h(layoutComponent, {}, { default: () => pageVNode })
                }

                return pageVNode
            } catch (error) {
                console.error("[RouterView] Error rendering component:", error)
                if (ServerErrorComponent) {
                    return h(ServerErrorComponent)
                }
                return h("div", { width: "100%", height: "100%" }, [
                    h("p", "500: Internal Server Error"),
                    h("p", String(error)),
                ])
            }
        }
    },
})
