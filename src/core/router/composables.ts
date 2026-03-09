import { inject } from "vue"
import type { Router } from "./types"

export function useRouter(): Router {
    const router = inject(Symbol.for("vterm-router"))
    if (!router) {
        throw new Error("useRouter must be called within a router context")
    }
    return router as Router
}

export function useRoute() {
    const router = useRouter()
    return router.currentRoute
}
