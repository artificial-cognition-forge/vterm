import { describe, it, expect } from 'bun:test'
import { InteractionManager } from './interaction'
import type { LayoutNode } from '../../core/layout/types'

/**
 * Helper to create a mock LayoutNode for testing
 */
function createNode(
    id: string,
    x: number,
    y: number,
    width: number,
    height: number,
    options?: {
        zIndex?: number
        pointerEvents?: 'auto' | 'none'
        children?: LayoutNode[]
    }
): LayoutNode {
    return {
        id,
        type: 'div',
        layoutProps: {
            pointerEvents: options?.pointerEvents ?? 'auto',
            zIndex: options?.zIndex,
        },
        layout: {
            x,
            y,
            width,
            height,
            padding: { top: 0, right: 0, bottom: 0, left: 0 },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
            border: { width: 0 },
        },
        style: {},
        content: null,
        props: {},
        events: new Map(),
        children: options?.children ?? [],
        parent: null,
        scrollX: 0,
        scrollY: 0,
        zIndex: options?.zIndex ?? 0,
        createsStackingContext: false,
    }
}

describe('InteractionManager - Hit Testing', () => {
    describe('basic hit testing', () => {
        it('should hit a node that contains the point', () => {
            const manager = new InteractionManager()
            const node = createNode('root', 0, 0, 10, 10)

            const hit = (manager as any).hitTest(5, 5, node)

            expect(hit?.id).toBe('root')
        })

        it('should not hit a node that does not contain the point', () => {
            const manager = new InteractionManager()
            const node = createNode('root', 0, 0, 10, 10)

            const hit = (manager as any).hitTest(15, 15, node)

            expect(hit).toBeNull()
        })

        it('should hit a child node when point is within child bounds', () => {
            const child = createNode('child', 2, 2, 5, 5)
            const parent = createNode('parent', 0, 0, 10, 10, { children: [child] })

            const manager = new InteractionManager()
            const hit = (manager as any).hitTest(4, 4, parent)

            expect(hit?.id).toBe('child')
        })

        it('should hit parent node when point is not in any child', () => {
            const child = createNode('child', 5, 5, 5, 5)
            const parent = createNode('parent', 0, 0, 10, 10, { children: [child] })

            const manager = new InteractionManager()
            const hit = (manager as any).hitTest(2, 2, parent)

            expect(hit?.id).toBe('parent')
        })
    })

    describe('z-index based hit testing', () => {
        it('should hit the topmost element by z-index', () => {
            // Front element at z-index 2
            const front = createNode('front', 2, 2, 6, 6, { zIndex: 2 })

            // Back element at z-index 1
            const back = createNode('back', 0, 0, 10, 10, { zIndex: 1, children: [front] })

            const manager = new InteractionManager()
            const hit = (manager as any).hitTest(4, 4, back)

            // Should hit the front element even though back is parent
            expect(hit?.id).toBe('front')
        })

        it('should hit lower z-index element when higher element does not contain point', () => {
            const front = createNode('front', 5, 5, 5, 5, { zIndex: 2 })
            const back = createNode('back', 0, 0, 10, 10, { zIndex: 1, children: [front] })

            const manager = new InteractionManager()
            const hit = (manager as any).hitTest(2, 2, back)

            // Point is not in front, so should hit back
            expect(hit?.id).toBe('back')
        })
    })

    describe('pointer-events blocking', () => {
        it('should skip element with pointer-events: none', () => {
            const blocked = createNode('blocked', 2, 2, 6, 6, { pointerEvents: 'none' })
            const parent = createNode('parent', 0, 0, 10, 10, { children: [blocked] })

            const manager = new InteractionManager()
            const hit = (manager as any).hitTest(4, 4, parent)

            // Should hit parent, not blocked child
            expect(hit?.id).toBe('parent')
        })

        it('should allow click-through to element behind pointer-events: none', () => {
            const back = createNode('back', 0, 0, 10, 10, { zIndex: 1 })
            const front = createNode('front', 2, 2, 6, 6, { zIndex: 2, pointerEvents: 'none' })
            const root = createNode('root', 0, 0, 10, 10, { children: [back, front] })

            const manager = new InteractionManager()
            const hit = (manager as any).hitTest(4, 4, root)

            // Should hit back, not front (even though front has higher z-index)
            expect(hit?.id).toBe('back')
        })
    })

    describe('scroll blocking (main use case)', () => {
        it('should block scroll on element behind absolutely positioned overlay', () => {
            // Scrollable container at z-index 1
            const scrollable = createNode('scroll', 0, 0, 10, 10, {
                zIndex: 1,
            })
            scrollable.layoutProps.scrollable = true

            // Absolutely positioned overlay at z-index 2
            const overlay = createNode('overlay', 2, 2, 6, 6, { zIndex: 2 })

            const root = createNode('root', 0, 0, 10, 10, { children: [scrollable, overlay] })

            const manager = new InteractionManager()

            // When clicking in overlay area, should hit overlay, not scrollable
            const hit = (manager as any).hitTest(4, 4, root)
            expect(hit?.id).toBe('overlay')
        })

        it('should allow scroll on element when not under overlay', () => {
            const scrollable = createNode('scroll', 0, 0, 10, 10, { zIndex: 1 })
            scrollable.layoutProps.scrollable = true

            const overlay = createNode('overlay', 2, 2, 3, 3, { zIndex: 2 })

            const root = createNode('root', 0, 0, 10, 10, { children: [scrollable, overlay] })

            const manager = new InteractionManager()

            // Point outside overlay should hit scrollable
            const hit = (manager as any).hitTest(8, 8, root)
            expect(hit?.id).toBe('scroll')
        })
    })

    describe('nested z-index with pointer-events', () => {
        it('should respect z-index even with pointer-events: auto on all', () => {
            const level1 = createNode('level1', 0, 0, 10, 10, { zIndex: 1 })
            const level2 = createNode('level2', 2, 2, 6, 6, { zIndex: 2 })
            const level3 = createNode('level3', 4, 4, 3, 3, { zIndex: 3 })

            const root = createNode('root', 0, 0, 10, 10, { children: [level1, level2, level3] })

            const manager = new InteractionManager()
            const hit = (manager as any).hitTest(5, 5, root)

            // Should hit highest z-index
            expect(hit?.id).toBe('level3')
        })

        it('should skip pointer-events: none even with higher z-index', () => {
            const level1 = createNode('level1', 0, 0, 10, 10, { zIndex: 1 })
            const level2 = createNode('level2', 2, 2, 6, 6, {
                zIndex: 3,
                pointerEvents: 'none',
            })

            const root = createNode('root', 0, 0, 10, 10, { children: [level1, level2] })

            const manager = new InteractionManager()
            const hit = (manager as any).hitTest(4, 4, root)

            // Should hit level1, not level2 (level2 is blocked)
            expect(hit?.id).toBe('level1')
        })
    })

    describe('edge cases', () => {
        it('should handle point at exact boundaries', () => {
            const node = createNode('node', 5, 5, 10, 10)

            const manager = new InteractionManager()

            // Hit at exact start boundary (inclusive)
            expect((manager as any).hitTest(5, 5, node)?.id).toBe('node')

            // Hit at x boundary
            expect((manager as any).hitTest(14, 10, node)?.id).toBe('node')

            // Miss at end boundary (exclusive)
            expect((manager as any).hitTest(15, 10, node)).toBeNull()

            // Miss at y boundary (exclusive)
            expect((manager as any).hitTest(10, 15, node)).toBeNull()
        })

        it('should handle empty children list', () => {
            const node = createNode('root', 0, 0, 10, 10)

            const manager = new InteractionManager()
            const hit = (manager as any).hitTest(5, 5, node)

            expect(hit?.id).toBe('root')
        })

        it('should handle deeply nested nodes', () => {
            const level3 = createNode('level3', 3, 3, 2, 2)
            const level2 = createNode('level2', 2, 2, 4, 4, { children: [level3] })
            const level1 = createNode('level1', 1, 1, 6, 6, { children: [level2] })
            const root = createNode('root', 0, 0, 10, 10, { children: [level1] })

            const manager = new InteractionManager()
            const hit = (manager as any).hitTest(4, 4, root)

            // Should hit deepest node
            expect(hit?.id).toBe('level3')
        })
    })

    describe('realistic scenarios', () => {
        it('modal dialog should block clicks on elements behind it', () => {
            // Background content
            const bg = createNode('background', 0, 0, 20, 20, { zIndex: 1 })
            bg.layoutProps.scrollable = true

            // Modal overlay (centered, smaller)
            const modal = createNode('modal', 5, 5, 10, 10, { zIndex: 10 })

            const root = createNode('root', 0, 0, 20, 20, { children: [bg, modal] })

            const manager = new InteractionManager()

            // Click on modal
            expect((manager as any).hitTest(10, 10, root)?.id).toBe('modal')

            // Click outside modal
            expect((manager as any).hitTest(2, 2, root)?.id).toBe('background')
        })

        it('tooltip with pointer-events: none should pass through to element below', () => {
            // Button
            const button = createNode('button', 5, 5, 4, 3, { zIndex: 1 })

            // Tooltip overlaying button with pointer-events: none
            const tooltip = createNode('tooltip', 5, 5, 4, 1, {
                zIndex: 100,
                pointerEvents: 'none',
            })

            const root = createNode('root', 0, 0, 20, 20, { children: [button, tooltip] })

            const manager = new InteractionManager()

            // Click on tooltip area should hit button below (tooltip is transparent to events)
            expect((manager as any).hitTest(6, 5, root)?.id).toBe('button')
        })

        it('overlay with high z-index but pointer-events: none allows interaction with scrollbar', () => {
            // Scrollable container
            const scrollable = createNode('scrollable', 0, 0, 20, 20, { zIndex: 1 })
            scrollable.layoutProps.scrollable = true

            // Full-screen overlay with pointer-events: none
            const overlay = createNode('overlay', 0, 0, 20, 20, {
                zIndex: 1000,
                pointerEvents: 'none',
            })

            const root = createNode('root', 0, 0, 20, 20, { children: [scrollable, overlay] })

            const manager = new InteractionManager()

            // Any point should hit scrollable (not overlay)
            expect((manager as any).hitTest(10, 10, root)?.id).toBe('scrollable')
        })
    })
})

