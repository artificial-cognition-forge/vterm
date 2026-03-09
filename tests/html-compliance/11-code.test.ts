/**
 * HTML Compliance — Code Element
 *
 * Tests: code
 *
 * The code element renders syntax-highlighted content. When the highlighter
 * is not ready, it falls back to rendering dimmed raw text. The code element
 * skips children rendering since it handles content directly.
 */

import { test, expect, describe } from "bun:test"
import "../../src/runtime/elements/code" // registers code behavior
import { h, renderCSS, rowSlice, cellColor, cellBg } from "./helpers"

// ─── Basic rendering ────────────────────────────────────────────────────────────

describe("code: basic rendering", () => {
    test("renders text content inside code element", async () => {
        const buf = await renderCSS(
            `.code { width: 20; height: 3; }`,
            h("code", { class: "code" }, "const x = 1")
        )
        expect(rowSlice(buf, 0, 0, 11)).toBe("const x = 1")
    })

    test("renders multiline content", async () => {
        const buf = await renderCSS(
            `.code { width: 20; height: 5; }`,
            h("code", { class: "code" }, "line1\nline2\nline3")
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe("line1")
        expect(rowSlice(buf, 1, 0, 5)).toBe("line2")
        expect(rowSlice(buf, 2, 0, 5)).toBe("line3")
    })

    test("renders with lang attribute", async () => {
        const buf = await renderCSS(
            `.code { width: 20; height: 3; }`,
            h("code", { class: "code", lang: "typescript" }, "const x = 1")
        )
        expect(rowSlice(buf, 0, 0, 11)).toBe("const x = 1")
    })
})

describe("code: intrinsic sizing", () => {
    test("renders without explicit width/height", async () => {
        const buf = await renderCSS("", h("code", {}, "hello world"))
        expect(rowSlice(buf, 0, 0, 11)).toBe("hello world")
    })

    test("auto height fits multiline content", async () => {
        const buf = await renderCSS("", h("code", {}, "line1\nline2"))
        expect(rowSlice(buf, 0, 0, 5)).toBe("line1")
        expect(rowSlice(buf, 1, 0, 5)).toBe("line2")
    })
})

// ─── Text trimming ────────────────────────────────────────────────────────────────

describe("code: text trimming and indentation", () => {
    test("strips leading blank lines", async () => {
        const buf = await renderCSS(
            `.code { width: 20; height: 5; }`,
            h("code", { class: "code" }, "\n\n\nfunction foo() {}")
        )
        expect(rowSlice(buf, 0, 0, 14)).toBe("function foo()")
    })

    test("strips trailing blank lines", async () => {
        const buf = await renderCSS(
            `.code { width: 20; height: 5; }`,
            h("code", { class: "code" }, "function foo() {}\n\n\n")
        )
        expect(rowSlice(buf, 0, 0, 14)).toBe("function foo()")
    })

    test("removes common leading indentation", async () => {
        // Note: Vue's h() strips leading whitespace from the first line of string
        // children, so this tests the internal dedent logic with content that has
        // internal indentation (line 2 has more indent than line 1).
        const buf = await renderCSS(
            `.code { width: 20; height: 5; }`,
            h("code", { class: "code" }, "function foo() {\n    return 1\n}")
        )
        // After dedenting, line 2 should have 0 indent (4 - 4 = 0)
        expect(rowSlice(buf, 0, 0, 14)).toBe("function foo()")
        expect(rowSlice(buf, 1, 0, 8)).toBe("return 1")
    })
})

// ─── Padding and positioning ────────────────────────────────────────────────────

describe("code: padding and positioning", () => {
    test("renders text with padding-left", async () => {
        const buf = await renderCSS(
            `.code { width: 20; height: 3; padding-left: 2; }`,
            h("code", { class: "code" }, "code")
        )
        expect(rowSlice(buf, 0, 0, 2)).toBe("  ")
        expect(rowSlice(buf, 0, 2, 4)).toBe("code")
    })

    test("renders text with padding-top", async () => {
        const buf = await renderCSS(
            `.code { width: 20; height: 5; padding-top: 1; }`,
            h("code", { class: "code" }, "line1\nline2")
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe("     ")
        expect(rowSlice(buf, 1, 0, 5)).toBe("line1")
        expect(rowSlice(buf, 2, 0, 5)).toBe("line2")
    })
})

// ─── Border handling ─────────────────────────────────────────────────────────────

describe("code: borders", () => {
    test("renders with border", async () => {
        const buf = await renderCSS(
            `.code { width: 10; height: 3; border: 1px solid white; }`,
            h("code", { class: "code" }, "x")
        )
        // Top-left corner should be border character
        const tl = buf.getCell(0, 0)
        expect(tl?.char).toBe("┌")
    })

    test("content respects border and padding", async () => {
        // height: 5 gives contentHeight = 5 - 2*1 - 1 - 1 = 1 (enough for 1 line)
        const buf = await renderCSS(
            `.code { width: 10; height: 5; border: 1px solid white; padding: 1; }`,
            h("code", { class: "code" }, "test")
        )
        // Content starts after border (1) + padding (1) = x:2, y:2
        expect(rowSlice(buf, 2, 2, 4)).toBe("test")
    })
})

// ─── Clipping ───────────────────────────────────────────────────────────────────

describe("code: clipping", () => {
    test("long lines are clipped to content width", async () => {
        const buf = await renderCSS(
            `.code { width: 5; height: 3; }`,
            h("code", { class: "code" }, "this is a very long line")
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe("this ")
    })

    test("excess height lines are clipped", async () => {
        const buf = await renderCSS(
            `.code { width: 20; height: 2; }`,
            h("code", { class: "code" }, "line1\nline2\nline3\nline4")
        )
        // Only first 2 lines should be visible
        expect(rowSlice(buf, 0, 0, 5)).toBe("line1")
        expect(rowSlice(buf, 1, 0, 5)).toBe("line2")
        // Row 2 should NOT have line3 content
        expect(rowSlice(buf, 2, 0, 5)).not.toBe("line3")
    })
})

// ─── Empty content ───────────────────────────────────────────────────────────────

describe("code: empty content", () => {
    test("renders nothing for empty code element", async () => {
        const buf = await renderCSS(
            `.code { width: 10; height: 3; }`,
            h("code", { class: "code" }, "")
        )
        // The code element should not render any text content.
        // Buffer cells will have default space characters (not rendered text).
        // Verify no non-space content exists in the code element's area.
        expect(rowSlice(buf, 0, 0, 10)).toBe("          ")
    })

    test("renders nothing for whitespace-only content", async () => {
        const buf = await renderCSS(
            `.code { width: 10; height: 3; }`,
            h("code", { class: "code" }, "   \n   \n   ")
        )
        // After normalizeCode strips blank lines, content is empty
        expect(rowSlice(buf, 0, 0, 10)).toBe("          ")
    })
})

// ─── Nesting ────────────────────────────────────────────────────────────────────

describe("code: nesting", () => {
    test("code inside div", async () => {
        const buf = await renderCSS(
            `.container { width: 20; height: 5; }
             .code { width: 15; height: 3; }`,
            h("div", { class: "container" }, h("code", { class: "code" }, "hello"))
        )
        expect(rowSlice(buf, 0, 0, 5)).toBe("hello")
    })

    test("multiple code blocks stack vertically", async () => {
        const buf = await renderCSS(
            `.code { width: 15; height: 2; }`,
            h(
                "div",
                {},
                h("code", { class: "code" }, "code1"),
                h("code", { class: "code" }, "code2")
            )
        )
        // First code block at y=0, second at y=2 (height 2 each)
        expect(rowSlice(buf, 0, 0, 5)).toBe("code1")
        expect(rowSlice(buf, 2, 0, 5)).toBe("code2")
    })
})

// ─── UA styles ─────────────────────────────────────────────────────────────────

describe("code: UA styles", () => {
    test("code has no special UA background", async () => {
        const buf = await renderCSS(
            `.code { width: 10; height: 1; }`,
            h("code", { class: "code" }, "test")
        )
        // Should have transparent/empty background (no UA bg applied)
        expect(cellBg(buf, 0, 0)).toBeNull()
    })
})
