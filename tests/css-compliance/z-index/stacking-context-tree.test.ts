/**
 * Stacking Context Tree Building Tests
 *
 * Tests the buildStackingContextTree() function which constructs
 * the hierarchical stacking context structure from a LayoutNode tree.
 */

import { describe, it, expect } from "bun:test"
import { createLayoutNode } from "../../src/core/layout/tree"
import { buildStackingContextTree } from "../../src/core/layout/stacking-context"
import type { LayoutNode } from "../../src/core/layout/types"

function setupLayout(width: number, height: number) {
  const root = createLayoutNode({ type: "div" })
  root.layout = { x: 0, y: 0, width, height, padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, border: { width: 0 } }
  return root
}

describe("Stacking Context Tree Building", () => {
  describe("Root context", () => {
    it("root node creates root stacking context", () => {
      const root = setupLayout(100, 100)

      const context = buildStackingContextTree(root)

      expect(context.root).toBe(root)
      expect(context.parent).toBe(null)
    })

    it("flat children with no z-index all grouped as auto", () => {
      const root = setupLayout(100, 100)
      const child1 = createLayoutNode({ type: "div" })
      const child2 = createLayoutNode({ type: "div" })
      child1.parent = root
      child2.parent = root
      root.children = [child1, child2]

      const context = buildStackingContextTree(root)

      expect(context.childrenByZIndex.get("auto")).toEqual([child1, child2])
    })

    it("children with numeric z-index grouped separately", () => {
      const root = setupLayout(100, 100)
      const z1 = createLayoutNode({ type: "div", content: "z=1" })
      const z2 = createLayoutNode({ type: "div", content: "z=2" })
      const auto = createLayoutNode({ type: "div", content: "auto" })

      z1.parent = root
      z2.parent = root
      auto.parent = root

      z1.layoutProps.zIndex = 1
      z2.layoutProps.zIndex = 2

      root.children = [z1, auto, z2]

      const context = buildStackingContextTree(root)

      expect(context.childrenByZIndex.get(1)).toEqual([z1])
      expect(context.childrenByZIndex.get(2)).toEqual([z2])
      expect(context.childrenByZIndex.get("auto")).toEqual([auto])
    })

    it("negative z-index children grouped separately", () => {
      const root = setupLayout(100, 100)
      const neg1 = createLayoutNode({ type: "div" })
      const neg2 = createLayoutNode({ type: "div" })

      neg1.parent = root
      neg2.parent = root
      neg1.layoutProps.zIndex = -1
      neg2.layoutProps.zIndex = -2

      root.children = [neg1, neg2]

      const context = buildStackingContextTree(root)

      expect(context.childrenByZIndex.get(-1)).toEqual([neg1])
      expect(context.childrenByZIndex.get(-2)).toEqual([neg2])
    })
  })

  describe("Nested stacking contexts", () => {
    it("positioned child with z-index creates nested context", () => {
      const root = setupLayout(100, 100)
      const positioned = createLayoutNode({ type: "div", content: "Positioned" })
      positioned.parent = root
      positioned.layoutProps.position = "absolute"
      positioned.layoutProps.zIndex = 5
      positioned.layout = { x: 10, y: 10, width: 50, height: 50, padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, border: { width: 0 } }

      root.children = [positioned]

      const context = buildStackingContextTree(root)

      expect(context.nestedContexts).toHaveLength(1)
      expect(context.nestedContexts[0].root).toBe(positioned)
      expect(context.nestedContexts[0].parent).toBe(context)
    })

    it("nested context marked in root's children", () => {
      const root = setupLayout(100, 100)
      const positioned = createLayoutNode({ type: "div" })
      positioned.parent = root
      positioned.layoutProps.position = "absolute"
      positioned.layoutProps.zIndex = 1
      positioned.layout = { x: 0, y: 0, width: 50, height: 50, padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, border: { width: 0 } }

      root.children = [positioned]

      const context = buildStackingContextTree(root)

      expect(context.childrenByZIndex.get("nested")).toEqual([positioned])
    })

    it("multiple nested contexts tracked separately", () => {
      const root = setupLayout(100, 100)
      const pos1 = createLayoutNode({ type: "div" })
      const pos2 = createLayoutNode({ type: "div" })

      pos1.parent = root
      pos2.parent = root
      pos1.layoutProps.position = "absolute"
      pos1.layoutProps.zIndex = 1
      pos2.layoutProps.position = "absolute"
      pos2.layoutProps.zIndex = 2
      pos1.layout = { x: 0, y: 0, width: 50, height: 50, padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, border: { width: 0 } }
      pos2.layout = { x: 0, y: 0, width: 50, height: 50, padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, border: { width: 0 } }

      root.children = [pos1, pos2]

      const context = buildStackingContextTree(root)

      expect(context.nestedContexts).toHaveLength(2)
    })

    it("child node marked as creating stacking context", () => {
      const root = setupLayout(100, 100)
      const positioned = createLayoutNode({ type: "div" })
      positioned.parent = root
      positioned.layoutProps.position = "absolute"
      positioned.layoutProps.zIndex = 1
      positioned.layout = { x: 0, y: 0, width: 50, height: 50, padding: { top: 0, right: 0, bottom: 0, left: 0 }, margin: { top: 0, right: 0, bottom: 0, left: 0 }, border: { width: 0 } }

      root.children = [positioned]

      buildStackingContextTree(root)

      expect(positioned.createsStackingContext).toBe(true)
    })
  })

  describe("Render order computation", () => {
    it("render order starts with negative z-index", () => {
      const root = setupLayout(100, 100)
      const negZ = createLayoutNode({ type: "div" })
      negZ.parent = root
      negZ.layoutProps.zIndex = -1
      root.children = [negZ]

      const context = buildStackingContextTree(root)

      expect(context.renderOrder.length).toBeGreaterThan(0)
      expect(context.renderOrder[0].type).toBe("negative-z")
      expect(context.renderOrder[0].zIndex).toBe(-1)
    })

    it("render order has auto z-index before positive", () => {
      const root = setupLayout(100, 100)
      const auto = createLayoutNode({ type: "div" })
      const posZ = createLayoutNode({ type: "div" })
      auto.parent = root
      posZ.parent = root
      posZ.layoutProps.zIndex = 1
      root.children = [auto, posZ]

      const context = buildStackingContextTree(root)

      const autoIdx = context.renderOrder.findIndex((l) => l.type === "auto")
      const posIdx = context.renderOrder.findIndex((l) => l.type === "positive-z")

      expect(autoIdx).toBeLessThan(posIdx)
    })

    it("render order ends with text pass", () => {
      const root = setupLayout(100, 100)
      const context = buildStackingContextTree(root)

      expect(context.renderOrder[context.renderOrder.length - 1].pass).toBe("text")
    })

    it("all background passes come before text pass", () => {
      const root = setupLayout(100, 100)
      const child = createLayoutNode({ type: "div" })
      child.parent = root
      root.children = [child]

      const context = buildStackingContextTree(root)

      const textPassIdx = context.renderOrder.findIndex((l) => l.pass === "text")
      for (let i = 0; i < textPassIdx; i++) {
        expect(context.renderOrder[i].pass).toBe("background")
      }
    })

    it("negative z-index nodes render front-to-back (ascending order)", () => {
      const root = setupLayout(100, 100)
      const neg3 = createLayoutNode({ type: "div", content: "-3" })
      const neg1 = createLayoutNode({ type: "div", content: "-1" })
      const neg2 = createLayoutNode({ type: "div", content: "-2" })

      neg3.parent = root
      neg1.parent = root
      neg2.parent = root
      neg3.layoutProps.zIndex = -3
      neg1.layoutProps.zIndex = -1
      neg2.layoutProps.zIndex = -2

      root.children = [neg3, neg1, neg2]

      const context = buildStackingContextTree(root)

      const negLayers = context.renderOrder.filter((l) => l.type === "negative-z")
      expect(negLayers[0].zIndex).toBe(-3)
      expect(negLayers[1].zIndex).toBe(-2)
      expect(negLayers[2].zIndex).toBe(-1)
    })

    it("positive z-index nodes render back-to-front (ascending order)", () => {
      const root = setupLayout(100, 100)
      const pos3 = createLayoutNode({ type: "div" })
      const pos1 = createLayoutNode({ type: "div" })
      const pos2 = createLayoutNode({ type: "div" })

      pos3.parent = root
      pos1.parent = root
      pos2.parent = root
      pos3.layoutProps.zIndex = 3
      pos1.layoutProps.zIndex = 1
      pos2.layoutProps.zIndex = 2

      root.children = [pos3, pos1, pos2]

      const context = buildStackingContextTree(root)

      const posLayers = context.renderOrder.filter((l) => l.type === "positive-z")
      expect(posLayers[0].zIndex).toBe(1)
      expect(posLayers[1].zIndex).toBe(2)
      expect(posLayers[2].zIndex).toBe(3)
    })
  })
})
