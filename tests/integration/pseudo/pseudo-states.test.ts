/**
 * INT-PSEUDO: Pseudo States (:hover, :focus, :active)
 */

import { test, expect, describe } from 'bun:test'
import { buildAndLayout, renderTree, cellBg, cellColor, setHovered, setFocused, setActive, clearHovered } from '../helpers'
import { h, InteractionManager, type LayoutNode } from '../helpers'

describe('Pseudo States', () => {
  test(':hover pseudo class (requires interaction manager)', async () => {
    const { root } = await buildAndLayout(
      `.box { width: 10; height: 2; background: blue; color: white; }
       .box:hover { background: green; color: yellow; }`,
      h('div', { class: 'box' }, 'Text')
    )

    const manager = new InteractionManager()

    // Render without hover state
    const bufNormal = renderTree(root, 80, 24, manager)
    expect(cellBg(bufNormal, 0, 0)).toBe('blue')
    expect(cellColor(bufNormal, 0, 0)).toBe('white')

    // Render with hover state
    const boxNode = root.children[0] as LayoutNode
    setHovered(manager, root, boxNode)
    const bufHover = renderTree(root, 80, 24, manager)
    expect(cellBg(bufHover, 0, 0)).toBe('green')
    expect(cellColor(bufHover, 0, 0)).toBe('yellow')
  })

  test(':focus pseudo class', async () => {
    const { root } = await buildAndLayout(
      `input { width: 15; height: 1; background: grey; }
       input:focus { background: cyan; border-color: white; }`,
      h('input')
    )

    const manager = new InteractionManager()

    // Without focus
    const bufNoFocus = renderTree(root, 80, 24, manager)
    expect(cellBg(bufNoFocus, 0, 0)).toBe('grey')

    // With focus
    const inputNode = root.children[0] as LayoutNode
    setFocused(manager, inputNode)
    const bufFocus = renderTree(root, 80, 24, manager)
    expect(cellBg(bufFocus, 0, 0)).toBe('cyan')
  })

  test(':active pseudo class', async () => {
    const { root } = await buildAndLayout(
      `button { width: 10; height: 1; background: blue; }
       button:active { background: red; }`,
      h('button', {}, 'Click')
    )

    const manager = new InteractionManager()

    // Without active
    const bufNormal = renderTree(root, 80, 24, manager)
    expect(cellBg(bufNormal, 0, 0)).toBe('blue')

    // With active (simulate mousedown)
    const buttonNode = root.children[0] as LayoutNode
    setActive(manager, root, buttonNode)
    const bufActive = renderTree(root, 80, 24, manager)
    expect(cellBg(bufActive, 0, 0)).toBe('red')
  })

  test('pseudo-state does not bleed to siblings', async () => {
    const { root } = await buildAndLayout(
      `.box { width: 10; height: 1; }
       .box:hover { background: green; }`,
      h(
        'div',
        { style: 'display: flex; width: 25; height: 1;' },
        h('div', { class: 'box' }, 'A'),
        h('div', { class: 'box' }, 'B')
      )
    )

    const manager = new InteractionManager()

    // Hover first child
    const firstChild = root.children[0]?.children[0] as LayoutNode
    setHovered(manager, root, firstChild)
    const buf = renderTree(root, 80, 24, manager)

    // First box should be hovered
    expect(cellBg(buf, 0, 0)).toBe('green')

    // Second box should not be hovered
    expect(cellBg(buf, 10, 0)).not.toBe('green')
  })

  test('state removed, base style restored', async () => {
    const { root } = await buildAndLayout(
      `.box { width: 10; height: 1; background: blue; }
       .box:hover { background: green; }`,
      h('div', { class: 'box' })
    )

    const manager = new InteractionManager()
    const boxNode = root.children[0] as LayoutNode

    // Apply hover
    setHovered(manager, root, boxNode)
    let buf = renderTree(root, 80, 24, manager)
    expect(cellBg(buf, 0, 0)).toBe('green')

    // Clear hover (move mouse away)
    clearHovered(manager, root)
    buf = renderTree(root, 80, 24, manager)
    expect(cellBg(buf, 0, 0)).toBe('blue')
  })
})
