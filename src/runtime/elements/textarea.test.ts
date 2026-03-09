import { test, expect, describe } from 'bun:test'
import './textarea' // registers textarea behavior
import { getElement } from './registry'
import type { LayoutNode } from '../../core/layout/types'
import type { KeyEvent } from '../terminal/input'

function makeNode(value = '', cursorPos?: number): LayoutNode {
  const node: LayoutNode = {
    id: 'test-textarea',
    type: 'textarea',
    layoutProps: {},
    props: { modelValue: value },
    content: null,
    style: {},
    events: new Map(),
    children: [],
    parent: null,
    layout: {
      x: 0,
      y: 0,
      width: 20,
      height: 7, // 3 content rows + 2 border + 2 padding
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      border: { width: 1, type: 'line' },
    },
    scrollX: 0,
    scrollY: 0,
  }
  if (cursorPos !== undefined) {
    node._inputValue = value
    node._cursorPos = cursorPos
  }
  return node
}

function key(name: string): KeyEvent {
  return { name, sequence: '', ctrl: false, shift: false, meta: false }
}

function printable(char: string): KeyEvent {
  return { name: char, sequence: char, ctrl: false, shift: false, meta: false }
}

const noop = () => {}

describe('textarea element - handleKey', () => {
  test('enter inserts newline at cursor', () => {
    const node = makeNode('hello world', 5)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('enter'), noop)
    expect(node._inputValue).toBe('hello\n world')
    expect(node._cursorPos).toBe(6)
  })

  test('printable character inserts at cursor', () => {
    const node = makeNode('helo', 3)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, printable('l'), noop)
    expect(node._inputValue).toBe('hello')
    expect(node._cursorPos).toBe(4)
  })

  test('backspace removes character before cursor', () => {
    const node = makeNode('hello', 5)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('backspace'), noop)
    expect(node._inputValue).toBe('hell')
    expect(node._cursorPos).toBe(4)
  })

  test('up moves to previous line preserving column', () => {
    // "hello\nworld" — cursor at 'o' in 'world' (pos 9, col 3 of line 1)
    const node = makeNode('hello\nworld', 9)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('up'), noop)
    // line 0, col 3 → 'l' at pos 3
    expect(node._cursorPos).toBe(3)
  })

  test('up on first line jumps to start', () => {
    const node = makeNode('hello\nworld', 2)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('up'), noop)
    expect(node._cursorPos).toBe(0)
  })

  test('down moves to next line preserving column', () => {
    // "hello\nworld" — cursor at col 2 of 'hello' (pos 2)
    const node = makeNode('hello\nworld', 2)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('down'), noop)
    // line 1, col 2 → 'r' at pos 6+2 = 8
    expect(node._cursorPos).toBe(8)
  })

  test('down on last line jumps to end', () => {
    const node = makeNode('hello\nworld', 9) // in 'world'
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('down'), noop)
    expect(node._cursorPos).toBe(11) // end of 'world'
  })

  test('home moves to start of current line', () => {
    const node = makeNode('hello\nworld', 9) // col 3 of line 1
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('home'), noop)
    expect(node._cursorPos).toBe(6) // start of 'world'
  })

  test('end moves to end of current line', () => {
    const node = makeNode('hello\nworld', 7) // col 1 of 'world'
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('end'), noop)
    expect(node._cursorPos).toBe(11) // end of 'world'
  })

  test('up clamps column to shorter line length', () => {
    // "hi\nhello" — cursor at col 4 of 'hello' (pos 7)
    const node = makeNode('hi\nhello', 7)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('up'), noop)
    // line 0 'hi' has length 2, col clamped to 2
    expect(node._cursorPos).toBe(2)
  })

  test('fires update:modelvalue on every key', () => {
    const node = makeNode('hi', 2)
    let emitted: string | undefined
    node.events.set('update:modelvalue', (v: string) => { emitted = v })
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, printable('!'), noop)
    expect(emitted).toBe('hi!')
  })
})

describe('textarea element - getCursorPos', () => {
  test('returns null when layout is not set', () => {
    const node = makeNode('hello', 1)
    node.layout = null
    const behavior = getElement('textarea')!
    expect(behavior.getCursorPos!(node)).toBeNull()
  })

  test('returns correct y for cursor on visible line', () => {
    // layout: x=0, y=0, border=1, padding=0 → contentX=1, contentY=1
    // height=7, contentHeight = 7 - 2 = 5 visible rows
    const node = makeNode('line0\nline1\nline2', 12) // 'l' of 'line2' → line=2, col=0
    const behavior = getElement('textarea')!
    const pos = behavior.getCursorPos!(node)
    expect(pos).not.toBeNull()
    expect(pos!.y).toBe(1 + 2) // contentY + visibleLine(2)
    expect(pos!.x).toBe(1 + 0) // contentX + col(0)
  })

  test('returns null when cursor is scrolled above viewport', () => {
    const node = makeNode('line0\nline1\nline2\nline3', 2) // line 0, col 2
    node.scrollY = 2 // lines 0,1 scrolled out
    const behavior = getElement('textarea')!
    const pos = behavior.getCursorPos!(node)
    expect(pos).toBeNull() // visibleLine = 0 - 2 = -1
  })

  test('returns null when cursor is scrolled below viewport', () => {
    // contentHeight = 7 - 2*1 = 5 visible rows; scrollY=0; cursor on line 6
    const lines = Array.from({ length: 7 }, (_, i) => `line${i}`).join('\n')
    // cursor on line 6 = past contentHeight(5)
    const cursorPos = lines.lastIndexOf('line6')
    const node = makeNode(lines, cursorPos)
    // layout height=7, border=1 → contentHeight=5; scrollY=0 means lines 0-4 visible
    const behavior = getElement('textarea')!
    const pos = behavior.getCursorPos!(node)
    expect(pos).toBeNull()
  })
})
