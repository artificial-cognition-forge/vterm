/**
 * Layout Engine Phase Breakdown
 * Measures each phase of the layout pipeline separately to identify hotspots
 */

import { describe, it, expect } from "bun:test"
import { h } from "vue"
import { createLayoutEngine } from "../../src/core/layout"
import { transformCSSToLayout } from "../../src/core/css"

describe("Layout Engine Breakdown", () => {
  it("should profile large grid layout phases", async () => {
    // Create a 16×16 grid of flex items (similar to large app benchmark)
    const children = []
    for (let i = 0; i < 16; i++) {
      const row = []
      for (let j = 0; j < 16; j++) {
        row.push(h("div", { class: "grid-item" }, `Item ${i}-${j}`))
      }
      children.push(h("div", { class: "flex-row" }, row))
    }

    const root = h("div", { class: "container" }, children)

    const css = `
      .container { display: flex; flex-direction: column; width: 220; height: 50; gap: 0; }
      .flex-row { display: flex; flex-direction: row; gap: 0; }
      .grid-item { flex: 1; }
    `

    const engine = createLayoutEngine(220, 50)
    const styles = await transformCSSToLayout(css)

    // Warm up
    for (let i = 0; i < 3; i++) {
      engine.buildLayoutTree(root, styles)
      const tree = engine.buildLayoutTree(root, styles)
      engine.computeLayout(tree)
    }

    // Measure buildLayoutTree
    const buildStart = performance.now()
    for (let i = 0; i < 10; i++) {
      engine.buildLayoutTree(root, styles)
    }
    const buildTime = (performance.now() - buildStart) / 10

    // Measure computeLayout
    const tree = engine.buildLayoutTree(root, styles)
    const computeStart = performance.now()
    for (let i = 0; i < 10; i++) {
      engine.computeLayout(tree)
    }
    const computeTime = (performance.now() - computeStart) / 10

    console.log("\nLayout Engine Phase Breakdown (16×16 grid)")
    console.log("─".repeat(50))
    console.log(`buildLayoutTree:  ${buildTime.toFixed(3)}ms`)
    console.log(`computeLayout:    ${computeTime.toFixed(3)}ms`)
    console.log(`Total:            ${(buildTime + computeTime).toFixed(3)}ms`)
    console.log("─".repeat(50))

    expect(buildTime).toBeLessThan(1) // CSS resolution
    expect(computeTime).toBeLessThan(2) // Main bottleneck
  })

  it("should profile flex container heavy layout", async () => {
    // Create nested flex containers (like navigation + content)
    const children = []
    for (let i = 0; i < 5; i++) {
      const subchildren = []
      for (let j = 0; j < 10; j++) {
        subchildren.push(h("div", { class: "item" }, `${i}-${j}`))
      }
      children.push(h("div", { class: "flex-col" }, subchildren))
    }

    const root = h("div", { class: "main-flex" }, children)

    const css = `
      .main-flex { display: flex; flex-direction: row; width: 220; height: 50; }
      .flex-col { display: flex; flex-direction: column; flex: 1; }
      .item { flex: 1; }
    `

    const engine = createLayoutEngine(220, 50)
    const styles = await transformCSSToLayout(css)

    // Warm up
    for (let i = 0; i < 3; i++) {
      const tree = engine.buildLayoutTree(root, styles)
      engine.computeLayout(tree)
    }

    // Measure
    const tree = engine.buildLayoutTree(root, styles)
    const computeStart = performance.now()
    for (let i = 0; i < 10; i++) {
      engine.computeLayout(tree)
    }
    const computeTime = (performance.now() - computeStart) / 10

    console.log(`\nFlex-heavy layout computeLayout: ${computeTime.toFixed(3)}ms`)
    expect(computeTime).toBeLessThan(1)
  })
})
