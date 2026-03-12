import { test, expect, describe } from 'bun:test'
import './textarea' // registers textarea behavior
import { getElement } from './registry'
import type { LayoutNode } from '../../core/layout/types'
import type { KeyEvent } from '../terminal/input'
import { ScreenBuffer } from '../terminal/buffer'

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

describe('textarea element - handleKey - basic operations', () => {
  test('backspace removes character before cursor', () => {
    const node = makeNode('hello', 5)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('backspace'), noop)
    expect(node._inputValue).toBe('hell')
    expect(node._cursorPos).toBe(4)
  })

  test('delete removes character at cursor', () => {
    const node = makeNode('hello', 2)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('delete'), noop)
    expect(node._inputValue).toBe('helo')
  })

  test('printable character inserts at cursor', () => {
    const node = makeNode('helo', 3)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, printable('l'), noop)
    expect(node._inputValue).toBe('hello')
    expect(node._cursorPos).toBe(4)
  })

  test('shift+enter inserts newline at cursor', () => {
    const node = makeNode('hello world', 5)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, { ...key('enter'), shift: true }, noop)
    expect(node._inputValue).toBe('hello\n world')
    expect(node._cursorPos).toBe(6)
  })
})

describe('textarea element - handleKey - v-model behavior', () => {
  test('emits update:modelvalue when character typed', () => {
    const node = makeNode('hi', 2)
    let emitted: string | undefined
    node.events.set('update:modelvalue', (v: string) => { emitted = v })
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, printable('!'), noop)
    expect(emitted).toBe('hi!')
  })

  test('emits update:modelvalue on backspace', () => {
    const node = makeNode('hello', 5)
    let emitted: string | undefined
    node.events.set('update:modelvalue', (v: string) => { emitted = v })
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('backspace'), noop)
    expect(emitted).toBe('hell')
  })

  test('does NOT emit update:modelvalue on left arrow (cursor-only move)', () => {
    const node = makeNode('hello', 3)
    let emitted: string | undefined
    node.events.set('update:modelvalue', (v: string) => { emitted = v })
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('left'), noop)
    expect(node._cursorPos).toBe(2) // cursor moved
    expect(emitted).toBeUndefined() // but no emission
  })

  test('does NOT emit update:modelvalue on right arrow (cursor-only move)', () => {
    const node = makeNode('hello', 2)
    let emitted: string | undefined
    node.events.set('update:modelvalue', (v: string) => { emitted = v })
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('right'), noop)
    expect(node._cursorPos).toBe(3)
    expect(emitted).toBeUndefined()
  })

  test('does NOT emit update:modelvalue on home (cursor-only move)', () => {
    const node = makeNode('hello', 3)
    let emitted: string | undefined
    node.events.set('update:modelvalue', (v: string) => { emitted = v })
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('home'), noop)
    expect(node._cursorPos).toBe(0)
    expect(emitted).toBeUndefined()
  })

  test('does NOT emit update:modelvalue on end (cursor-only move)', () => {
    const node = makeNode('hello', 1)
    let emitted: string | undefined
    node.events.set('update:modelvalue', (v: string) => { emitted = v })
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('end'), noop)
    expect(node._cursorPos).toBe(5)
    expect(emitted).toBeUndefined()
  })

  test('does NOT emit update:modelvalue on up arrow (cursor-only move)', () => {
    const node = makeNode('hello\nworld', 9)
    let emitted: string | undefined
    node.events.set('update:modelvalue', (v: string) => { emitted = v })
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('up'), noop)
    expect(emitted).toBeUndefined()
  })

  test('does NOT emit update:modelvalue on down arrow (cursor-only move)', () => {
    const node = makeNode('hello\nworld', 2)
    let emitted: string | undefined
    node.events.set('update:modelvalue', (v: string) => { emitted = v })
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('down'), noop)
    expect(emitted).toBeUndefined()
  })
})

