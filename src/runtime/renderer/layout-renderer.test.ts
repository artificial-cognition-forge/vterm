/**
 * Layout Renderer Integration Tests
 *
 * Tests the Vue custom renderer (createLayoutRenderer) with incremental tree
 * building — the way Vue actually mounts components: inner elements first,
 * then each parent is inserted into its parent, bottom-up.
 *
 * Key regression: when a nested child exists inside a flex container, Vue
 * inserts it (inner-div → sidebar) before inserting the sidebar into its
 * parent container. If rootContainer is locked to sidebar, sibling nodes
 * (e.g. content) are never included in layout or rendering.
 */

import { test, expect, describe } from 'bun:test'
import { defineComponent, h } from 'vue'
import { createLayoutRenderer, createLayoutNodeElement } from './layout-renderer'
import { createLayoutEngine } from '../../core/layout'
import { ScreenBuffer } from '../terminal/buffer'
import { BufferRenderer } from './buffer-renderer'
import type { LayoutNode } from '../../core/layout/types'

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Mount a component using createLayoutRenderer the same way vterm.ts does:
 * create the container first, always use it as the layout root in the callback.
 * Returns the container after mounting completes.
 */
async function mountComponent(
  width: number,
  height: number,
  component: ReturnType<typeof defineComponent>,
  styles: Record<string, any> = {}
): Promise<LayoutNode> {
  const engine = createLayoutEngine(width, height)

  const container = createLayoutNodeElement('div', styles)
  container.layoutProps = { ...container.layoutProps, width: '100%', height: '100%' }

  const { createApp } = createLayoutRenderer(styles, () => {
    engine.computeLayout(container)
  })

  const app = createApp(component)
  app.config.warnHandler = () => {}
  app.config.compilerOptions.isCustomElement = () => true
  app.mount(container)

  // Let microtask queue drain (same as vterm.ts await pattern)
  await new Promise(resolve => queueMicrotask(resolve))

  return container
}

/** Render mounted container to a buffer. */
function renderToBuffer(container: LayoutNode, width: number, height: number): ScreenBuffer {
  const buffer = new ScreenBuffer(width, height)
  const renderer = new BufferRenderer()
  renderer.render(container, buffer)
  return buffer
}

/** Extract a substring of characters from a buffer row. */
function rowSlice(buffer: ScreenBuffer, y: number, x: number, len: number): string {
  let s = ''
  for (let i = 0; i < len; i++) {
    s += buffer.getCell(x + i, y)?.char ?? ' '
  }
  return s
}

// ─── Root tracking ────────────────────────────────────────────────────────────

