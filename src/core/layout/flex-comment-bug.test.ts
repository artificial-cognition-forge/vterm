/**
 * Regression test: flex-column with Vue fragment anchor comment nodes
 *
 * Vue's v-for + multi-root component templates insert comment nodes as
 * fragment anchors. Before the fix, these appeared as flex children and
 * consumed gap space, producing massive blank rows between real items.
 *
 * Production comment nodes (from layout-renderer.ts createComment()):
 *   - props._isComment = true
 *   - content = null  ->  height = 0
 */

import { test, describe, expect } from 'bun:test'
import { createLayoutEngine, createLayoutNode } from './tree'
import type { LayoutNode, LayoutProperties } from './types'

function makeComment(): LayoutNode {
    return createLayoutNode({ type: 'box', props: { _isComment: true } })
}

function makeMsg(content: string): LayoutNode {
    return createLayoutNode({ type: 'div', content, props: {} })
}

function layoutFlex(children: LayoutNode[], gap = 1, containerHeight = 30) {
    const engine = createLayoutEngine(80, containerHeight)
    const container = createLayoutNode({
        type: 'div',
        props: {},
        children,
    })
    container.layoutProps = {
        display: 'flex',
        flexDirection: 'column',
        gap,
        height: containerHeight,
        width: 80,
    } as LayoutProperties
    for (const c of children) c.parent = container
    engine.computeLayout(container)
    return container
}

describe('flex-column gap with Vue comment anchor nodes', () => {
    test('baseline: messages without comment nodes', () => {
        const m1 = makeMsg('msg1')
        const m2 = makeMsg('msg2')
        const m3 = makeMsg('msg3')
        layoutFlex([m1, m2, m3], 1)
        expect(m1.layout?.y).toBe(0)
        expect(m2.layout?.y).toBe(2)  // height(1) + gap(1)
        expect(m3.layout?.y).toBe(4)
    })

    test('comment nodes do NOT consume gap space (production v-for simulation)', () => {
        const m1 = makeMsg('msg1')
        const m2 = makeMsg('msg2')
        const m3 = makeMsg('msg3')
        // Simulate Vue: [v-for-anchor] [frag-start] [div] [frag-end] * N [v-for-end]
        layoutFlex([
            makeComment(),            // v-for start anchor
            makeComment(), m1, makeComment(),  // component fragment
            makeComment(), m2, makeComment(),
            makeComment(), m3, makeComment(),
            makeComment(),            // v-for end anchor
        ], 1)
        // Comments must NOT push messages apart - same positions as without comments
        expect(m1.layout?.y).toBe(0)
        expect(m2.layout?.y).toBe(2)
        expect(m3.layout?.y).toBe(4)
    })
})
