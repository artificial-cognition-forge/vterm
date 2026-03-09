import postcss from 'postcss'
import nested from 'postcss-nested'
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

  // Process CSS with postcss-nested to flatten nested rules
  const result = await postcss([nested]).process(css, { from: undefined })
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
 * Extract and compile styles from a Vue SFC descriptor
 */
export async function extractSFCStyles(
  styleBlocks: Array<{ content: string; scoped?: boolean }>
): Promise<ParsedStyles> {
  let allStyles: ParsedStyles = {}

  for (const block of styleBlocks) {
    const styles = await transformCSSToLayout(block.content)

    // Note: We're ignoring the 'scoped' attribute for now since blessed doesn't
    // support adding data attributes to elements like Vue does in the DOM.
    // All styles are treated as global in the terminal context.

    // Deep merge styles to properly combine nested objects like visualStyles
    for (const selector in styles) {
      if (allStyles[selector]) {
        allStyles[selector] = deepMerge(allStyles[selector], styles[selector])
      } else {
        allStyles[selector] = styles[selector]
      }
    }
  }

  return allStyles
}
