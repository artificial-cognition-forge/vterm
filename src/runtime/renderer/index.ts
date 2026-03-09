/**
 * VTerm Renderer - Custom terminal rendering system
 *
 * This module exports the core rendering components:
 * - Layout Renderer: Vue → LayoutNode tree
 * - Buffer Renderer: LayoutNode → ScreenBuffer
 */

export { createLayoutRenderer, createLayoutNodeElement } from "./layout-renderer"
export { BufferRenderer } from "./buffer-renderer"