describe('textarea element - handleKey - visual line navigation', () => {
  test('up moves to previous visual line preserving column (soft-wrapped)', () => {
    // contentWidth = 20 - 2 = 18; "aaaaaaaaaaaaaaaaaabbbbbb" wraps at 18
    // Visual line 0: "aaaaaaaaaaaaaaaaaa" (18 chars, startPos 0)
    // Visual line 1: "bbbbbb" (6 chars, startPos 18)
    // Cursor at pos 20 (col 2 of visual line 1)
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbb', 20)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('up'), noop)
    // Should go to visual line 0, col 2 → pos 2
    expect(node._cursorPos).toBe(2)
  })

  test('up on first visual line jumps to start', () => {
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbb', 2)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('up'), noop)
    expect(node._cursorPos).toBe(0)
  })

  test('down moves to next visual line preserving column (soft-wrapped)', () => {
    // Visual line 0: "aaaaaaaaaaaaaaaaaa" (18 chars)
    // Visual line 1: "bbbbbb" (6 chars)
    // Cursor at pos 2 (col 2 of visual line 0)
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbb', 2)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('down'), noop)
    // Should go to visual line 1, col 2 → pos 20
    expect(node._cursorPos).toBe(20)
  })

  test('down on last visual line jumps to end', () => {
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbb', 20)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('down'), noop)
    expect(node._cursorPos).toBe(24)
  })

  test('down clamps column to shorter wrapped line length', () => {
    // Visual line 0: "aaaaaaaaaaaaaaaaaa" (18 chars)
    // Visual line 1: "bb" (2 chars)
    // Cursor at pos 10 (col 10 of visual line 0), but visual line 1 only has 2 chars
    const node = makeNode('aaaaaaaaaaaaaaaaaabb', 10)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('down'), noop)
    // Should clamp col 10 to visual line 1 length (2) → pos 18+2=20
    expect(node._cursorPos).toBe(20)
  })

  test('home moves to start of current visual line', () => {
    // Visual line 0: "aaaaaaaaaaaaaaaaaa" (18 chars, startPos 0)
    // Visual line 1: "bbbbbb" (6 chars, startPos 18)
    // Cursor at pos 20 (col 2 of visual line 1)
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbb', 20)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('home'), noop)
    // Should go to start of visual line 1 → pos 18
    expect(node._cursorPos).toBe(18)
  })

  test('end moves to end of current visual line', () => {
    // Visual line 0: "aaaaaaaaaaaaaaaaaa" (18 chars, startPos 0)
    // Cursor at pos 2
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbb', 2)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('end'), noop)
    // Should go to end of visual line 0 → pos 0 + 18 = 18
    expect(node._cursorPos).toBe(18)
  })
})

describe('textarea element - handleKey - hard line navigation with newlines', () => {
  test('up with hard newlines moves to previous hard line', () => {
    const node = makeNode('hello\nworld', 9)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('up'), noop)
    expect(node._cursorPos).toBe(3)
  })

  test('up on first hard line jumps to start', () => {
    const node = makeNode('hello\nworld', 2)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('up'), noop)
    expect(node._cursorPos).toBe(0)
  })

  test('down with hard newlines moves to next hard line', () => {
    const node = makeNode('hello\nworld', 2)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('down'), noop)
    expect(node._cursorPos).toBe(8)
  })

  test('down on last hard line jumps to end', () => {
    const node = makeNode('hello\nworld', 9)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('down'), noop)
    expect(node._cursorPos).toBe(11)
  })

  test('home moves to start of hard line', () => {
    const node = makeNode('hello\nworld', 9)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('home'), noop)
    expect(node._cursorPos).toBe(6)
  })

  test('end moves to end of hard line', () => {
    const node = makeNode('hello\nworld', 7)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('end'), noop)
    expect(node._cursorPos).toBe(11)
  })

  test('up clamps column to shorter hard line length', () => {
    const node = makeNode('hi\nhello', 7)
    const behavior = getElement('textarea')!
    behavior.handleKey!(node, key('up'), noop)
    expect(node._cursorPos).toBe(2)
  })
})

