/**
 * INT-COLOR: Named Colors
 *
 * Tests that all CSS named colors render with correct foreground color.
 */

import { test, expect, describe } from 'bun:test'
import { renderCSS, cellColor } from '../helpers'
import { h } from 'vue'

describe('Named Colors', () => {
  test('red text renders with red foreground', async () => {
    const buf = await renderCSS(
      `.red { color: red; width: 10; height: 1; background: grey; }`,
      h('div', { class: 'red' }, 'red')
    )

    expect(cellColor(buf, 0, 0)).toBe('red')
    expect(cellColor(buf, 1, 0)).toBe('red')
    expect(cellColor(buf, 2, 0)).toBe('red')
  })

  test('blue text renders with blue foreground', async () => {
    const buf = await renderCSS(
      `.blue { color: blue; width: 10; height: 1; background: grey; }`,
      h('div', { class: 'blue' }, 'blue')
    )

    expect(cellColor(buf, 0, 0)).toBe('blue')
  })

  test('cyan text renders with cyan foreground', async () => {
    const buf = await renderCSS(
      `.cyan { color: cyan; width: 10; height: 1; background: grey; }`,
      h('div', { class: 'cyan' }, 'cyan')
    )

    expect(cellColor(buf, 0, 0)).toBe('cyan')
  })

  test('green text renders with green foreground', async () => {
    const buf = await renderCSS(
      `.green { color: green; width: 10; height: 1; background: grey; }`,
      h('div', { class: 'green' }, 'green')
    )

    expect(cellColor(buf, 0, 0)).toBe('green')
  })

  test('yellow text renders with yellow foreground', async () => {
    const buf = await renderCSS(
      `.yellow { color: yellow; width: 10; height: 1; background: grey; }`,
      h('div', { class: 'yellow' }, 'yellow')
    )

    expect(cellColor(buf, 0, 0)).toBe('yellow')
  })

  test('magenta text renders with magenta foreground', async () => {
    const buf = await renderCSS(
      `.magenta { color: magenta; width: 10; height: 1; background: grey; }`,
      h('div', { class: 'magenta' }, 'magenta')
    )

    expect(cellColor(buf, 0, 0)).toBe('magenta')
  })

  test('white text renders with white foreground', async () => {
    const buf = await renderCSS(
      `.white { color: white; width: 10; height: 1; background: grey; }`,
      h('div', { class: 'white' }, 'white')
    )

    expect(cellColor(buf, 0, 0)).toBe('white')
  })

  test('brightred text renders distinctly from red', async () => {
    const buf1 = await renderCSS(
      `.a { color: red; width: 5; height: 1; }`,
      h('div', { class: 'a' }, 'red')
    )
    const buf2 = await renderCSS(
      `.b { color: brightred; width: 5; height: 1; }`,
      h('div', { class: 'b' }, 'bright')
    )

    const redColor = cellColor(buf1, 0, 0)
    const brightRedColor = cellColor(buf2, 0, 0)

    expect(redColor).toBe('red')
    expect(brightRedColor).toBe('brightred')
    expect(redColor).not.toBe(brightRedColor)
  })

  test('brightgreen text renders distinctly from green', async () => {
    const buf1 = await renderCSS(
      `.a { color: green; width: 5; height: 1; }`,
      h('div', { class: 'a' }, 'green')
    )
    const buf2 = await renderCSS(
      `.b { color: brightgreen; width: 5; height: 1; }`,
      h('div', { class: 'b' }, 'bright')
    )

    const greenColor = cellColor(buf1, 0, 0)
    const brightGreenColor = cellColor(buf2, 0, 0)

    expect(greenColor).toBe('green')
    expect(brightGreenColor).toBe('brightgreen')
    expect(greenColor).not.toBe(brightGreenColor)
  })
})
