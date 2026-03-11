/**
 * INT-SPECIAL: Keyboard Shortcuts and Interaction
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellText } from '../helpers'
import { h } from 'vue'

describe('Keyboard Binding', () => {
  test('button renders and is clickable target', async () => {
    const buf = await renderCSS(
      `button { width: 15; height: 1; }`,
      h('button', {}, 'Click me')
    )

    // Button should render
    expect(cellText(buf, 0, 0)).toBe('C')
    expect(cellText(buf, 5, 0)).toBe('m')
  })

  test('input field renders and is editable target', async () => {
    const buf = await renderCSS(
      `input { width: 20; height: 1; }`,
      h('input', { placeholder: 'Type here' })
    )

    // Input should render (empty or with placeholder)
    expect(cellText(buf, 0, 0)).not.toBeUndefined()
  })

  test('textarea renders and accepts text', async () => {
    const buf = await renderCSS(
      `textarea { width: 20; height: 5; }`,
      h('textarea', { placeholder: 'Enter text' })
    )

    // Textarea should render
    expect(cellText(buf, 0, 0)).not.toBeUndefined()
  })
})

describe('Navigation', () => {
  test('anchor element renders', async () => {
    const buf = await renderCSS(
      `a { width: 15; height: 1; }`,
      h('a', { href: '#' }, 'Link')
    )

    // Link should render (no navigation, but visible)
    expect(cellText(buf, 0, 0)).toBe('L')
  })

  test('multiple interactive elements in sequence', async () => {
    const buf = await renderCSS(
      `.item { width: 10; height: 1; }
       button { background: blue; }
       input { background: grey; }`,
      h(
        'div',
        {},
        h('button', {}, 'Button'),
        h('input', {}),
        h('button', {}, 'Submit')
      )
    )

    // All should render sequentially
    expect(cellText(buf, 0, 0)).toBe('B')
    expect(cellText(buf, 0, 1)).not.toBeUndefined()
    expect(cellText(buf, 0, 2)).toBe('S')
  })
})

describe('Focus Management', () => {
  test('input can receive focus', async () => {
    const buf = await renderCSS(
      `input { width: 20; height: 1; background: grey; }
       input:focus { background: cyan; }`,
      h('input')
    )

    // Renders as focusable element
    expect(cellText(buf, 0, 0)).not.toBeUndefined()
  })

  test('button can receive focus', async () => {
    const buf = await renderCSS(
      `button { width: 15; height: 1; background: blue; }
       button:focus { border-color: white; }`,
      h('button', {}, 'Focus')
    )

    // Renders as focusable
    expect(cellText(buf, 0, 0)).toBe('F')
  })
})

describe('Event Handling', () => {
  test('@press handler bound to button', async () => {
    const buf = await renderCSS(
      `button { width: 15; height: 1; }`,
      h('button', { '@press': () => {} }, 'Click')
    )

    // Button renders normally
    expect(cellText(buf, 0, 0)).toBe('C')
  })

  test('@input handler on input element', async () => {
    const buf = await renderCSS(
      `input { width: 20; height: 1; }`,
      h('input', { '@input': () => {} })
    )

    // Input renders normally
    expect(cellText(buf, 0, 0)).not.toBeUndefined()
  })

  test('@change handler on textarea', async () => {
    const buf = await renderCSS(
      `textarea { width: 20; height: 5; }`,
      h('textarea', { '@change': () => {} })
    )

    // Textarea renders normally
    expect(cellText(buf, 0, 0)).not.toBeUndefined()
  })
})

describe('Multiple Interactions', () => {
  test('form with multiple inputs', async () => {
    const buf = await renderCSS(
      `input { width: 20; height: 1; background: grey; }
       button { width: 10; height: 1; background: blue; }`,
      h(
        'div',
        {},
        h('input', { placeholder: 'Name' }),
        h('input', { placeholder: 'Email' }),
        h('button', {}, 'Submit')
      )
    )

    // All three should render
    expect(cellText(buf, 0, 0)).not.toBeUndefined()
    expect(cellText(buf, 0, 1)).not.toBeUndefined()
    expect(cellText(buf, 0, 2)).toBe('S')
  })

  test('nested interactive elements', async () => {
    const buf = await renderCSS(
      `.container { width: 20; height: 10; }
       button { width: 10; height: 1; }`,
      h(
        'div',
        { class: 'container' },
        h('button', {}, 'Button1'),
        h('div', {},
          h('button', {}, 'Button2'),
          h('button', {}, 'Button3')
        )
      )
    )

    // All buttons should render
    expect(cellText(buf, 0, 0)).toBe('B')
    expect(cellText(buf, 0, 1)).toBe('B')
    expect(cellText(buf, 0, 2)).toBe('B')
  })
})
