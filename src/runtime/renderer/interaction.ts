/**
 * Interaction Manager - handles mouse events, focus, and interactive states
 *
 * This manager:
 * - Performs hit testing to map terminal coordinates to layout nodes
 * - Dispatches mouse events to correct elements
 * - Tracks interactive states (hover, focus, active)
 * - Manages focus navigation (tab/shift-tab)
 */

import type { LayoutNode } from "../../core/layout/types"
import { isScrollableNode } from "../../core/layout/utils"
import type { MouseEvent } from "../terminal/input"
import { getGlobalRouter } from "../../core/router/router"
import { spawn } from "child_process"

/**
 * Interactive state for a node
 */
export interface InteractiveState {
    hover: boolean
    focus: boolean
    active: boolean
}

/**
 * Interaction Manager
 */
export class InteractionManager {
    private hoveredNode: LayoutNode | null = null
    private focusedNode: LayoutNode | null = null
    private activeNode: LayoutNode | null = null
    private focusableNodes: LayoutNode[] = []
    private stateChangeCallback?: () => void

    constructor(onStateChange?: () => void) {
        this.stateChangeCallback = onStateChange
    }

    /**
     * Update the list of focusable nodes from the layout tree
     */
    updateFocusableNodes(root: LayoutNode | null): void {
        this.focusableNodes = []
        if (root) {
            this.collectFocusableNodes(root)
        }
    }

    /**
     * Recursively collect all focusable nodes
     */
    private collectFocusableNodes(node: LayoutNode): void {
        // A node is focusable if it has keyboard event handlers or is interactive
        const isFocusable =
            node.events.has("press") ||
            node.events.has("keypress") ||
            node.events.has("click") ||
            node.type === "button" ||
            node.type === "input" ||
            node.type === "textarea" ||
            node.type === "select" ||
            (node.type === "a" && !!node.props.href)

        if (isFocusable && node.layout) {
            this.focusableNodes.push(node)
        }

        // Recurse to children
        for (const child of node.children) {
            this.collectFocusableNodes(child)
        }
    }

    /**
     * Handle mouse event
     */
    handleMouseEvent(event: MouseEvent, root: LayoutNode | null): void {
        if (!root) return

        const targetNode = this.hitTest(event.x, event.y, root)

        // Handle different event types
        switch (event.type) {
            case "mousemove":
                this.handleMouseMove(targetNode)
                break

            case "mousedown":
                this.handleMouseDown(targetNode, event)
                break

            case "mouseup":
                this.handleMouseUp(targetNode, event)
                break

            case "wheelup":
            case "wheeldown":
                this.handleWheel(targetNode, event)
                break
        }
    }

    /**
     * Perform hit testing to find the topmost node (by z-index) at the given coordinates
     * Respects pointer-events: none to allow click-through
     */
    private hitTest(x: number, y: number, root: LayoutNode): LayoutNode | null {
        // Collect all nodes that contain the point
        const candidates = this.collectCandidates(x, y, root)

        if (candidates.length === 0) return null

        // Find the topmost candidate (highest z-index)
        // We need to sort by z-index in descending order
        let topmost = candidates[0]!
        for (let i = 1; i < candidates.length; i++) {
            const candidate = candidates[i]!
            if (this.compareZIndex(candidate, topmost) > 0) {
                topmost = candidate
            }
        }

        return topmost
    }

    /**
     * Collect all nodes that contain the point and have pointer-events enabled
     */
    private collectCandidates(x: number, y: number, node: LayoutNode, candidates: LayoutNode[] = []): LayoutNode[] {
        // Check if this node has layout and contains the point
        const layout = node.layout
        if (!layout) return candidates

        const inBounds =
            x >= layout.x &&
            x < layout.x + layout.width &&
            y >= layout.y &&
            y < layout.y + layout.height

        if (!inBounds) return candidates

        // Recursively check children first (bottom-up collection)
        for (const child of node.children) {
            this.collectCandidates(x, y, child, candidates)
        }

        // Add this node if pointer-events is not 'none'
        const pointerEvents = node.layoutProps.pointerEvents ?? 'auto'
        if (pointerEvents !== 'none') {
            candidates.push(node)
        }

        return candidates
    }

