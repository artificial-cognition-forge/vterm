import { resolve } from "path"
import { glob } from "glob"

/**
 * File-based routing scanner
 * Scans app/pages directory and generates route configuration
 */

export interface RouteEntry {
  path: string
  filePath: string
  name: string
  meta?: Record<string, any>
}

/**
 * Extract metadata from definePageMeta() calls in a page file
 * Handles: definePageMeta({ layout: 'name' }) and definePageMeta({ layout: false })
 */
async function extractPageMeta(filePath: string): Promise<Record<string, any> | undefined> {
  try {
    const source = await Bun.file(filePath).text()
    const match = source.match(/definePageMeta\s*\(\s*\{([\s\S]*?)\}\s*\)/)
    if (!match || !match[1]) return undefined
    const body = match[1]
    const meta: Record<string, any> = {}
    const layoutMatch = body.match(/layout\s*:\s*(?:'([^']*)'|"([^"]*)"|(false))/)
    if (layoutMatch) {
      meta.layout = layoutMatch[3] === 'false' ? false : (layoutMatch[1] ?? layoutMatch[2])
    }
    return Object.keys(meta).length > 0 ? meta : undefined
  } catch {
    return undefined
  }
}

/**
 * Convert file path to route path
 * Examples:
 * - index.vue → /
 * - about.vue → /about
 * - users/index.vue → /users
 * - users/[id].vue → /users/:id
 * - blog/[slug]/comments.vue → /blog/:slug/comments
 */
function filePathToRoutePath(relativeFilePath: string): string {
  // Remove .vue extension
  let path = relativeFilePath.replace(/\.vue$/, '')

  // Handle index files
  if (path === 'index') {
    return '/'
  }
  if (path.endsWith('/index')) {
    path = path.replace(/\/index$/, '')
  }

  // Convert [param] to :param for dynamic segments
  path = path.replace(/\[([^\]]+)\]/g, ':$1')

  // Ensure leading slash
  if (!path.startsWith('/')) {
    path = '/' + path
  }

  // Handle root index case
  if (path === '/') {
    return '/'
  }

  return path
}

/**
 * Generate route name from file path
 * Examples:
 * - index.vue → home
 * - about.vue → about
 * - users/index.vue → users
 * - users/[id].vue → users-id
 */
function filePathToRouteName(relativeFilePath: string): string {
  let name = relativeFilePath
    .replace(/\.vue$/, '')
    .replace(/\/index$/, '')
    .replace(/\[([^\]]+)\]/g, '$1')
    .replace(/\//g, '-')

  // Special case for root index
  if (name === 'index' || name === '') {
    return 'home'
  }

  return name
}

/**
 * Scan app/pages directory and generate routes
 */
export async function scanRoutes(cwd: string = process.cwd()): Promise<RouteEntry[]> {
  const pagesDir = resolve(cwd, 'app/pages')

  // Find all .vue files in pages directory
  const vueFiles = await glob('**/*.vue', {
    cwd: pagesDir,
    absolute: false,
  })

  // Generate route entries (with meta extracted from each page file)
  const routes: RouteEntry[] = await Promise.all(vueFiles.map(async filePath => {
    const routePath = filePathToRoutePath(filePath)
    const routeName = filePathToRouteName(filePath)
    const absoluteFilePath = resolve(pagesDir, filePath)
    const meta = await extractPageMeta(absoluteFilePath)

    return {
      path: routePath,
      filePath: absoluteFilePath,
      name: routeName,
      ...(meta ? { meta } : {}),
    }
  }))

  // Sort routes by specificity (more specific routes first)
  // This ensures /users/:id comes after /users/profile
  routes.sort((a, b) => {
    const aSegments = a.path.split('/').filter(Boolean)
    const bSegments = b.path.split('/').filter(Boolean)

    // More segments = more specific
    if (aSegments.length !== bSegments.length) {
      return bSegments.length - aSegments.length
    }

    // Count dynamic segments (fewer = more specific)
    const aDynamic = aSegments.filter(s => s.startsWith(':')).length
    const bDynamic = bSegments.filter(s => s.startsWith(':')).length

    if (aDynamic !== bDynamic) {
      return aDynamic - bDynamic
    }

    // Alphabetical as tiebreaker
    return a.path.localeCompare(b.path)
  })

  return routes
}

/**
 * Generate routes.ts file content that can be imported
 * This generates a virtual module with route definitions
 * Components are referenced by file path, not imported directly
 */
export async function generateRoutesModule(cwd: string = process.cwd()): Promise<string> {
  const routes = await scanRoutes(cwd)

  if (routes.length === 0) {
    // No routes found - return empty array
    return `// Auto-generated routes
// No routes found in app/pages directory

export const routes = []
`
  }

  // Generate routes array with file paths instead of component imports
  const routesArray = routes.map((route) => {
    const metaPart = route.meta ? `, meta: ${JSON.stringify(route.meta)}` : ''
    return `  { path: '${route.path}', componentPath: '${route.filePath}', name: '${route.name}'${metaPart} }`
  }).join(',\n')

  return `// Auto-generated routes from app/pages directory
// Do not edit manually - this file is regenerated on each dev server start
// Components are loaded lazily via the SFC loader

export const routes = [
${routesArray}
]
`
}
