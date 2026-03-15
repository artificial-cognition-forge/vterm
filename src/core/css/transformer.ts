import postcss from 'postcss'
import nested from 'postcss-nested'
import * as sass from 'sass'
import type { ParsedStyles } from './types'
import type { LayoutProperties } from '../layout/types'
import { transformDeclaration } from './declaration-transformer'

/**
 * Deep merge two objects
 */
function deepMerge<T extends Record<string, any>>(target: T, source: T): T {
  const result = { ...target }

  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
        result[key] = deepMerge(result[key] as any, source[key] as any)
      } else {
        result[key] = { ...source[key] }
      }
    } else {
      result[key] = source[key]
    }
  }

  return result
}

/**
 * Transform CSS string to platform-agnostic layout properties
 * Returns a map of selectors to layout property objects
 */
export async function transformCSSToLayout(css: string): Promise<ParsedStyles> {
  const styles: ParsedStyles = {}

  // Strip // line comments — PostCSS only supports /* */ comments
  const sanitized = css.replace(/\/\/[^\n]*/g, "")
  // Process CSS with postcss-nested to flatten nested rules
  const result = await postcss([nested]).process(sanitized, { from: undefined })
  const root = result.root

  root.walkRules((rule) => {
    const selector = rule.selector.trim()
    const layoutProps: LayoutProperties = {}

    // Check if this is a pseudo-class rule
    const isPseudo = selector.includes(':hover') || selector.includes(':focus') || selector.includes(':active')
    const baseSelector = selector.replace(/:hover|:focus|:active/, '').trim()
    const pseudoType = selector.includes(':hover') ? 'hover' : selector.includes(':focus') ? 'focus' : selector.includes(':active') ? 'active' : null

    // Walk through declarations
    rule.walkDecls((decl) => {
      transformDeclaration(decl.prop, decl.value, layoutProps)
    })

    // Handle pseudo-classes
    if (isPseudo && pseudoType) {
      // Ensure base selector exists
      if (!styles[baseSelector]) {
        styles[baseSelector] = {}
      }
      // Add pseudo-class style
      if (pseudoType === 'hover') {
        styles[baseSelector].hover = layoutProps
      } else if (pseudoType === 'focus') {
        styles[baseSelector].focus = layoutProps
      } else if (pseudoType === 'active') {
        styles[baseSelector].active = layoutProps
      }
    } else if (Object.keys(layoutProps).length > 0) {
      // Merge with existing style if present (deep merge for nested objects)
      if (styles[selector]) {
        styles[selector] = deepMerge(styles[selector], layoutProps)
      } else {
        styles[selector] = layoutProps
      }
    }
  })

  return styles
}

/**
 * @deprecated Use transformCSSToLayout instead
 */
export const transformCSSToBlessed = transformCSSToLayout

/**
 * Encode a scoped selector key.
 * Format: `${scopeId}\x00${selector}` — the null byte is impossible in any CSS
 * selector so it acts as an unambiguous separator.
 */
export function encodeScopedKey(scopeId: string, selector: string): string {
  return `${scopeId}\x00${selector}`
}

/**
 * Decode a scoped selector key back to { scopeId, selector }.
 * Returns null if the key is not scoped.
 */
export function decodeScopedKey(key: string): { scopeId: string; selector: string } | null {
  const idx = key.indexOf('\x00')
  if (idx === -1) return null
  return { scopeId: key.slice(0, idx), selector: key.slice(idx + 1) }
}

/**
 * Extract and compile styles from a Vue SFC descriptor.
 * For scoped blocks, all selector keys are prefixed with the scopeId so they
 * can be matched only against nodes that carry the same scope identifier.
 */
export async function extractSFCStyles(
  styleBlocks: Array<{ content: string; scoped?: boolean; scopeId?: string; lang?: string }>
): Promise<ParsedStyles> {
  let allStyles: ParsedStyles = {}

  for (const block of styleBlocks) {
    let css = block.content
    if (block.lang === 'scss' || block.lang === 'sass') {
      const result = sass.compileString(css, { syntax: block.lang === 'sass' ? 'indented' : 'scss' })
      css = result.css
    }
    const styles = await transformCSSToLayout(css)

    for (const selector in styles) {
      // Scoped blocks: rewrite each selector key to include the scope ID so
      // it only matches nodes from this component.
      const key = (block.scoped && block.scopeId)
        ? encodeScopedKey(block.scopeId, selector)
        : selector

      if (allStyles[key]) {
        allStyles[key] = deepMerge(allStyles[key]!, styles[selector]!)
      } else {
        allStyles[key] = styles[selector]!
      }
    }
  }

  return allStyles
}
