import type { LayoutProperties } from '../layout/types'

/**
 * @deprecated Use LayoutProperties from ../layout/types instead
 * Kept for backward compatibility during migration
 */
export interface BlessedStyle {
  fg?: string
  bg?: string
  bold?: boolean
  underline?: boolean
  blink?: boolean
  inverse?: boolean
  invisible?: boolean
  transparent?: boolean
  shadow?: boolean
  border?: {
    fg?: string
    bg?: string
  }
  scrollbar?: {
    fg?: string
    bg?: string
    ch?: string
  } | boolean
  hover?: BlessedStyle
  focus?: BlessedStyle
  active?: BlessedStyle
}

/**
 * Parsed styles mapped by CSS selector
 */
export interface ParsedStyles {
  [selector: string]: LayoutProperties
}
