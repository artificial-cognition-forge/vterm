import { test, expect, describe } from 'bun:test'
import { isScrollableNode } from './utils'
import { createLayoutNode } from './tree'

function makeNode() {
  return createLayoutNode({ type: 'box' })
}

describe('isScrollableNode', () => {
  test('returns false for plain node with no scroll flags', () => {
    const node = makeNode()
    expect(isScrollableNode(node)).toBe(false)
  })

  test('returns true when layoutProps.scrollable=true', () => {
    const node = makeNode()
    node.layoutProps.scrollable = true
    expect(isScrollableNode(node)).toBe(true)
  })

  test('returns true when layoutProps.scrollableY=true', () => {
    const node = makeNode()
    node.layoutProps.scrollableY = true
    expect(isScrollableNode(node)).toBe(true)
  })

  test('returns true when layoutProps.alwaysScroll=true', () => {
    const node = makeNode()
    node.layoutProps.alwaysScroll = true
    expect(isScrollableNode(node)).toBe(true)
  })

  test('returns true when props.scrollable=true', () => {
    const node = makeNode()
    node.props.scrollable = true
    expect(isScrollableNode(node)).toBe(true)
  })

  test('returns true when props.scrollableY=true', () => {
    const node = makeNode()
    node.props.scrollableY = true
    expect(isScrollableNode(node)).toBe(true)
  })

  test('returns false when all flags are false', () => {
    const node = makeNode()
    node.layoutProps.scrollable = false
    node.layoutProps.scrollableY = false
    node.layoutProps.alwaysScroll = false
    node.props.scrollable = false
    node.props.scrollableY = false
    expect(isScrollableNode(node)).toBe(false)
  })

  test('returns false when flags are undefined', () => {
    const node = makeNode()
    node.layoutProps.scrollable = undefined
    node.layoutProps.alwaysScroll = undefined
    expect(isScrollableNode(node)).toBe(false)
  })
})
