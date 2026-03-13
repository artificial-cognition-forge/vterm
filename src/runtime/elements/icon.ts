import type { ElementBehavior, ElementRenderContext } from './types'
import type { LayoutNode } from '../../core/layout/types'
import { registerElement } from './registry'
import { resolveIcon } from './nerd-fonts'

/**
 * <icon> element — renders a single Nerd Font glyph.
 *
 * Usage:
 *   <icon name="nf-fa-home" />
 *   <icon name="folder" />          <!-- short alias -->
 *   <icon name="nf-pl-left_hard_divider" style="color: #61afef" />
 *
 * The `name` prop accepts:
 *   - Full nf-* names (e.g. "nf-fa-home", "nf-pl-left_hard_divider")
 *   - Short aliases (e.g. "home", "folder", "branch")
 *   - Raw Unicode strings (passed through as-is for custom codepoints)
 *
 * Layout: the element always occupies exactly 1 column (width: 1 in CSS).
 * Wrap it in a container if you need padding/margin around it.
 */
const iconBehavior: ElementBehavior = {
    skipChildren: true,

    render(node: LayoutNode, ctx: ElementRenderContext): void {
        if (!node.layout) return

        const { buffer, cellStyle, adjustedY, clipBox } = ctx
        const layout = node.layout

        const x = layout.x
        const y = adjustedY

        // Respect clip boundary
        if (clipBox) {
            if (x < clipBox.x || x >= clipBox.x + clipBox.width) return
            if (y < clipBox.y || y >= clipBox.y + clipBox.height) return
        }

        const name: string = node.props.name ?? ''
        const glyph = resolveIcon(name)

        // Only write the first character — icons are a single glyph
        const char = glyph.charAt(0)
        if (char) {
            buffer.write(x, y, char, cellStyle)
        }
    },
}

registerElement('icon', iconBehavior)