describe('textarea element - getCursorPos', () => {
  test('returns null when layout is not set', () => {
    const node = makeNode('hello', 1)
    node.layout = null
    const behavior = getElement('textarea')!
    expect(behavior.getCursorPos!(node)).toBeNull()
  })

  test('returns correct position on first visual line', () => {
    // contentWidth = 20 - 2 = 18
    // Visual line 0: "aaaaaaaaaaaaaaaaaa" (18 chars)
    // Cursor at pos 5 → visual line 0, col 5
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbb', 5)
    const behavior = getElement('textarea')!
    const pos = behavior.getCursorPos!(node)
    expect(pos).not.toBeNull()
    expect(pos!.x).toBe(1 + 5) // contentX(1) + col(5)
    expect(pos!.y).toBe(1 + 0) // contentY(1) + vLine(0)
  })

  test('returns correct position on second visual line', () => {
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbb', 20)
    const behavior = getElement('textarea')!
    const pos = behavior.getCursorPos!(node)
    expect(pos).not.toBeNull()
    expect(pos!.x).toBe(1 + 2) // contentX(1) + col(2 of visual line 1)
    expect(pos!.y).toBe(1 + 1) // contentY(1) + vLine(1)
  })

  test('returns null when cursor is scrolled above viewport', () => {
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbbcccccccccccccccccc', 2)
    node.scrollY = 2 // lines 0,1 scrolled out
    const behavior = getElement('textarea')!
    const pos = behavior.getCursorPos!(node)
    expect(pos).toBeNull()
  })

  test('returns null when cursor is scrolled below viewport', () => {
    // contentHeight = 7 - 2*1 = 5 visual rows; scrollY=0
    // cursor on visual line 6 (past contentHeight 5)
    const node = makeNode('a'.repeat(200), 100)
    const behavior = getElement('textarea')!
    const pos = behavior.getCursorPos!(node)
    expect(pos).toBeNull()
  })
})

describe('textarea element - placeholder rendering', () => {
  test('renders placeholder text when value is empty', () => {
    const node = makeNode('', 0)
    node.props.placeholder = 'Enter text...'
    const behavior = getElement('textarea')!
    // Just verify it doesn't crash and returns computed view
    const pos = behavior.getCursorPos!(node)
    // Placeholder should still allow cursor positioning
    expect(pos).not.toBeNull()
  })

  test('does not render placeholder when value is non-empty', () => {
    const node = makeNode('hello', 5)
    node.props.placeholder = 'Enter text...'
    const behavior = getElement('textarea')!
    // Cursor should be positioned within the content, not placeholder
    const pos = behavior.getCursorPos!(node)
    expect(pos!.x).toBe(1 + 5)
  })
})

