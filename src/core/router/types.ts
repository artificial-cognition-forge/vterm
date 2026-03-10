import type { Component } from "vue"

export interface Route {
    path: string
    component?: Component
    componentPath?: string
    name?: string
    meta?: {
        layout?: string | false
        [key: string]: any
    }
}

export interface RouteMatch {
    path: string
    params: Record<string, string>
    query: Record<string, string>
}

export interface Router {
    currentPath: Readonly<{ value: string }>
    currentRoute: Readonly<{ value: RouteMatch }>
    navigate: (path: string) => void
    push: (path: string) => void
    replace: (path: string) => void
    back: () => void
    forward: () => void
}
