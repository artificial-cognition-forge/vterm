/**
 * CSS Compliance — Pseudo-states
 * spec.md § 13
 *
 * Tests: :hover, :focus, :active — parsed into nested LayoutProperties objects
 * Pipeline tier: parser (transformer.ts stores nested pseudo styles)
 *
 * Note: Rendering of pseudo-states requires an InteractionManager.
 * These tests verify that pseudo-state CSS is correctly parsed into
 * the LayoutProperties structure. Rendering tests require an interaction fixture.
 */

import { test, expect, describe } from 'bun:test'
import { transformCSSToLayout } from '../../src/core/css/transformer'

// ─── Parser-level: pseudo-states stored on base selector ─────────────────────

describe(':hover parsing', () => {
  test(':hover color is stored under base selector .hover key', async () => {
    const styles = await transformCSSToLayout(`
      .btn { color: white; }
      .btn:hover { color: cyan; background: blue; }
    `)
    expect(styles['.btn']?.hover?.visualStyles?.fg).toBe('cyan')
    expect(styles['.btn']?.hover?.visualStyles?.bg).toBe('blue')
  })

  test(':hover does not pollute base selector styles', async () => {
    const styles = await transformCSSToLayout(`
      .btn { color: white; }
      .btn:hover { color: cyan; }
    `)
    expect(styles['.btn']?.visualStyles?.fg).toBe('white')
  })

  test('element with only :hover rule creates base entry', async () => {
    const styles = await transformCSSToLayout(`
      .link:hover { color: yellow; }
    `)
    expect(styles['.link']?.hover?.visualStyles?.fg).toBe('yellow')
  })
})

describe(':focus parsing', () => {
  test(':focus color stored under base selector .focus key', async () => {
    const styles = await transformCSSToLayout(`
      .input { background: grey; }
      .input:focus { background: white; }
    `)
    expect(styles['.input']?.focus?.visualStyles?.bg).toBe('white')
  })

  test(':focus does not affect base background', async () => {
    const styles = await transformCSSToLayout(`
      .input { background: grey; }
      .input:focus { background: white; }
    `)
    expect(styles['.input']?.visualStyles?.bg).toBe('grey')
  })
})

describe(':active parsing', () => {
  test(':active color stored under base selector .active key', async () => {
    const styles = await transformCSSToLayout(`
      .btn { background: blue; }
      .btn:active { background: darkblue; }
    `)
    expect(styles['.btn']?.active?.visualStyles?.bg).toBe('#00008b')
  })
})

describe('multiple pseudo-states on same element', () => {
  test(':hover and :focus can coexist on same selector', async () => {
    const styles = await transformCSSToLayout(`
      .el { color: white; }
      .el:hover { color: cyan; }
      .el:focus { color: yellow; }
    `)
    expect(styles['.el']?.hover?.visualStyles?.fg).toBe('cyan')
    expect(styles['.el']?.focus?.visualStyles?.fg).toBe('yellow')
    expect(styles['.el']?.visualStyles?.fg).toBe('white')
  })
})

describe('pseudo-state with postcss nesting', () => {
  test('nested :hover via postcss-nested is parsed correctly', async () => {
    const styles = await transformCSSToLayout(`
      .btn {
        color: white;
        &:hover {
          color: cyan;
        }
      }
    `)
    expect(styles['.btn']?.hover?.visualStyles?.fg).toBe('cyan')
    expect(styles['.btn']?.visualStyles?.fg).toBe('white')
  })
})
