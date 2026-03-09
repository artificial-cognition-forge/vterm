/**
 * Stacking Context Detection Tests
 *
 * Tests the detectStackingContext() function which determines
 * whether a node creates a new stacking context.
 */

import { describe, it, expect } from "bun:test"
import { createLayoutNode } from "../../src/core/layout/tree"
import { detectStackingContext } from "../../src/core/layout/stacking-context"
import type { LayoutNode } from "../../src/core/layout/types"

describe("Stacking Context Detection", () => {
  describe("Root element", () => {
    it("root node (parent === null) always creates stacking context", () => {
      const root = createLayoutNode({
        type: "div",
        content: "Root",
      })

      expect(detectStackingContext(root)).toBe(true)
    })
  })

  describe("Positioned elements with z-index", () => {
    it("positioned element with explicit numeric z-index creates context", () => {
      const root = createLayoutNode({ type: "div" })
      const positioned = createLayoutNode({
        type: "div",
        content: "Positioned",
        style: { fg: "blue" },
      })
      positioned.parent = root
      positioned.layoutProps.position = "absolute"
      positioned.layoutProps.zIndex = 1

      expect(detectStackingContext(positioned)).toBe(true)
    })

    it("positioned element with z-index: 0 creates context", () => {
      const root = createLayoutNode({ type: "div" })
      const positioned = createLayoutNode({ type: "div" })
      positioned.parent = root
      positioned.layoutProps.position = "absolute"
      positioned.layoutProps.zIndex = 0

      expect(detectStackingContext(positioned)).toBe(true)
    })

    it("positioned element with negative z-index creates context", () => {
      const root = createLayoutNode({ type: "div" })
      const positioned = createLayoutNode({ type: "div" })
      positioned.parent = root
      positioned.layoutProps.position = "absolute"
      positioned.layoutProps.zIndex = -1

      expect(detectStackingContext(positioned)).toBe(true)
    })

    it("positioned element with z-index: auto does NOT create context", () => {
      const root = createLayoutNode({ type: "div" })
      const positioned = createLayoutNode({ type: "div" })
      positioned.parent = root
      positioned.layoutProps.position = "absolute"
      positioned.layoutProps.zIndex = "auto"

      expect(detectStackingContext(positioned)).toBe(false)
    })

    it("positioned element without z-index does NOT create context", () => {
      const root = createLayoutNode({ type: "div" })
      const positioned = createLayoutNode({ type: "div" })
      positioned.parent = root
      positioned.layoutProps.position = "absolute"

      expect(detectStackingContext(positioned)).toBe(false)
    })

    it("non-positioned element with z-index does NOT create context", () => {
      const root = createLayoutNode({ type: "div" })
      const nonPositioned = createLayoutNode({ type: "div" })
      nonPositioned.parent = root
      nonPositioned.layoutProps.zIndex = 5

      expect(detectStackingContext(nonPositioned)).toBe(false)
    })
  })

  describe("Opacity stacking contexts", () => {
    it("element with opacity < 1 creates context", () => {
      const root = createLayoutNode({ type: "div" })
      const element = createLayoutNode({ type: "div" })
      element.parent = root
      element.style.opacity = 0.5

      expect(detectStackingContext(element)).toBe(true)
    })

    it("element with opacity === 0 creates context", () => {
      const root = createLayoutNode({ type: "div" })
      const element = createLayoutNode({ type: "div" })
      element.parent = root
      element.style.opacity = 0

      expect(detectStackingContext(element)).toBe(true)
    })

    it("element with opacity === 1 does NOT create context", () => {
      const root = createLayoutNode({ type: "div" })
      const element = createLayoutNode({ type: "div" })
      element.parent = root
      element.style.opacity = 1

      expect(detectStackingContext(element)).toBe(false)
    })

    it("element with no opacity does NOT create context", () => {
      const root = createLayoutNode({ type: "div" })
      const element = createLayoutNode({ type: "div" })
      element.parent = root

      expect(detectStackingContext(element)).toBe(false)
    })
  })

  describe("Non-stacking contexts", () => {
    it("regular div without position or opacity does NOT create context", () => {
      const root = createLayoutNode({ type: "div" })
      const child = createLayoutNode({ type: "div", content: "Child" })
      child.parent = root

      expect(detectStackingContext(child)).toBe(false)
    })

    it("positioned relative without z-index does NOT create context", () => {
      const root = createLayoutNode({ type: "div" })
      const positioned = createLayoutNode({ type: "div" })
      positioned.parent = root
      positioned.layoutProps.position = "relative"

      expect(detectStackingContext(positioned)).toBe(false)
    })
  })
})
