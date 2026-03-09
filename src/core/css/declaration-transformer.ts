import type { LayoutProperties, VisualStyle, BorderStyle } from '../layout/types'
import { parseColor, parseBorder } from './color-parser'

/**
 * Parse a CSS value that might be a number with units
 * For terminal, we typically want to strip units and use raw values
 */
function parseNumericValue(value: string): string | number {
  // Keep calc() expressions as strings for resolution at layout time
  if (value.startsWith('calc(')) {
    return value
  }

  // Keep percentages as strings
  if (value.includes('%')) {
    return value
  }

  // Keep 'shrink' as special value
  if (value === 'shrink') {
    return value
  }

  // Parse numbers with units (px, em, rem, etc) - strip the unit
  const numMatch = value.match(/^(-?\d+(?:\.\d+)?)(px|em|rem|pt)?$/)
  if (numMatch && numMatch[1]) {
    const num = parseFloat(numMatch[1])
    return Number.isInteger(num) ? Math.round(num) : num
  }

  // Return as-is for other values
  return value
}

/**
 * Ensure visualStyles object exists on layout properties
 */
function ensureVisualStyles(props: LayoutProperties): VisualStyle {
  if (!props.visualStyles) {
    props.visualStyles = {}
  }
  return props.visualStyles
}

/**
 * Transform a single CSS declaration to layout properties
 */
