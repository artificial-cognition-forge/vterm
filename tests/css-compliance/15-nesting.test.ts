/**
 * CSS Compliance — CSS Nesting (postcss-nested)
 * spec.md § 15
 *
 * Tests: nested selectors, & parent reference, deep nesting (3+ levels)
 * Pipeline tier: parser (postcss-nested flattening before transformDeclaration)
 */

import { test, expect, describe } from 'bun:test'
import { transformCSSToLayout } from '../../src/core/css/transformer'

describe('nested selectors', () => {
  test('child nested inside parent is flattened correctly', async () => {
    const styles = await transformCSSToLayout(`
      .parent {
        color: white;
        .child {
          color: cyan;
        }
      }
    `)
    expect(styles['.parent']?.visualStyles?.fg).toBe('white')
    expect(styles['.parent .child']?.visualStyles?.fg).toBe('cyan')
  })

  test('multiple children at same nesting level', async () => {
    const styles = await transformCSSToLayout(`
      .container {
        background: blue;
        .header {
          color: white;
        }
        .body {
          color: grey;
        }
      }
    `)
    expect(styles['.container']?.visualStyles?.bg).toBe('blue')
    expect(styles['.container .header']?.visualStyles?.fg).toBe('white')
    expect(styles['.container .body']?.visualStyles?.fg).toBe('grey')
  })
})

describe('& parent reference', () => {
  test('&:hover nested via & produces correct :hover styles', async () => {
    const styles = await transformCSSToLayout(`
      .btn {
        color: white;
        &:hover {
          color: cyan;
        }
      }
    `)
    expect(styles['.btn']?.visualStyles?.fg).toBe('white')
    expect(styles['.btn']?.hover?.visualStyles?.fg).toBe('cyan')
  })

  test('&:focus nested via & produces correct :focus styles', async () => {
    const styles = await transformCSSToLayout(`
      .input {
        background: grey;
        &:focus {
          background: white;
        }
      }
    `)
    expect(styles['.input']?.focus?.visualStyles?.bg).toBe('white')
  })

  test('& .child selector produces correct descendant rule', async () => {
    const styles = await transformCSSToLayout(`
      .nav {
        background: blue;
        & .item {
          color: white;
        }
      }
    `)
    expect(styles['.nav']?.visualStyles?.bg).toBe('blue')
    // postcss-nested resolves "& .item" → ".nav .item"
    expect(styles['.nav .item']?.visualStyles?.fg).toBe('white')
  })
})

describe('deep nesting (3+ levels)', () => {
  test('three-level nesting flattened to descendant selectors', async () => {
    const styles = await transformCSSToLayout(`
      .a {
        color: red;
        .b {
          color: green;
          .c {
            color: blue;
          }
        }
      }
    `)
    expect(styles['.a']?.visualStyles?.fg).toBe('red')
    expect(styles['.a .b']?.visualStyles?.fg).toBe('green')
    expect(styles['.a .b .c']?.visualStyles?.fg).toBe('blue')
  })
})

describe('nesting does not break non-nested rules', () => {
  test('flat and nested rules in same stylesheet coexist', async () => {
    const styles = await transformCSSToLayout(`
      .flat { color: white; }
      .outer {
        background: blue;
        .inner { color: cyan; }
      }
    `)
    expect(styles['.flat']?.visualStyles?.fg).toBe('white')
    expect(styles['.outer']?.visualStyles?.bg).toBe('blue')
    expect(styles['.outer .inner']?.visualStyles?.fg).toBe('cyan')
  })
})
