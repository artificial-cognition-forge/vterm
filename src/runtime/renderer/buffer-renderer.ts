/**
 * Buffer Renderer - Renders LayoutNode tree to ScreenBuffer
 *
 * Renders directly to a ScreenBuffer using computed layout positions.
 *
 * Flow:
 * 1. Layout engine computes positions (x, y, width, height)
 * 2. Buffer renderer paints nodes to screen buffer
 * 3. Frame differ generates minimal ANSI updates
 * 4. Terminal driver writes to stdout
 */

import type { LayoutNode } from "../../core/layout/types"
import { buildStackingContextTree } from "../../core/layout/stacking-context"
import { ScreenBuffer } from "../terminal/buffer"
import type { InteractionManager } from "./interaction"
import type { SelectionManager } from "./selection"
import { RenderingPass } from "./rendering-pass"
import type { UIConfig } from "../../types/types"

/**
 * Renders a LayoutNode tree to a ScreenBuffer
 */
export class BufferRenderer {
    private interactionManager?: InteractionManager
    private selectionManager?: SelectionManager
    private uiConfig: UIConfig

    constructor(interactionManager?: InteractionManager, selectionManager?: SelectionManager, uiConfig?: UIConfig) {
        this.interactionManager = interactionManager
        this.selectionManager = selectionManager
        this.uiConfig = uiConfig ?? { scrollbar: { thumb: '█', track: '│' }, cursor: { shape: 'block', blink: true } }
    }

    /**
     * Renders the entire layout tree to a buffer using stacking contexts,
     * then overlays the selection highlight.
     *
     * Uses two-pass rendering:
     * - Pass 1: Paint all backgrounds and borders (respecting z-index stacking order)
     * - Pass 2: Paint all text content (on top of all backgrounds)
     */
    render(root: LayoutNode, buffer: ScreenBuffer): void {
        buffer.clear()

        const rootContext = buildStackingContextTree(root)

        const renderPass = new RenderingPass(buffer, this.interactionManager, this.selectionManager)
        renderPass.executeRenderingPasses(rootContext, 0)

        this.selectionManager?.applyHighlight(buffer)
    }
}