export function transformDeclaration(prop: string, value: string, props: LayoutProperties): void {
  switch (prop) {
    // Colors (visual styles)
case 'color': {
      const visual = ensureVisualStyles(props);
      if (value.trim().toLowerCase() === 'transparent') {
        visual.transparent = true;
        visual.fg = undefined;
      } else {
        visual.fg = parseColor(value);
      }
      break;
    }
    case 'background':
    case 'background-color': {
      const visual = ensureVisualStyles(props)
      visual.bg = parseColor(value)
      break
    }

    // Text styles (visual styles)
    case 'font-weight':
      if (value === 'bold' || parseInt(value) >= 700) {
        const visual = ensureVisualStyles(props)
        visual.bold = true
      }
      break
    // Terminal shorthand: bold: true / bold: 1
    case 'bold':
      ensureVisualStyles(props).bold = (value !== 'false' && value !== '0' && value !== 'none')
      break
    case 'text-decoration':
    case 'text-decoration-line':
      if (value.includes('underline')) {
        const visual = ensureVisualStyles(props)
        visual.underline = true
      }
      break
    // Terminal shorthand: underline: true / underline: 1
    case 'underline':
      ensureVisualStyles(props).underline = (value !== 'false' && value !== '0' && value !== 'none')
      break
    case 'font-style':
      if (value === 'italic') {
        // Note: Terminal support for italic varies
        ;(ensureVisualStyles(props) as any).italic = true
      }
      break

    // Visual effects
    case 'opacity':
      if (parseFloat(value) < 1) {
        const visual = ensureVisualStyles(props)
        visual.transparent = true
      }
      break
    case 'visibility':
      if (value === 'hidden') {
        const visual = ensureVisualStyles(props)
        visual.invisible = true
      }
      break

    // Border (layout property)
    case 'border': {
      const borderData = parseBorder(value)
      if (borderData) {
        props.border = {
          width: 1,
          fg: borderData.fg
        }
        // Extract border type from CSS value (check more specific names first)
        if (value.includes('ascii')) {
          props.borderType = 'ascii'
        } else if (value.includes('heavy')) {
          props.borderType = 'heavy'
        } else if (value.includes('double')) {
          props.borderType = 'double'
        } else if (value.includes('line')) {
          props.borderType = 'line'
        } else if (value.includes('bg')) {
          props.borderType = 'bg'
        } else if (value.includes('solid')) {
          // CSS 'solid' maps to 'line' border
          props.borderType = 'line'
        } else if (value.match(/^\d+/)) {
          // Default to 'line' if border width is specified
          props.borderType = 'line'
        }
      }
      break
    }
    case 'border-color':
      if (!props.border) {
        props.border = { width: 1 }
      }
      props.borderFg = parseColor(value)
      if (props.border) {
        props.border.fg = parseColor(value)
      }
      break
    case 'border-width': {
      const width = parseNumericValue(value)
      if (typeof width === 'number') {
        props.borderWidth = width
        if (!props.border) {
          props.border = { width }
        } else {
          props.border.width = width
        }
      }
      break
    }
    case 'border-style':
      // Map CSS border styles to layout border types
      if (value === 'solid') {
        props.borderType = 'line'
      } else if (value === 'double') {
        props.borderType = 'double'
      } else if (value === 'none') {
        props.borderType = undefined
        props.border = undefined
      }
      break

    // Overflow handling
    case 'overflow':
      if (value === 'scroll' || value === 'auto') {
        ;(props as any).scrollable = true
        ;(props as any).alwaysScroll = true
      } else if (value === 'hidden') {
        ;(props as any).scrollable = false
      }
      break
    case 'overflow-y':
      if (value === 'scroll' || value === 'auto') {
        ;(props as any).scrollable = true
        ;(props as any).alwaysScroll = true
        ;(props as any).scrollableY = true
      } else if (value === 'hidden') {
        ;(props as any).scrollable = false
      }
      break
    case 'overflow-x':
      // Mark for horizontal scrolling
      if (value === 'scroll' || value === 'auto') {
        ;(props as any).scrollableX = true
      }
      break

    // Box model dimensions
    case 'width':
      props.width = parseNumericValue(value)
      break
    case 'height':
      props.height = parseNumericValue(value)
      break
    case 'min-width': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.minWidth = val
      }
      break
    }
    case 'min-height': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.minHeight = val
      }
      break
    }
    case 'max-width': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.maxWidth = val
      }
      break
    }
    case 'max-height': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.maxHeight = val
      }
      break
    }

    // Position properties
    case 'top':
      props.top = parseNumericValue(value)
      break
    case 'left':
      props.left = parseNumericValue(value)
      break
    case 'right':
      props.right = parseNumericValue(value)
      break
    case 'bottom':
      props.bottom = parseNumericValue(value)
      break
    case 'position':
      if (value === 'relative' || value === 'absolute') {
        props.position = value
      }
      break

    // Spacing (box model)
    case 'padding': {
      // Parse padding shorthand: "1" or "1 2" or "1 2 3 4"
      const paddingParts = value.split(/\s+/).map(parseNumericValue).filter((v): v is string | number => v !== undefined)
      if (paddingParts.length === 1 && typeof paddingParts[0] === 'number') {
        props.padding = paddingParts[0]
      } else if (paddingParts.length === 2) {
        props.padding = {
          top: paddingParts[0] as number,
          bottom: paddingParts[0] as number,
          left: paddingParts[1] as number,
          right: paddingParts[1] as number
        }
      } else if (paddingParts.length === 4) {
        props.padding = {
          top: paddingParts[0] as number,
          right: paddingParts[1] as number,
          bottom: paddingParts[2] as number,
          left: paddingParts[3] as number
        }
      }
      break
    }
    case 'padding-top': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.paddingTop = val
      }
      break
    }
    case 'padding-right': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.paddingRight = val
      }
      break
    }
    case 'padding-bottom': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.paddingBottom = val
      }
      break
    }
    case 'padding-left': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.paddingLeft = val
      }
      break
    }
    case 'margin': {
      // Parse margin shorthand: "1" or "1 2" or "1 2 3 4"
      if (value === 'auto') {
        // margin: auto is used for centering but not implemented for layout.
        // Store a flag so the selector is preserved in parsed styles.
        ;(props as any).marginAuto = true
        break
      }
      const marginParts = value.split(/\s+/).map(parseNumericValue).filter((v): v is string | number => v !== undefined)
      if (marginParts.length === 1 && typeof marginParts[0] === 'number') {
        props.margin = marginParts[0]
      } else if (marginParts.length === 2) {
        props.margin = {
          top: marginParts[0] as number,
          bottom: marginParts[0] as number,
          left: marginParts[1] as number,
          right: marginParts[1] as number
        }
      } else if (marginParts.length === 4) {
        props.margin = {
          top: marginParts[0] as number,
          right: marginParts[1] as number,
          bottom: marginParts[2] as number,
          left: marginParts[3] as number
        }
      }
      break
    }
    case 'margin-top': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.marginTop = val
      }
      break
    }
    case 'margin-right': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.marginRight = val
      }
      break
    }
    case 'margin-bottom': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.marginBottom = val
      }
      break
    }
    case 'margin-left': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.marginLeft = val
      }
      break
    }

    // Text alignment
    case 'text-align':
      if (value === 'center' || value === 'left' || value === 'right') {
        props.textAlign = value
      }
      break
    case 'vertical-align':
      if (value === 'middle' || value === 'top' || value === 'bottom') {
        props.verticalAlign = value as 'top' | 'middle' | 'bottom'
      }
      break

    // Display and visibility
    case 'display':
      if (value === 'none') {
        props.display = 'none'
      } else if (value === 'flex') {
        props.display = 'flex'
      } else if (value === 'block') {
        props.display = 'block'
      } else if (value === 'inline') {
        props.display = 'inline'
      }
      break

    // Flexbox layout
    case 'flex-direction':
      if (value === 'row' || value === 'column' || value === 'row-reverse' || value === 'column-reverse') {
        props.flexDirection = value
        if (!props.display) {
          props.display = 'flex'
        }
      }
      break
    case 'justify-content':
      // Main axis alignment for flex containers
      if (['flex-start', 'flex-end', 'center', 'space-between', 'space-around', 'space-evenly'].includes(value)) {
        props.justifyContent = value as any
      }
      break
    case 'align-items':
      // Cross axis alignment for flex containers
      if (['flex-start', 'flex-end', 'center', 'stretch', 'baseline'].includes(value)) {
        props.alignItems = value as any
      }
      break
    case 'align-self':
      if (['auto', 'flex-start', 'flex-end', 'center', 'stretch', 'baseline'].includes(value)) {
        props.alignSelf = value as any
      }
      break
    case 'flex-wrap':
      if (['nowrap', 'wrap', 'wrap-reverse'].includes(value)) {
        props.flexWrap = value as any
      }
      break
    case 'flex': {
      // Shorthand: flex: <grow> [<shrink> [<basis>]]
      // flex: 1       → grow=1, shrink=1, basis=0  (most common: "fill remaining space")
      // flex: none    → grow=0, shrink=0
      // flex: auto    → grow=1, shrink=1
      if (value === 'none') {
        props.flexGrow = 0
        props.flexShrink = 0
        break
      }
      if (value === 'auto') {
        props.flexGrow = 1
        props.flexShrink = 1
        break
      }
      const flexParts = value.trim().split(/\s+/)
      const firstNum = parseFloat(flexParts[0] || '0')
      if (!isNaN(firstNum)) {
        props.flexGrow = firstNum
        if (flexParts.length === 1) {
          // Single number: shrink=1, basis=0 (CSS spec)
          props.flexShrink = 1
          props.flexBasis = 0
        } else {
          const secondNum = parseFloat(flexParts[1]!)
          if (!isNaN(secondNum)) props.flexShrink = secondNum
          if (flexParts.length >= 3) {
            props.flexBasis = parseNumericValue(flexParts[2]!)
          }
        }
      }
      break
    }
    case 'flex-grow': {
      const num = parseFloat(value)
      if (!isNaN(num)) {
        props.flexGrow = num
      }
      break
    }
    case 'flex-shrink': {
      const num = parseFloat(value)
      if (!isNaN(num)) {
        props.flexShrink = num
      }
      break
    }
    case 'flex-basis':
      props.flexBasis = parseNumericValue(value)
      break
    case 'gap': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.gap = val
      }
      break
    }
    case 'row-gap': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.rowGap = val
      }
      break
    }
    case 'column-gap': {
      const val = parseNumericValue(value)
      if (typeof val === 'number') {
        props.columnGap = val
      }
      break
    }

    // Visual effects (stored in visualStyles)
    case 'blink': {
      const visual = ensureVisualStyles(props)
      visual.blink = Boolean(value === 'true' || value === '1' || value === 'yes')
      break
    }
    case 'inverse': {
      const visual = ensureVisualStyles(props)
      visual.inverse = Boolean(value === 'true' || value === '1' || value === 'yes')
      break
    }
    case 'shadow': {
      ;(ensureVisualStyles(props) as any).shadow = Boolean(value === 'true' || value === '1' || value === 'yes')
      break
    }

    // Platform-specific properties (passed through for blessed adapter)
    case 'scrollable':
    case 'alwaysScroll':
    case 'keys':
    case 'vi':
    case 'mouse':
    case 'clickable':
    case 'draggable':
    case 'interactive':
    case 'input':
    case 'keyable':
    case 'focused':
    case 'hidden':
    case 'shrink':
    case 'wrap':
    case 'content':
    case 'label':
    case 'tags':
    case 'baseLimit':
    case 'scrollbar':
    case 'cursor':
      // Store platform-specific properties as-is for blessed adapter
      ;(props as any)[prop] = value
      break

    // Stacking context
    case 'z-index':
      if (value === 'auto' || value === 'inherit') {
        props.zIndex = 'auto'
      } else {
        // Match optional negative sign followed by digits (with optional decimal)
        const match = value.trim().match(/^(-?\d+(?:\.\d+)?)$/)
        if (match) {
          props.zIndex = Math.floor(parseFloat(match[1]))
        } else {
          props.zIndex = 'auto'
        }
      }
      break

    // Pointer events
    case 'pointer-events':
      if (value === 'auto' || value === 'none') {
        props.pointerEvents = value
      }
      break
  }
}
