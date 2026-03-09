/**
 * Render Correctness — Interactive State Rendering
 * spec.md § 10
 *
 * Verifies that :hover, :focus, :active pseudo-class styles change visual
 * output at the cell level. The buffer renderer resolves effective styles via
 * getEffectiveStyle() which requires an InteractionManager.
 *
 * State injection:
 *   hover  → setHovered(manager, root, node)  — fires synthetic mousemove hit test
 *   focus  → setFocused(manager, node)         — calls manager.setFocus(node)
 *   active → setActive(manager, root, node)    — fires synthetic mousedown hit test
 */

import { test, expect, describe } from 'bun:test'
import {
  h,
  buildAndLayout,
  renderTree,
  findNodeByClass,
  InteractionManager,
  setHovered,
  setFocused,
  setActive,
} from './helpers'

// ─── Default state: base style ────────────────────────────────────────────────

describe('default state renders base styles', () => {
  test('base background applied when no pseudo-state active', async () => {
    const { root, width, height } = await buildAndLayout(
      `
      .btn { width: 10; height: 2; background: blue; }
      .btn:hover { background: cyan; }
      `,
      h('div', { class: 'btn' }),
      20, 10
    )
    const manager = new InteractionManager()
    const buf = renderTree(root, width, height, manager)
    expect(buf.getCell(0, 0)?.background).toBe('blue')
  })
})

// ─── :hover ───────────────────────────────────────────────────────────────────

describe(':hover state overrides base background', () => {
  test('hovered node → hover background applied instead of base', async () => {
    const { root, width, height } = await buildAndLayout(
      `
      .btn { width: 10; height: 2; background: blue; }
      .btn:hover { background: cyan; }
      `,
      h('div', { class: 'btn' }),
      20, 10
    )
    const manager = new InteractionManager()
    const node = findNodeByClass(root, 'btn')
    if (node) setHovered(manager, root, node)
    const buf = renderTree(root, width, height, manager)
    expect(buf.getCell(0, 0)?.background).toBe('cyan')
  })

  test('hover background applied to all cells in element', async () => {
    const { root, width, height } = await buildAndLayout(
      `
      .item { width: 8; height: 2; }
      .item:hover { background: red; }
      `,
      h('div', { class: 'item' }),
      20, 10
    )
    const manager = new InteractionManager()
    const node = findNodeByClass(root, 'item')
    if (node) setHovered(manager, root, node)
    const buf = renderTree(root, width, height, manager)
    for (let y = 0; y < 2; y++) {
      for (let x = 0; x < 8; x++) {
        expect(buf.getCell(x, y)?.background).toBe('red')
      }
    }
  })
})

describe(':hover does not bleed to sibling', () => {
  test('hovering first sibling does not affect second sibling', async () => {
    const css = `
      .row { width: 30; height: 2; display: flex; }
      .a { width: 10; height: 2; background: blue; }
      .a:hover { background: cyan; }
      .b { width: 10; height: 2; background: red; }
      .b:hover { background: magenta; }
    `
    const { root, width, height } = await buildAndLayout(
      css,
      h('div', { class: 'row' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      ),
      30, 10
    )
    const manager = new InteractionManager()
    const nodeA = findNodeByClass(root, 'a')
    // Hover node a (at x=0, y=0)
    if (nodeA) setHovered(manager, root, nodeA)

    const buf = renderTree(root, width, height, manager)
    // a: hovered → cyan
    expect(buf.getCell(0, 0)?.background).toBe('cyan')
    // b: not hovered → still red
    expect(buf.getCell(10, 0)?.background).toBe('red')
  })
})

// ─── :focus ───────────────────────────────────────────────────────────────────

describe(':focus state applies focus styles', () => {
  test('focused node → focus background applied', async () => {
    const { root, width, height } = await buildAndLayout(
      `
      .input { width: 20; height: 1; background: black; }
      .input:focus { background: blue; }
      `,
      h('div', { class: 'input' }),
      30, 10
    )
    const manager = new InteractionManager()
    const node = findNodeByClass(root, 'input')
    if (node) setFocused(manager, node)
    const buf = renderTree(root, width, height, manager)
    expect(buf.getCell(0, 0)?.background).toBe('blue')
  })

  test('non-focused node → base style, not focus style', async () => {
    const { root, width, height } = await buildAndLayout(
      `
      .input { width: 20; height: 1; background: black; }
      .input:focus { background: blue; }
      `,
      h('div', { class: 'input' }),
      30, 10
    )
    const manager = new InteractionManager()
    // Do NOT set focus
    const buf = renderTree(root, width, height, manager)
    expect(buf.getCell(0, 0)?.background).toBe('black')
  })
})

// ─── :active ─────────────────────────────────────────────────────────────────

describe(':active state applies active styles', () => {
  test('active node → active background applied', async () => {
    const { root, width, height } = await buildAndLayout(
      `
      .btn { width: 10; height: 2; background: blue; }
      .btn:active { background: white; }
      `,
      h('div', { class: 'btn' }),
      20, 10
    )
    const manager = new InteractionManager()
    const node = findNodeByClass(root, 'btn')
    if (node) setActive(manager, root, node)
    const buf = renderTree(root, width, height, manager)
    expect(buf.getCell(0, 0)?.background).toBe('white')
  })
})

// ─── State cleared: base style restored ──────────────────────────────────────

describe('without state set, base style is always used', () => {
  test('manager with no state set → base background rendered', async () => {
    const { root, width, height } = await buildAndLayout(
      `
      .btn { width: 8; height: 2; background: blue; }
      .btn:hover { background: cyan; }
      `,
      h('div', { class: 'btn' }),
      20, 10
    )
    const manager = new InteractionManager()
    // Explicitly no state set
    const buf = renderTree(root, width, height, manager)
    expect(buf.getCell(0, 0)?.background).toBe('blue')
  })
})

// ─── Multiple states don't conflict ──────────────────────────────────────────

describe('focus on one element, hover on another: both apply correctly', () => {
  test('two elements: focus on first, hover on second', async () => {
    const css = `
      .col { width: 20; height: 6; display: flex; flex-direction: column; }
      .a { width: 20; height: 2; background: black; }
      .a:focus { background: blue; }
      .b { width: 20; height: 2; background: black; }
      .b:hover { background: red; }
    `
    const { root, width, height } = await buildAndLayout(
      css,
      h('div', { class: 'col' },
        h('div', { class: 'a' }),
        h('div', { class: 'b' })
      ),
      20, 10
    )
    const manager = new InteractionManager()
    const nodeA = findNodeByClass(root, 'a')
    const nodeB = findNodeByClass(root, 'b')
    if (nodeA) setFocused(manager, nodeA)
    if (nodeB) setHovered(manager, root, nodeB)

    const buf = renderTree(root, width, height, manager)
    // a: focused → blue
    expect(buf.getCell(0, 0)?.background).toBe('blue')
    // b: hovered → red (b starts at y=2)
    expect(buf.getCell(0, 2)?.background).toBe('red')
  })
})