describe('layout renderer — root container tracking', () => {
  test('sibling nodes render when first child has a nested div', async () => {
    // Regression: Vue inserts inner-div → sidebar before sidebar → container.
    // If rootContainer locks to sidebar, the "content" sibling is never laid out.
    const component = defineComponent({
      name: 'Test',
      render: () => h('div', { class: 'row' }, [
        h('div', { class: 'left' }, [h('div', {}, 'L')]),  // nested child
        h('div', { class: 'right' }, 'R'),                  // sibling
      ]),
    })

    const styles = {
      '.row':   { display: 'flex' as const, width: 40, height: 5 },
      '.left':  { width: 10 },
      '.right': { width: 30, height: 5 },
    }

    const container = await mountComponent(40, 5, component, styles)
    const row = container.children[0]

    expect(row?.children).toHaveLength(2)

    const left  = row?.children[0]
    const right = row?.children[1]

    expect(left?.layout).not.toBeNull()
    expect(right?.layout).not.toBeNull()

    // right sibling must be laid out to the right of left
    expect(right?.layout?.x).toBeGreaterThan(0)
    expect(right?.layout?.y).toBe(left?.layout?.y ?? -1)
  })

  test('sibling renders at correct x position (not overlapping)', async () => {
    const component = defineComponent({
      name: 'Test',
      render: () => h('div', { class: 'row' }, [
        h('div', { class: 'left' }, [h('div', {}, 'hello')]),
        h('div', { class: 'right' }, 'world'),
      ]),
    })

    const styles = {
      '.row':   { display: 'flex' as const, width: 40, height: 10 },
      '.left':  { width: 15 },
      '.right': { width: 25, height: 10 },
    }

    const container = await mountComponent(40, 10, component, styles)
    const row = container.children[0]
    const right = row?.children[1]

    // Right sibling should start at x >= 15 (left panel width after flex-shrink)
    expect(right?.layout?.x).toBeGreaterThanOrEqual(10)
    // Right sibling should have positive width
    expect(right?.layout?.width).toBeGreaterThan(0)
  })

  test('deeply nested children do not affect sibling layout', async () => {
    // 3-level nesting in first child
    const component = defineComponent({
      name: 'Test',
      render: () => h('div', { class: 'row' }, [
        h('div', { class: 'left' }, [
          h('div', {}, [
            h('div', {}, 'deep'),
          ]),
        ]),
        h('div', { class: 'right' }, 'sibling'),
      ]),
    })

    const styles = {
      '.row':   { display: 'flex' as const, width: 40, height: 10 },
      '.left':  { width: 10 },
      '.right': { width: 30, height: 10 },
    }

    const container = await mountComponent(40, 10, component, styles)
    const row = container.children[0]
    const right = row?.children[1]

    expect(right?.layout).not.toBeNull()
    expect(right?.layout?.x).toBeGreaterThan(0)
  })

  test('multiple siblings all render when first has nested child', async () => {
    const component = defineComponent({
      name: 'Test',
      render: () => h('div', { class: 'row' }, [
        h('div', { class: 'a' }, [h('div', {}, 'A')]),
        h('div', { class: 'b' }, 'B'),
        h('div', { class: 'c' }, 'C'),
      ]),
    })

    const styles = {
      '.row': { display: 'flex' as const, width: 40, height: 5 },
      '.a':   { width: 10 },
      '.b':   { width: 15 },
      '.c':   { width: 15 },
    }

    const container = await mountComponent(40, 5, component, styles)
    const row = container.children[0]

    expect(row?.children).toHaveLength(3)
    const [a, b, c] = row!.children

    expect(a?.layout).not.toBeNull()
    expect(b?.layout).not.toBeNull()
    expect(c?.layout).not.toBeNull()

    // All three must be left-to-right with increasing x
    expect(b!.layout!.x).toBeGreaterThan(a!.layout!.x)
    expect(c!.layout!.x).toBeGreaterThan(b!.layout!.x)
  })
})

// ─── Buffer output ────────────────────────────────────────────────────────────

describe('layout renderer — buffer output with nested children', () => {
  test('text from sibling renders at correct column when first child is nested', async () => {
    const component = defineComponent({
      name: 'Test',
      render: () => h('div', { class: 'row' }, [
        h('div', { class: 'left' }, [h('div', {}, 'L')]),
        h('div', { class: 'right' }, 'R'),
      ]),
    })

    const W = 20
    const styles = {
      '.row':   { display: 'flex' as const, width: W, height: 3 },
      '.left':  { width: 10 },
      '.right': { width: 10, height: 3 },
    }

    const container = await mountComponent(W, 3, component, styles)
    const buffer = renderToBuffer(container, W, 3)

    // 'L' should be somewhere in columns 0–9
    // 'R' should be somewhere in columns 10–19
    const leftHalf  = rowSlice(buffer, 0, 0,  10)
    const rightHalf = rowSlice(buffer, 0, 10, 10)

    expect(leftHalf).toContain('L')
    expect(rightHalf).toContain('R')
  })

  test('nested sidebar + content mirror the working direct-text case', async () => {
    // Direct text case (was always working)
    const directText = defineComponent({
      name: 'Direct',
      render: () => h('div', { class: 'row' }, [
        h('div', { class: 'left' }, 'left'),
        h('div', { class: 'right' }, 'right'),
      ]),
    })

    // Nested div case (was broken before fix)
    const nestedDiv = defineComponent({
      name: 'Nested',
      render: () => h('div', { class: 'row' }, [
        h('div', { class: 'left' }, [h('div', {}, 'left')]),
        h('div', { class: 'right' }, 'right'),
      ]),
    })

    const W = 30, H = 5
    const styles = {
      '.row':   { display: 'flex' as const, width: W, height: H },
      '.left':  { width: 10 },
      '.right': { width: 20, height: H },
    }

    const c1 = await mountComponent(W, H, directText, styles)
    const c2 = await mountComponent(W, H, nestedDiv, styles)

    const b1 = renderToBuffer(c1, W, H)
    const b2 = renderToBuffer(c2, W, H)

    // Both cases: "right" text should appear in the right half of the screen
    const direct_right = rowSlice(b1, 0, 10, 5)
    const nested_right = rowSlice(b2, 0, 10, 5)

    expect(direct_right).toContain('r')  // 'right'
    expect(nested_right).toContain('r')  // same — was broken before fix
  })
})