    /**
     * Compare z-index of two nodes for hit testing
     * Returns: positive if a > b, negative if a < b, 0 if equal
     */
    private compareZIndex(a: LayoutNode, b: LayoutNode): number {
        // Direct z-index comparison
        const aIndex = a.zIndex ?? 0
        const bIndex = b.zIndex ?? 0

        if (aIndex !== bIndex) {
            return aIndex - bIndex
        }

        // If z-indices are equal, use DOM order (later in tree = higher)
        // This is a simplified comparison; a full implementation would use stacking context trees
        return 0
    }

    /**
     * Handle mouse move
     */
    private handleMouseMove(targetNode: LayoutNode | null): void {
        if (targetNode !== this.hoveredNode) {
            // Fire mouseout on previous hovered node
            if (this.hoveredNode) {
                const handler = this.hoveredNode.events.get("mouseout")
                if (handler) {
                    handler()
                }
            }

            // Update hovered node
            this.hoveredNode = targetNode

            // Fire mouseover on new hovered node
            if (this.hoveredNode) {
                const handler = this.hoveredNode.events.get("mouseover")
                if (handler) {
                    handler()
                }
            }

            // Notify state change
            this.notifyStateChange()
        }

        // Always fire mousemove on the target
        if (targetNode) {
            const handler = targetNode.events.get("mousemove")
            if (handler) {
                handler()
            }
        }
    }

    /**
     * Handle mouse down
     */
    private handleMouseDown(targetNode: LayoutNode | null, event: MouseEvent): void {
        if (!targetNode) return

        // Set active state
        this.activeNode = targetNode
        this.notifyStateChange()

        // Fire mousedown event
        const mousedownHandler = targetNode.events.get("mousedown")
        if (mousedownHandler) {
            mousedownHandler(event)
        }

        // Focus the clicked element if it's focusable
        if (this.focusableNodes.includes(targetNode)) {
            this.setFocus(targetNode)
        }
    }

    /**
     * Handle mouse up
     */
    private handleMouseUp(targetNode: LayoutNode | null, event: MouseEvent): void {
        // Clear active state
        const wasActive = this.activeNode
        this.activeNode = null
        this.notifyStateChange()

        if (!targetNode) return

        // Fire mouseup event
        const mouseupHandler = targetNode.events.get("mouseup")
        if (mouseupHandler) {
            mouseupHandler(event)
        }

        // Fire click event if mouseup is on the same element as mousedown
        if (wasActive === targetNode) {
            const clickHandler = targetNode.events.get("click")
            if (clickHandler) {
                clickHandler(event)
            }

            // Also fire 'press' event
            const pressHandler = targetNode.events.get("press")
            if (pressHandler) {
                pressHandler(event)
            }

            // Navigate <a href> links — check target and its ancestors.
            // When a <div> or other element is nested inside <a>, the hit test
            // returns the inner node, so we walk up to find the <a>.
            if (!pressHandler && !clickHandler) {
                const anchorNode = this.findAnchorAncestor(targetNode)
                if (anchorNode) {
                    const href = anchorNode.props.href
                    if (/^https?:\/\//.test(href)) {
                        const cmd = process.platform === "darwin" ? "open" : "xdg-open"
                        spawn(cmd, [href], { detached: true, stdio: "ignore" }).unref()
                    } else {
                        const router = getGlobalRouter()
                        if (router) router.push(href)
                    }
                }
            }
        }
    }

    /**
     * Handle wheel event
     */
    private handleWheel(targetNode: LayoutNode | null, event: MouseEvent): void {
        if (!targetNode) return

        // Fire the wheel event handler if present
        const handler = targetNode.events.get(event.type)
        if (handler) {
            handler(event)
        }

        // Find the nearest scrollable ancestor
        const scrollableNode = this.findScrollableNode(targetNode)
        if (!scrollableNode || !scrollableNode.layout) return

        // Scroll the node
        const scrollAmount = 3 // Scroll 3 lines per wheel tick
        const layout = scrollableNode.layout!
        const border = layout.border.width
        const padding = layout.padding
        const viewportHeight = layout.height - 2 * border - padding.top - padding.bottom

        if (event.type === "wheelup") {
            scrollableNode.scrollY = Math.max(0, scrollableNode.scrollY - scrollAmount)
        } else if (event.type === "wheeldown") {
            const maxScroll = Math.max(
                0,
                (scrollableNode.contentHeight || 0) - viewportHeight
            )
            scrollableNode.scrollY = Math.min(maxScroll, scrollableNode.scrollY + scrollAmount)
        }

        // Notify state change to trigger re-render
        this.notifyStateChange()
    }