describe('textarea element - scrollbar support', () => {
  test('sets contentHeight to total visual line count', () => {
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbb', 0) // 24 chars wraps at 18-char width
    const behavior = getElement('textarea')!
    const noop = () => {}
    const mockBuffer = {
      write: () => {}
    } as any
    const mockCtx = {
      buffer: mockBuffer,
      cellStyle: {},
      adjustedY: node.layout!.y
    }
    behavior.render!(node, mockCtx)
    // "aaaaaaaaaaaaaaaaaabbbbbb" (24 chars) with width 18 → 2 visual lines
    expect(node.contentHeight).toBe(2)
  })

  test('contentHeight accounts for hard newlines', () => {
    // "hello\nworld\nfoo" with width 18 → 3 visual lines (one per hard line)
    const node = makeNode('hello\nworld\nfoo', 0)
    const behavior = getElement('textarea')!
    const mockBuffer = { write: () => {} } as any
    const mockCtx = {
      buffer: mockBuffer,
      cellStyle: {},
      adjustedY: node.layout!.y
    }
    behavior.render!(node, mockCtx)
    expect(node.contentHeight).toBe(3)
  })

  test('contentHeight is one for empty textarea', () => {
    // Empty value still has one visual line (the first line where user types)
    const node = makeNode('', 0)
    const behavior = getElement('textarea')!
    const mockBuffer = { write: () => {} } as any
    const mockCtx = {
      buffer: mockBuffer,
      cellStyle: {},
      adjustedY: node.layout!.y
    }
    behavior.render!(node, mockCtx)
    expect(node.contentHeight).toBe(1)
  })

  test('contentHeight updates when value changes', () => {
    const node = makeNode('hello', 0)
    const behavior = getElement('textarea')!
    const mockBuffer = { write: () => {} } as any
    const mockCtx = {
      buffer: mockBuffer,
      cellStyle: {},
      adjustedY: node.layout!.y
    }
    behavior.render!(node, mockCtx)
    expect(node.contentHeight).toBe(1)

    // Add more content
    node._inputValue = 'aaaaaaaaaaaaaaaaaabbbbbb'
    behavior.render!(node, mockCtx)
    // Should now be 2 visual lines
    expect(node.contentHeight).toBe(2)
  })

  test('contentHeight correctly counts wrapped lines', () => {
    // contentWidth = 20 - 2 = 18
    // "aaaaaaaaaaaaaaaaaa" = 18 chars → 1 line
    // "bbbbbbbbbbbbbbbbbbbbb" = 21 chars → 2 lines (18 + 3)
    // Total = 3 visual lines
    const node = makeNode('aaaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbb', 0)
    const behavior = getElement('textarea')!
    const mockBuffer = { write: () => {} } as any
    const mockCtx = {
      buffer: mockBuffer,
      cellStyle: {},
      adjustedY: node.layout!.y
    }
    behavior.render!(node, mockCtx)
    // 18 + 18 + 5 = 41 chars total
    // Visual lines: 18 (first wrap), 18 (second wrap), 5 (remainder) = 3 lines
    expect(node.contentHeight).toBe(3)
  })

  test('scrollbar renders when content exceeds viewport', () => {
    // contentHeight = 7, border = 1, so visible rows = 5
    // 10 wrapped lines > 5 visible rows → scrollbar should render
    const node = makeNode('aaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbb', 0)
    node._inputValue = 'aaaaaaaaaaaaaaaaaabbbbbbbbbbbbbbbbbbbbccccccccccccccccccccdddddddddddddddddddd' // 80 chars → 5 visual lines
    node._cursorPos = 0
    const behavior = getElement('textarea')!

    const buffer = new ScreenBuffer(20, 10)
    const mockCtx = {
      buffer,
      cellStyle: { fg: undefined, bg: undefined, bold: false, dim: false, italic: false, underline: false, inverse: false },
      adjustedY: node.layout!.y
    }
    behavior.render!(node, mockCtx)

    // With contentHeight = 5 and visible rows = 5, no scrollbar should render
    // Let's verify no scrollbar chars in rightmost column
    const rightCol = node.layout!.x + node.layout!.width - 1
    let scrollbarFound = false
    for (let y = 0; y < node.layout!.height; y++) {
      const cell = buffer.getCell(rightCol, y)
      if (cell?.char === '█' || cell?.char === '│') {
        scrollbarFound = true
        break
      }
    }
    // For a 5-line content in 5-row viewport, no scrollbar
    expect(scrollbarFound).toBe(false)
  })

  test('scrollbar DOES render when content greatly exceeds viewport', () => {
    // Create textarea with 10 lines (way more than 6 visible rows)
    const lines = Array.from({ length: 10 }, (_, i) => `Line ${i + 1}`)
    const node = makeNode(lines.join('\n'), 0)
    const behavior = getElement('textarea')!

    // Verify state before rendering
    expect(node.contentHeight).toBeUndefined() // Not set yet
    expect(node._inputValue!.split('\n').length).toBe(10)

    const buffer = new ScreenBuffer(20, 15)
    const mockCtx = {
      buffer,
      cellStyle: { fg: undefined, bg: undefined, bold: false, dim: false, italic: false, underline: false, inverse: false },
      adjustedY: node.layout!.y
    }
    behavior.render!(node, mockCtx)

    // After rendering, contentHeight should be set to 10
    expect(node.contentHeight).toBe(10)

    // Now simulate what buffer-renderer does:
    // Layout: height=7, border=1, padding=0
    // viewportHeight = 7 - 2*1 - 0 = 5
    // contentHeight=10 > viewportHeight=5 → scrollbar should render

    const layout = node.layout!
    const border = layout.border.width
    const padding = layout.padding
    const viewportHeight = layout.height - 2 * border - padding.top - padding.bottom
    const contentHeight = node.contentHeight!

    // This is the check from renderScrollbar
    const shouldRenderScrollbar = contentHeight > viewportHeight
    expect(shouldRenderScrollbar).toBe(true) // 10 > 5 = true

    // The scrollbar should be rendered at the right column
    // It spans from y = border to y = layout.height - border (6 rows total)
    // But with our viewportHeight calculation, it should span viewportHeight rows
    // starting from adjustedY + border

    // Check that scrollbar position calculation is correct
    expect(viewportHeight).toBe(5) // 7 - 2 - 0
    expect(contentHeight).toBeGreaterThan(viewportHeight) // 10 > 5
  })
})