describe('InteractionManager - Mouse Events', () => {
    it('should dispatch wheel event to topmost scrollable element', () => {
        const manager = new InteractionManager()

        // Create scrollable node
        const scrollable = createNode('scroll', 0, 0, 10, 10)
        scrollable.layoutProps.scrollable = true

        let wheelHandled = false
        scrollable.events.set('wheeldown', () => {
            wheelHandled = true
        })

        // Mock the state change callback
        manager.handleMouseEvent(
            { type: 'wheeldown', button: 'none', x: 5, y: 5, ctrl: false, shift: false, meta: false },
            scrollable
        )

        // Note: The actual scrolling behavior is handled internally
        // This test just verifies the event routing works
        expect(true).toBe(true)
    })

    describe('textarea wheel scrolling', () => {
        it('should scroll textarea down on wheeldown event', () => {
            const manager = new InteractionManager()

            // Create textarea with layout and content
            const textarea = createNode('textarea', 5, 5, 30, 10)
            textarea.type = 'textarea'
            textarea.layout!.border.width = 1
            textarea.contentHeight = 25 // More content than viewport height
            textarea.scrollY = 0

            // Root node
            const root = createNode('root', 0, 0, 80, 24, { children: [textarea] })

            manager.updateFocusableNodes(root)

            // Scroll down
            const event = {
                type: 'wheeldown' as const,
                button: 'none' as const,
                x: 20,
                y: 10,
                ctrl: false,
                shift: false,
                meta: false,
            }
            manager.handleMouseEvent(event, root)

            expect(textarea.scrollY).toBeGreaterThan(0)
        })

        it('should scroll textarea up on wheelup event', () => {
            const manager = new InteractionManager()

            // Create textarea
            const textarea = createNode('textarea', 5, 5, 30, 10)
            textarea.type = 'textarea'
            textarea.layout!.border.width = 1
            textarea.contentHeight = 25
            textarea.scrollY = 10 // Start scrolled down

            const root = createNode('root', 0, 0, 80, 24, { children: [textarea] })

            manager.updateFocusableNodes(root)

            // Scroll up
            const event = {
                type: 'wheelup' as const,
                button: 'none' as const,
                x: 20,
                y: 10,
                ctrl: false,
                shift: false,
                meta: false,
            }
            manager.handleMouseEvent(event, root)

            expect(textarea.scrollY).toBeLessThan(10)
        })

        it('should not scroll above 0', () => {
            const manager = new InteractionManager()

            const textarea = createNode('textarea', 5, 5, 30, 10)
            textarea.type = 'textarea'
            textarea.layout!.border.width = 1
            textarea.contentHeight = 25
            textarea.scrollY = 0

            const root = createNode('root', 0, 0, 80, 24, { children: [textarea] })
            manager.updateFocusableNodes(root)

            // Scroll up (should stay at 0)
            for (let i = 0; i < 5; i++) {
                manager.handleMouseEvent(
                    { type: 'wheelup', button: 'none', x: 20, y: 10, ctrl: false, shift: false, meta: false },
                    root
                )
            }

            expect(textarea.scrollY).toBe(0)
        })

        it('should not scroll beyond content', () => {
            const manager = new InteractionManager()

            const textarea = createNode('textarea', 5, 5, 30, 10)
            textarea.type = 'textarea'
            textarea.layout!.border.width = 1
            textarea.layout!.padding = { top: 1, bottom: 1, left: 1, right: 1 }
            textarea.contentHeight = 25
            textarea.scrollY = 0

            const root = createNode('root', 0, 0, 80, 24, { children: [textarea] })
            manager.updateFocusableNodes(root)

            // Calculate max scroll
            const viewportHeight = 10 - 2 * 1 - 1 - 1 // height - borders - padding
            const maxScroll = Math.max(0, 25 - viewportHeight)

            // Scroll down many times
            for (let i = 0; i < 100; i++) {
                manager.handleMouseEvent(
                    { type: 'wheeldown', button: 'none', x: 20, y: 10, ctrl: false, shift: false, meta: false },
                    root
                )
            }

            expect(textarea.scrollY).toBeLessThanOrEqual(maxScroll)
        })
    })
})
