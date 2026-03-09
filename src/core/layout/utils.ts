import type { LayoutNode } from './types'

/**
 * Returns true if the node has any form of scrolling enabled.
 *
 * This is the single authoritative check used by the layout engine,
 * buffer renderer, and interaction manager. Previously this logic was
 * duplicated (with slight differences) across three files.
 */
export function isScrollableNode(node: LayoutNode): boolean {
    return !!(
        node.layoutProps.scrollable ||
        node.layoutProps.scrollableY ||
        node.layoutProps.alwaysScroll ||
        node.props.scrollable ||
        node.props.scrollableY
    )
}
