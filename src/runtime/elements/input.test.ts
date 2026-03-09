import { test, expect, describe } from 'bun:test'
import './input' // registers input behavior
import { getElement } from './registry'
import type { LayoutNode } from '../../core/layout/types'
import type { KeyEvent } from '../terminal/input'

function makeNode(value = '', cursorPos?: number): LayoutNode {
  const node: LayoutNode = {
    id: 'test-input',
    type: 'input',
    layoutProps: {},
    props: { modelValue: value },
    content: null,
    style: {},
    events: new Map(),
    children: [],
    parent: null,
    layout: {
      x: 5,
      y: 2,
      width: 20,
      height: 3,
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

function key(name: string, sequence = ''): KeyEvent {
  return { name, sequence, ctrl: false, shift: false, meta: false }
}

function printable(char: string): KeyEvent {
  return { name: char, sequence: char, ctrl: false, shift: false, meta: false }
}

const noop = () => {}

describe('input element - handleKey', () => {
  test('backspace removes character before cursor', () => {
    const node = makeNode('hello', 5)
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('backspace'), noop)
    expect(node._inputValue).toBe('hell')
    expect(node._cursorPos).toBe(4)
  })

  test('backspace at position 0 does nothing', () => {
    const node = makeNode('hello', 0)
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('backspace'), noop)
    expect(node._inputValue).toBe('hello')
    expect(node._cursorPos).toBe(0)
  })

  test('delete removes character at cursor', () => {
    const node = makeNode('hello', 2)
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('delete'), noop)
    expect(node._inputValue).toBe('helo')
    expect(node._cursorPos).toBe(2)
  })

  test('left moves cursor back', () => {
    const node = makeNode('hello', 3)
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('left'), noop)
    expect(node._cursorPos).toBe(2)
  })

  test('left at position 0 stays at 0', () => {
    const node = makeNode('hello', 0)
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('left'), noop)
    expect(node._cursorPos).toBe(0)
  })

  test('right moves cursor forward', () => {
    const node = makeNode('hello', 2)
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('right'), noop)
    expect(node._cursorPos).toBe(3)
  })

  test('right at end stays at end', () => {
    const node = makeNode('hello', 5)
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('right'), noop)
    expect(node._cursorPos).toBe(5)
  })

  test('home jumps cursor to 0', () => {
    const node = makeNode('hello', 4)
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('home'), noop)
    expect(node._cursorPos).toBe(0)
  })

  test('end jumps cursor to end', () => {
    const node = makeNode('hello', 1)
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('end'), noop)
    expect(node._cursorPos).toBe(5)
  })

  test('printable character inserts at cursor', () => {
    const node = makeNode('helo', 3)
    const behavior = getElement('input')!
    behavior.handleKey!(node, printable('l'), noop)
    expect(node._inputValue).toBe('hello')
    expect(node._cursorPos).toBe(4)
  })

  test('printable character inserts at start', () => {
    const node = makeNode('ello', 0)
    const behavior = getElement('input')!
    behavior.handleKey!(node, printable('h'), noop)
    expect(node._inputValue).toBe('hello')
    expect(node._cursorPos).toBe(1)
  })

  test('enter fires change event', () => {
    const node = makeNode('hello', 5)
    let emitted: string | undefined
    node.events.set('change', (v: string) => { emitted = v })
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('enter'), noop)
    expect(emitted).toBe('hello')
  })

  test('fires update:modelvalue on every key', () => {
    const node = makeNode('hi', 2)
    let emitted: string | undefined
    node.events.set('update:modelvalue', (v: string) => { emitted = v })
    const behavior = getElement('input')!
    behavior.handleKey!(node, printable('!'), noop)
    expect(emitted).toBe('hi!')
  })

  test('initializes state from props.modelValue on first key', () => {
    const node = makeNode('init') // no _inputValue set yet
    const behavior = getElement('input')!
    behavior.handleKey!(node, key('end'), noop)
    expect(node._inputValue).toBe('init')
    expect(node._cursorPos).toBe(4)
  })

  test('ctrl key does not insert character', () => {
    const node = makeNode('hello', 5)
    const behavior = getElement('input')!
    behavior.handleKey!(node, { name: 'c', sequence: '\x03', ctrl: true, shift: false, meta: false }, noop)
    expect(node._inputValue).toBe('hello')
  })
})

describe('input element - getCursorPos', () => {
  test('returns correct position inside border', () => {
    const node = makeNode('hi', 2)
    const behavior = getElement('input')!
    // layout: x=5, y=2, border=1, padding=0 → contentX=6, contentY=3
    const pos = behavior.getCursorPos!(node)
    expect(pos).not.toBeNull()
    expect(pos!.x).toBe(6 + 2) // contentX + cursorPos
    expect(pos!.y).toBe(3)
  })

  test('returns null when layout is not set', () => {
    const node = makeNode('hi', 1)
    node.layout = null
    const behavior = getElement('input')!
    expect(behavior.getCursorPos!(node)).toBeNull()
  })

  test('scrolls cursor into view when value exceeds content width', () => {
    // contentWidth = 20 - 2*1 = 18; cursor at position 20 (past visible area)
    const node = makeNode('a'.repeat(25), 20)
    const behavior = getElement('input')!
    const pos = behavior.getCursorPos!(node)
    expect(pos).not.toBeNull()
    // scrollOffset = max(0, 20 - 18 + 1) = 3; x = contentX + (20 - 3) = 6 + 17 = 23
    expect(pos!.x).toBe(6 + 17)
  })
})
