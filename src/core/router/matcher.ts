/**
 * Match a route pattern against a path
 */
export function matchRoute(
    pattern: string,
    path: string
): { match: boolean; params: Record<string, string> } {
    const [pathWithoutQuery] = path.split("?")

    if (!pathWithoutQuery) return { match: false, params: {} }

    const patternParts = pattern.split("/").filter(Boolean)
    const pathParts = pathWithoutQuery.split("/").filter(Boolean)

    if (patternParts.length !== pathParts.length) {
        return { match: false, params: {} }
    }

    const params: Record<string, string> = {}

    for (let i = 0; i < patternParts.length; i++) {
        const patternPart = patternParts[i]
        const pathPart = pathParts[i]

        if (patternPart && pathPart) {
            if (patternPart.startsWith(":")) {
                const paramName = patternPart.slice(1)
                params[paramName] = pathPart
            } else if (patternPart !== pathPart) {
                return { match: false, params: {} }
            }
        } else if (patternPart !== pathPart) {
            return { match: false, params: {} }
        }
    }

    return { match: true, params }
}

/**
 * Parse query string from path
 */
export function parseQuery(path: string): Record<string, string> {
    const [, queryString] = path.split("?")
    if (!queryString) return {}

    const query: Record<string, string> = {}
    const pairs = queryString.split("&")

    for (const pair of pairs) {
        const [key, value] = pair.split("=")
        if (key) {
            query[decodeURIComponent(key)] = decodeURIComponent(value || "")
        }
    }

    return query
}