    /**
     * Find the nearest <a href> node at or above the given node
     */
    private findAnchorAncestor(node: LayoutNode): LayoutNode | null {
        if (node.type === "a" && node.props.href) return node
        if (node.parent) return this.findAnchorAncestor(node.parent)
        return null
    }

    /**
     * Find the nearest scrollable ancestor node (or the node itself)
     */
    private findScrollableNode(node: LayoutNode): LayoutNode | null {
        if (isScrollableNode(node) || node.type === 'textarea') return node
        if (node.parent) return this.findScrollableNode(node.parent)
        return null
    }

    /**
     * Get the interactive state for a node.
     * hover is true if the node itself is hovered OR any of its descendants are —
     * matching CSS behaviour where :hover propagates up the ancestor chain.
     */
    getState(node: LayoutNode): InteractiveState {
        return {
            hover: this.hoveredNode === node || this.isAncestorOfHovered(node),
            focus: this.focusedNode === node,
            active: this.activeNode === node,
        }
    }

    /**
     * Returns true if node is an ancestor of the currently hovered node.
     */
    private isAncestorOfHovered(node: LayoutNode): boolean {
        let current = this.hoveredNode?.parent ?? null
        while (current) {
            if (current === node) return true
            current = current.parent
        }
        return false
    }

    /**
     * Set focus to a specific node
     */
    setFocus(node: LayoutNode | null): void {
        if (this.focusedNode === node) return

        // Fire blur event on previous focused node
        if (this.focusedNode) {
            const blurHandler = this.focusedNode.events.get("blur")
            if (blurHandler) {
                blurHandler()
            }
        }

        this.focusedNode = node

        // Fire focus event on new focused node
        if (this.focusedNode) {
            const focusHandler = this.focusedNode.events.get("focus")
            if (focusHandler) {
                focusHandler()
            }
        }

        this.notifyStateChange()
    }

    /**
     * Focus the next focusable element
     */
    focusNext(): void {
        if (this.focusableNodes.length === 0) return

        if (!this.focusedNode) {
            this.setFocus(this.focusableNodes[0] || null)
            return
        }

        const currentIndex = this.focusableNodes.indexOf(this.focusedNode)
        const nextIndex = (currentIndex + 1) % this.focusableNodes.length
        this.setFocus(this.focusableNodes[nextIndex] || null)
    }

    /**
     * Focus the previous focusable element
     */
    focusPrevious(): void {
        if (this.focusableNodes.length === 0) return

        if (!this.focusedNode) {
            this.setFocus(this.focusableNodes[this.focusableNodes.length - 1] || null)
            return
        }

        const currentIndex = this.focusableNodes.indexOf(this.focusedNode)
        const prevIndex =
            (currentIndex - 1 + this.focusableNodes.length) % this.focusableNodes.length
        this.setFocus(this.focusableNodes[prevIndex] || null)
    }

    /**
     * Focus the first focusable element
     */
    focusFirst(): void {
        if (this.focusableNodes.length > 0) {
            this.setFocus(this.focusableNodes[0] || null)
        }
    }

    /**
     * Focus the last focusable element
     */
    focusLast(): void {
        if (this.focusableNodes.length > 0) {
            this.setFocus(this.focusableNodes[this.focusableNodes.length - 1] || null)
        }
    }

    /**
     * Get the currently focused node
     */
    getFocusedNode(): LayoutNode | null {
        return this.focusedNode
    }

    /**
     * Clear all interactive states
     */
    clear(): void {
        this.hoveredNode = null
        this.focusedNode = null
        this.activeNode = null
        this.focusableNodes = []
    }

    /**
     * Notify that state has changed (triggers re-render)
     */
    private notifyStateChange(): void {
        if (this.stateChangeCallback) {
            this.stateChangeCallback()
        }
    }
}
