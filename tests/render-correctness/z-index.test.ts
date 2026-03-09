/**
 * Z-Index Rendering Tests
 *
 * Tests that verify z-index properly layers overlapping elements
 * with higher z-index elements completely obscuring lower ones.
 */

import { describe, it, expect } from 'bun:test'
import { h } from 'vue'
import { ScreenBuffer } from '../../src/runtime/terminal/buffer'
import { BufferRenderer } from '../../src/runtime/renderer/buffer-renderer'
import { createLayoutEngine } from '../../src/core/layout'
import { transformCSSToLayout } from '../../src/core/css'

describe('Z-index rendering', () => {
  it('higher z-index element completely obscures lower', async () => {
    // Create two overlapping absolutely positioned boxes
    // Bottom: z-index 1, green background, full screen
    // Top: z-index 10, red background, overlapping area (5,2,10,8)
    const css = `
      .bottom { position: absolute; left: 0; top: 0; width: 20; height: 10; background: green; z-index: 1; }
      .top { position: absolute; left: 5; top: 2; width: 10; height: 8; background: red; z-index: 10; }
    `

    const tree = h('div', {},
      h('div', { class: 'bottom' }),
      h('div', { class: 'top' })
    )

    const engine = createLayoutEngine(20, 10)
    const styles = await transformCSSToLayout(css)
    const root = engine.buildLayoutTree(tree, styles)
    engine.computeLayout(root)

    const buffer = new ScreenBuffer(20, 10)
    const renderer = new BufferRenderer()
    renderer.render(root, buffer)

    // Check that overlapping area shows red (high z-index), not green (low z-index)
    // Overlapping area is x=5..14, y=2..9
    expect(buffer.getCell(5, 2)?.background).toBe('red')
    expect(buffer.getCell(10, 5)?.background).toBe('red')
    expect(buffer.getCell(14, 8)?.background).toBe('red')

    // Check that non-overlapping green areas still show green
    expect(buffer.getCell(2, 1)?.background).toBe('green')
    expect(buffer.getCell(0, 5)?.background).toBe('green')

    // Check that area outside both boxes is empty
    expect(buffer.getCell(18, 0)?.background).toBeNull()
  })

  it('negative z-index renders behind positive', async () => {
    // Create three layers:
    // Bottom: z-index -1, blue background
    // Middle: z-index 0, green background, overlapping
    // Top: z-index 10, red background, overlapping
    const css = `
      .back { position: absolute; left: 0; top: 0; width: 15; height: 8; background: blue; z-index: -1; }
      .mid { position: absolute; left: 5; top: 2; width: 10; height: 6; background: green; z-index: 0; }
      .front { position: absolute; left: 10; top: 4; width: 8; height: 4; background: red; z-index: 10; }
    `

    const tree = h('div', {},
      h('div', { class: 'back' }),
      h('div', { class: 'mid' }),
      h('div', { class: 'front' })
    )

    const engine = createLayoutEngine(20, 10)
    const styles = transformCSSToLayout(css)
    const root = engine.buildLayoutTree(tree, styles)
    engine.computeLayout(root)

    const buffer = new ScreenBuffer(20, 10)
    const renderer = new BufferRenderer()
    renderer.render(root, buffer)

    // Back area (not covered by others): blue
    expect(buffer.getCell(2, 1)?.background).toBe('blue')

    // Mid overlapping back (not covered by front): green
    expect(buffer.getCell(7, 3)?.background).toBe('green')

    // Front area (highest z): red
    expect(buffer.getCell(12, 5)?.background).toBe('red')
  })

  it('z-index: auto defaults to 0', async () => {
    // Elements without z-index should default to 0
    const css = `
      .zeroAuto { position: absolute; left: 0; top: 0; width: 10; height: 5; background: blue; z-index: auto; }
      .zeroDefault { position: absolute; left: 5; top: 2; width: 10; height: 5; background: red; }
    `

    const tree = h('div', {},
      h('div', { class: 'zeroAuto' }),
      h('div', { class: 'zeroDefault' })
    )

    const engine = createLayoutEngine(20, 10)
    const styles = transformCSSToLayout(css)
    const root = engine.buildLayoutTree(tree, styles)
    engine.computeLayout(root)

    const buffer = new ScreenBuffer(20, 10)
    const renderer = new BufferRenderer()
    renderer.render(root, buffer)

    // Both have z-index 0, rendered in DOM order (first div first, then red on top)
    // So overlapping area should show red (rendered second)
    expect(buffer.getCell(7, 3)?.background).toBe('red')
  })

  it('children inherit parent z-index layering', async () => {
    // Parent at z-index 1 with child at z-index 5 (relative to parent, not global)
    // Sibling at z-index 10 should obscure both parent and child
    const css = `
      .parent { position: absolute; left: 0; top: 0; width: 15; height: 8; background: blue; z-index: 1; }
      .child { position: absolute; left: 2; top: 2; width: 5; height: 4; background: cyan; z-index: 5; }
      .sibling { position: absolute; left: 10; top: 3; width: 8; height: 4; background: red; z-index: 10; }
    `

    const tree = h('div', {},
      h('div', { class: 'parent' }, h('div', { class: 'child' })),
      h('div', { class: 'sibling' })
    )

    const engine = createLayoutEngine(20, 10)
    const styles = transformCSSToLayout(css)
    const root = engine.buildLayoutTree(tree, styles)
    engine.computeLayout(root)

    const buffer = new ScreenBuffer(20, 10)
    const renderer = new BufferRenderer()
    renderer.render(root, buffer)

    // Sibling at z=10 completely covers parent (z=1) and child (z=5)
    expect(buffer.getCell(12, 4)?.background).toBe('red')

    // Child is visible where sibling doesn't overlap
    expect(buffer.getCell(3, 3)?.background).toBe('cyan')

    // Parent blue is visible where neither child nor sibling covers
    expect(buffer.getCell(1, 1)?.background).toBe('blue')
  })

  it('text from low z-index does not show through high z-index background', async () => {
    // Test that a higher z-index box completely obscures lower text
    const css = `
      .bottom { position: absolute; left: 0; top: 0; width: 15; height: 5; color: white; }
      .top { position: absolute; left: 5; top: 1; width: 10; height: 4; background: black; z-index: 5; }
    `

    const tree = h('div', {},
      h('div', { class: 'bottom' }, 'ABCDEFGHIJKLMNOPQRST'),
      h('div', { class: 'top' })
    )

    const engine = createLayoutEngine(20, 10)
    const styles = transformCSSToLayout(css)
    const root = engine.buildLayoutTree(tree, styles)
    engine.computeLayout(root)

    const buffer = new ScreenBuffer(20, 10)
    const renderer = new BufferRenderer()
    renderer.render(root, buffer)

    // In the overlapping area (x=5..14, y=1..4), should be empty/space from top box
    // not text from bottom
    expect(buffer.getCell(7, 2)?.char).toBe(' ')
    expect(buffer.getCell(10, 3)?.char).toBe(' ')

    // Outside the overlap, bottom text should be visible
    expect(buffer.getCell(1, 0)?.char).toBe('B')
    expect(buffer.getCell(2, 0)?.char).toBe('C')
  })

  it('large negative z-index renders behind everything', async () => {
    // Element with z-index -100 should be completely hidden by z-index 0
    const css = `
      .veryBack { position: absolute; left: 0; top: 0; width: 20; height: 10; background: purple; z-index: -100; }
      .normal { position: absolute; left: 5; top: 2; width: 10; height: 6; background: cyan; z-index: 0; }
    `

    const tree = h('div', {},
      h('div', { class: 'veryBack' }),
      h('div', { class: 'normal' })
    )

    const engine = createLayoutEngine(20, 10)
    const styles = transformCSSToLayout(css)
    const root = engine.buildLayoutTree(tree, styles)
    engine.computeLayout(root)

    const buffer = new ScreenBuffer(20, 10)
    const renderer = new BufferRenderer()
    renderer.render(root, buffer)

    // Overlapping area should show normal (z=0), not purple (z=-100)
    expect(buffer.getCell(8, 4)?.background).toBe('cyan')

    // Non-overlapping purple area (outside normal) should be visible
    expect(buffer.getCell(2, 1)?.background).toBe('purple')
  })

  it('same z-index renders in DOM order', async () => {
    // When two elements have the same z-index, render order is DOM order
    const css = `
      .first { position: absolute; left: 0; top: 0; width: 15; height: 8; background: blue; z-index: 5; }
      .second { position: absolute; left: 8; top: 2; width: 10; height: 6; background: red; z-index: 5; }
    `

    const tree = h('div', {},
      h('div', { class: 'first' }),
      h('div', { class: 'second' })
    )

    const engine = createLayoutEngine(20, 10)
    const styles = transformCSSToLayout(css)
    const root = engine.buildLayoutTree(tree, styles)
    engine.computeLayout(root)

    const buffer = new ScreenBuffer(20, 10)
    const renderer = new BufferRenderer()
    renderer.render(root, buffer)

    // Overlapping area: second rendered after first, so red on top
    expect(buffer.getCell(10, 4)?.background).toBe('red')

    // Non-overlapping first area: blue
    expect(buffer.getCell(2, 1)?.background).toBe('blue')
  })
})
