/**
 * CSS Compliance — Compound (Descendant) Selector Application
 * spec.md § 20
 *
 * These tests guard the live rendering path where compound selectors must be
 * applied to layout nodes AFTER the tree is assembled (not during patchProp).
 *
 * The regression: `patchProp` fires before `insert`, so at style-resolution
 * time a node has no parent. Compound selectors like `.parent .child` were
 * parsed correctly but never applied to nodes in the live Vue renderer path.
 * `applyCompoundStyles` fixes this by walking the assembled tree top-down.
 *
 * Layer tested: `applyCompoundStyles` (layout-renderer.ts) + SCSS compilation
 */

import { test, expect, describe } from 'bun:test'
import { h } from 'vue'
import { applyCompoundStyles } from '../../src/runtime/renderer/layout-renderer'
import { extractSFCStyles, transformCSSToLayout } from '../../src/core/css/transformer'
import { createLayoutNode } from '../../src/core/layout/tree'
import { createLayoutEngine } from '../../src/core/layout'
import { ScreenBuffer } from '../../src/runtime/terminal/buffer'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import type { LayoutNode } from '../../src/core/layout/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal LayoutNode builder — simulates what the Vue custom renderer creates */
function makeNode(classes: string[], children: LayoutNode[] = []): LayoutNode {
    const node = createLayoutNode({
        type: 'div',
        layoutProps: {},
        style: {},
        props: { class: classes },
        children,
        content: null,
    })
    for (const child of children) {
        child.parent = node
    }
    return node
}

/**
 * Render SCSS through the full pipeline:
 *   SCSS → extractSFCStyles → applyCompoundStyles → layout → buffer
 */
async function renderSCSS(
    scss: string,
    vnode: ReturnType<typeof h>,
    width = 80,
    height = 24
): Promise<ScreenBuffer> {
    const parsed = await extractSFCStyles([{ content: scss, lang: 'scss' }])
    const styles = new Map(Object.entries(parsed))
    const engine = createLayoutEngine(width, height)
    const tree = engine.buildLayoutTree(vnode, styles)
    // apply compound styles as the live renderer would
    applyCompoundStyles(tree, parsed)
    engine.computeLayout(tree)
    const buffer = new ScreenBuffer(width, height)
    new BufferRenderer().render(tree, buffer)
    return buffer
}

// ---------------------------------------------------------------------------
// Unit: applyCompoundStyles
// ---------------------------------------------------------------------------

describe('applyCompoundStyles — direct unit tests', () => {
    test('applies descendant selector to matching child', async () => {
        const styles = await transformCSSToLayout(`
            .parent .child { background: red; }
        `)
        const child = makeNode(['child'])
        const parent = makeNode(['parent'], [child])

        applyCompoundStyles(parent, styles)

        expect(child.style.bg).toBe('red')
    })

    test('does NOT apply descendant selector when ancestor is absent', async () => {
        const styles = await transformCSSToLayout(`
            .parent .child { background: red; }
        `)
        const child = makeNode(['child'])
        const root = makeNode(['other'], [child])

        applyCompoundStyles(root, styles)

        expect(child.style.bg).toBeUndefined()
    })

    test('applies width from descendant selector', async () => {
        const styles = await transformCSSToLayout(`
            .container .col { width: 50%; }
        `)
        const col = makeNode(['col'])
        const container = makeNode(['container'], [col])
        const root = makeNode([], [container])

        applyCompoundStyles(root, styles)

        expect(col.layoutProps.width).toBe('50%')
    })

    test('applies three-level descendant selector', async () => {
        const styles = await transformCSSToLayout(`
            .a .b .c { background: blue; }
        `)
        const c = makeNode(['c'])
        const b = makeNode(['b'], [c])
        const a = makeNode(['a'], [b])
        const root = makeNode([], [a])

        applyCompoundStyles(root, styles)

        expect(c.style.bg).toBe('blue')
    })

    test('does not affect simple (non-compound) selectors', async () => {
        const styles = await transformCSSToLayout(`
            .box { background: green; }
        `)
        const box = makeNode(['box'])
        const root = makeNode([], [box])

        // Before applyCompoundStyles, box has no bg (simple selectors applied by patchProp, not here)
        applyCompoundStyles(root, styles)

        // applyCompoundStyles only handles compound selectors — simple selector not touched
        expect(box.style.bg).toBeUndefined()
    })

    test('compound override wins over previously set simple style', async () => {
        const styles = await transformCSSToLayout(`
            .child { background: grey; }
            .parent .child { background: red; }
        `)
        const child = makeNode(['child'])
        // Simulate what patchProp would have done: applied simple selector
        child.style.bg = 'grey'

        const parent = makeNode(['parent'], [child])
        applyCompoundStyles(parent, styles)

        expect(child.style.bg).toBe('red')
    })

    test('sibling nodes resolved independently', async () => {
        const styles = await transformCSSToLayout(`
            .parent .left { background: red; }
            .parent .right { background: blue; }
        `)
        const left = makeNode(['left'])
        const right = makeNode(['right'])
        const parent = makeNode(['parent'], [left, right])

        applyCompoundStyles(parent, styles)

        expect(left.style.bg).toBe('red')
        expect(right.style.bg).toBe('blue')
    })
})

// ---------------------------------------------------------------------------
// Integration: SCSS nesting → compound selectors → rendered buffer
// ---------------------------------------------------------------------------

describe('SCSS nested selectors apply in rendered output', () => {
    test('child background from nested SCSS rule is painted in buffer', async () => {
        const scss = `
            .outer { width: 10; height: 1; }
            .outer { .inner { background: cyan; width: 10; height: 1; } }
        `
        const buf = await renderSCSS(
            scss,
            h('div', { class: 'outer' }, h('div', { class: 'inner' }, 'x'))
        )
        expect(buf.getCell(0, 0)?.background).toBe('cyan')
    })

    test('sibling widths from SCSS nesting are applied', async () => {
        const scss = `
            .section {
                display: flex;
                width: 80;
                height: 1;
                .left { width: 40; height: 1; }
                .right { width: 40; height: 1; }
            }
        `
        const buf = await renderSCSS(
            scss,
            h('div', { class: 'section' }, [
                h('div', { class: 'left' }, 'L'),
                h('div', { class: 'right' }, 'R'),
            ]),
            80, 10
        )
        // left starts at x=0, right starts at x=40
        expect(buf.getCell(0, 0)?.char).toBe('L')
        expect(buf.getCell(40, 0)?.char).toBe('R')
    })

    test('SCSS variable expands into descendant selector correctly', async () => {
        const scss = `
            $active: cyan;
            .nav { width: 10; height: 1; }
            .nav {
                .item { color: $active; width: 10; height: 1; }
            }
        `
        const buf = await renderSCSS(
            scss,
            h('div', { class: 'nav' }, h('div', { class: 'item' }, 'hello'))
        )
        expect(buf.getCell(0, 0)?.color).toBe('cyan')
    })

    test('flat SCSS rule unaffected by adjacent nested rule', async () => {
        const scss = `
            .flat { background: green; }
            .outer { .inner { background: red; } }
        `
        const parsed = await extractSFCStyles([{ content: scss, lang: 'scss' }])
        expect(parsed['.flat']?.visualStyles?.bg).toBe('green')
        expect(parsed['.outer .inner']?.visualStyles?.bg).toBe('red')
    })
})
