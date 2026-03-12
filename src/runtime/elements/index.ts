/**
 * Element behavior registrations.
 * Import this module once at startup (done in vterm.ts) to register all
 * interactive element behaviors.
 */
export { getElement, registerElement } from './registry'
export type { ElementBehavior, ElementRenderContext } from './types'

// Register all built-in behaviors (side effects)
import './input'
import './textarea'
import './anchor'
import './code'
import './editor'
import './diff'
