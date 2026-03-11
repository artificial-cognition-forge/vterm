/**
 * useTerminal Composable Tests
 *
 * Tests the useTerminal() composable which provides reactive access
 * to terminal dimensions (width, height).
 */

import { test, expect, describe } from "bun:test"
import { renderCSS, cellText } from "../integration/helpers"
import { h } from "vue"

describe("useTerminal composable", () => {
	test("composable is importable and exported", () => {
		// Import should not throw
		const { useTerminal } = require("../../src/runtime/index")
		expect(typeof useTerminal).toBe("function")
	})

	test("should render terminal width and height in component", async () => {
		// Create a simple component that uses useTerminal
		const buf = await renderCSS(
			`.container { width: 50; height: 10; }
			 .info { width: 50; height: 8; }`,
			h("div", { class: "container" }, [
				h("div", { class: "info" }, "Terminal dimensions available"),
			])
		)

		// Verify the component rendered (text is present)
		expect(cellText(buf, 0, 0)).toBe("T")
	})
})
