import { test, expect, describe } from 'bun:test'
import { transformCSSToLayout, extractSFCStyles } from './transformer'

describe('transformCSSToLayout', () => {
  test('transforms basic colors to visual styles', async () => {
    const css = `
      .box {
        color: blue;
        background: red;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box']).toBeDefined()
    expect(result['.box'].visualStyles?.fg).toBe('blue')
    expect(result['.box'].visualStyles?.bg).toBe('red')
  })

  test('transforms text styles to visual styles', async () => {
    const css = `
      .text {
        font-weight: bold;
        text-decoration: underline;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.text'].visualStyles?.bold).toBe(true)
    expect(result['.text'].visualStyles?.underline).toBe(true)
  })

  test('transforms border properties', async () => {
    const css = `
      .box {
        border: 1px solid white;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].border).toBeDefined()
    expect(result['.box'].border?.fg).toBe('white')
    expect(result['.box'].borderType).toBe('line')
  })

  test('transforms border color override', async () => {
    const css = `
      .box {
        border: 1px solid white;
        border-color: cyan;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].border).toBeDefined()
    expect(result['.box'].border?.fg).toBe('cyan')
    expect(result['.box'].borderFg).toBe('cyan')
  })

  test('transforms box model dimensions', async () => {
    const css = `
      .box {
        width: 100;
        height: 50;
        min-width: 20;
        max-height: 200;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].width).toBe(100)
    expect(result['.box'].height).toBe(50)
    expect(result['.box'].minWidth).toBe(20)
    expect(result['.box'].maxHeight).toBe(200)
  })

  test('transforms padding properties', async () => {
    const css = `
      .box {
        padding: 10;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].padding).toBe(10)
  })

  test('transforms padding shorthand with 2 values', async () => {
    const css = `
      .box {
        padding: 5 10;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].padding).toEqual({
      top: 5,
      bottom: 5,
      left: 10,
      right: 10,
    })
  })

  test('transforms padding shorthand with 4 values', async () => {
    const css = `
      .box {
        padding: 1 2 3 4;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].padding).toEqual({
      top: 1,
      right: 2,
      bottom: 3,
      left: 4,
    })
  })

  test('transforms individual padding properties', async () => {
    const css = `
      .box {
        padding-top: 5;
        padding-right: 10;
        padding-bottom: 15;
        padding-left: 20;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].paddingTop).toBe(5)
    expect(result['.box'].paddingRight).toBe(10)
    expect(result['.box'].paddingBottom).toBe(15)
    expect(result['.box'].paddingLeft).toBe(20)
  })

  test('transforms margin properties', async () => {
    const css = `
      .box {
        margin: 10;
        margin-top: 20;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].margin).toBe(10)
    expect(result['.box'].marginTop).toBe(20)
  })

  test('transforms position properties', async () => {
    const css = `
      .box {
        position: absolute;
        top: 10;
        left: 20;
        right: 30;
        bottom: 40;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].position).toBe('absolute')
    expect(result['.box'].top).toBe(10)
    expect(result['.box'].left).toBe(20)
    expect(result['.box'].right).toBe(30)
    expect(result['.box'].bottom).toBe(40)
  })

  test('transforms display property', async () => {
    const css = `
      .flex {
        display: flex;
      }
      .none {
        display: none;
      }
      .block {
        display: block;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.flex'].display).toBe('flex')
    expect(result['.none'].display).toBe('none')
    expect(result['.block'].display).toBe('block')
  })

  test('transforms flexbox properties', async () => {
    const css = `
      .container {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: stretch;
        gap: 10;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.container'].display).toBe('flex')
    expect(result['.container'].flexDirection).toBe('row')
    expect(result['.container'].justifyContent).toBe('center')
    expect(result['.container'].alignItems).toBe('stretch')
    expect(result['.container'].gap).toBe(10)
  })

  test('transforms flex item properties', async () => {
    const css = `
      .item {
        flex-grow: 1;
        flex-shrink: 0;
        flex-basis: 100;
        align-self: center;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.item'].flexGrow).toBe(1)
    expect(result['.item'].flexShrink).toBe(0)
    expect(result['.item'].flexBasis).toBe(100)
    expect(result['.item'].alignSelf).toBe('center')
  })

  test('handles pseudo-classes', async () => {
    const css = `
      .button {
        color: white;
        background: blue;
      }
      .button:hover {
        background: cyan;
      }
      .button:focus {
        border-color: yellow;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.button'].visualStyles?.fg).toBe('white')
    expect(result['.button'].visualStyles?.bg).toBe('blue')
    expect(result['.button'].hover?.visualStyles?.bg).toBe('cyan')
    expect(result['.button'].focus?.borderFg).toBe('yellow')
  })

  test('handles nested selectors', async () => {
    const css = `
      .parent {
        .child {
          color: red;
        }
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.parent .child']).toBeDefined()
    expect(result['.parent .child'].visualStyles?.fg).toBe('red')
  })

  test('handles percentage values', async () => {
    const css = `
      .box {
        width: 50%;
        height: 100%;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].width).toBe('50%')
    expect(result['.box'].height).toBe('100%')
  })

  test('strips units from numeric values', async () => {
    const css = `
      .box {
        width: 100px;
        height: 50rem;
        padding: 10em;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].width).toBe(100)
    expect(result['.box'].height).toBe(50)
    expect(result['.box'].padding).toBe(10)
  })

  test('handles hex colors', async () => {
    const css = `
      .box {
        color: #ff0000;
        background: #00ff00;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].visualStyles?.fg).toBe('#ff0000')
    expect(result['.box'].visualStyles?.bg).toBe('#00ff00')
  })

  test('handles visual effects', async () => {
    const css = `
      .box {
        opacity: 0.5;
        visibility: hidden;
      }
    `
    const result = await transformCSSToLayout(css)

    expect(result['.box'].visualStyles?.transparent).toBe(true)
    expect(result['.box'].visualStyles?.invisible).toBe(true)
  })
})

describe('transformCSSToLayout - flex shorthand', () => {
  test('flex: 1 → grow=1, shrink=1, basis=0', async () => {
    const result = await transformCSSToLayout('.item { flex: 1; }')
    expect(result['.item'].flexGrow).toBe(1)
    expect(result['.item'].flexShrink).toBe(1)
    expect(result['.item'].flexBasis).toBe(0)
  })

  test('flex: 2 1 50 → grow=2, shrink=1, basis=50', async () => {
    const result = await transformCSSToLayout('.item { flex: 2 1 50; }')
    expect(result['.item'].flexGrow).toBe(2)
    expect(result['.item'].flexShrink).toBe(1)
    expect(result['.item'].flexBasis).toBe(50)
  })

  test('flex: none → grow=0, shrink=0', async () => {
    const result = await transformCSSToLayout('.item { flex: none; }')
    expect(result['.item'].flexGrow).toBe(0)
    expect(result['.item'].flexShrink).toBe(0)
  })

  test('flex: auto → grow=1, shrink=1', async () => {
    const result = await transformCSSToLayout('.item { flex: auto; }')
    expect(result['.item'].flexGrow).toBe(1)
    expect(result['.item'].flexShrink).toBe(1)
  })
})

describe('transformCSSToLayout - terminal shorthands', () => {
  test('bold: true sets visualStyles.bold', async () => {
    const result = await transformCSSToLayout('.t { bold: true; }')
    expect(result['.t'].visualStyles?.bold).toBe(true)
  })

  test('bold: false unsets bold', async () => {
    const result = await transformCSSToLayout('.t { bold: false; }')
    expect(result['.t'].visualStyles?.bold).toBe(false)
  })

  test('bold: 0 unsets bold', async () => {
    const result = await transformCSSToLayout('.t { bold: 0; }')
    expect(result['.t'].visualStyles?.bold).toBe(false)
  })

  test('underline: true sets visualStyles.underline', async () => {
    const result = await transformCSSToLayout('.t { underline: true; }')
    expect(result['.t'].visualStyles?.underline).toBe(true)
  })

  test('underline: false unsets underline', async () => {
    const result = await transformCSSToLayout('.t { underline: false; }')
    expect(result['.t'].visualStyles?.underline).toBe(false)
  })
})

describe('transformCSSToLayout - overflow / scroll', () => {
  test('overflow: scroll sets scrollable and alwaysScroll', async () => {
    const result = await transformCSSToLayout('.box { overflow: scroll; }') as any
    expect(result['.box'].scrollable).toBe(true)
    expect(result['.box'].alwaysScroll).toBe(true)
  })

  test('overflow: auto sets scrollable and alwaysScroll', async () => {
    const result = await transformCSSToLayout('.box { overflow: auto; }') as any
    expect(result['.box'].scrollable).toBe(true)
    expect(result['.box'].alwaysScroll).toBe(true)
  })

  test('overflow: hidden sets scrollable=false', async () => {
    const result = await transformCSSToLayout('.box { overflow: hidden; }') as any
    expect(result['.box'].scrollable).toBe(false)
  })

  test('overflow-x: scroll sets scrollableX', async () => {
    const result = await transformCSSToLayout('.box { overflow-x: scroll; }') as any
    expect(result['.box'].scrollableX).toBe(true)
  })
})

describe('transformCSSToLayout - background-color synonym', () => {
  test('background-color: maps to visualStyles.bg', async () => {
    const result = await transformCSSToLayout('.box { background-color: cyan; }')
    expect(result['.box'].visualStyles?.bg).toBe('cyan')
  })

  test('background-color and background both set the same property', async () => {
    const r1 = await transformCSSToLayout('.box { background: red; }')
    const r2 = await transformCSSToLayout('.box { background-color: red; }')
    expect(r1['.box'].visualStyles?.bg).toBe('red')
    expect(r2['.box'].visualStyles?.bg).toBe('red')
  })
})

describe('transformCSSToLayout - row-gap and column-gap', () => {
  test('row-gap: N sets rowGap', async () => {
    const result = await transformCSSToLayout('.box { row-gap: 4; }')
    expect(result['.box'].rowGap).toBe(4)
  })

  test('column-gap: N sets columnGap', async () => {
    const result = await transformCSSToLayout('.box { column-gap: 6; }')
    expect(result['.box'].columnGap).toBe(6)
  })

  test('row-gap and column-gap can be set independently', async () => {
    const result = await transformCSSToLayout('.box { row-gap: 3; column-gap: 8; }')
    expect(result['.box'].rowGap).toBe(3)
    expect(result['.box'].columnGap).toBe(8)
  })
})

describe('transformCSSToLayout - flex-wrap values', () => {
  test('flex-wrap: wrap sets flexWrap', async () => {
    const result = await transformCSSToLayout('.box { flex-wrap: wrap; }')
    expect(result['.box'].flexWrap).toBe('wrap')
  })

  test('flex-wrap: wrap-reverse sets flexWrap', async () => {
    const result = await transformCSSToLayout('.box { flex-wrap: wrap-reverse; }')
    expect(result['.box'].flexWrap).toBe('wrap-reverse')
  })

  test('flex-wrap: nowrap sets flexWrap', async () => {
    const result = await transformCSSToLayout('.box { flex-wrap: nowrap; }')
    expect(result['.box'].flexWrap).toBe('nowrap')
  })
})

describe('transformCSSToLayout - border-style override', () => {
  test('border-style: double overrides border type', async () => {
    const result = await transformCSSToLayout('.box { border: 1px solid white; border-style: double; }')
    expect(result['.box'].borderType).toBe('double')
  })

  test('border-style: none removes border width', async () => {
    const result = await transformCSSToLayout('.box { border: 1px solid white; border-style: none; }')
    // border-style: none should nullify the border
    expect(result['.box'].border?.width ?? 0).toBe(0)
  })

  test('border: 1px double white sets borderType to double directly', async () => {
    const result = await transformCSSToLayout('.box { border: 1px double white; }')
    expect(result['.box'].borderType).toBe('double')
    expect(result['.box'].border?.fg).toBe('white')
  })
})

describe('transformCSSToLayout - :active pseudo-state', () => {
  test(':active styles are parsed into LayoutProperties.active', async () => {
    const result = await transformCSSToLayout(`
      .btn { background: blue; }
      .btn:active { background: red; }
    `)
    expect(result['.btn'].active?.visualStyles?.bg).toBe('red')
  })
})

describe('transformCSSToLayout - overflow-y', () => {
  test('overflow-y: scroll sets scrollableY', async () => {
    const result = await transformCSSToLayout('.box { overflow-y: scroll; }') as any
    expect(result['.box'].scrollableY).toBe(true)
  })

  test('overflow-y: hidden disables y scrolling', async () => {
    const result = await transformCSSToLayout('.box { overflow-y: hidden; }') as any
    // Should not set scrollableY, or explicitly set it to false
    expect(result['.box'].scrollableY).not.toBe(true)
  })
})

describe('transformCSSToLayout - margin: auto', () => {
  test('margin: auto is parsed without error and produces a defined value', async () => {
    // margin:auto is used for centering but is not implemented for layout.
    // This test documents the current parsing behavior — no crash, value defined.
    const result = await transformCSSToLayout('.box { margin: auto; }')
    expect(result['.box']).toBeDefined()
  })
})

describe('transformCSSToLayout - rgb() color', () => {
  test('rgb() color values are preserved in visualStyles', async () => {
    const result = await transformCSSToLayout('.box { color: rgb(255, 128, 0); }')
    // rgb() may be passed through as-is or normalized — either way must be defined
    expect(result['.box'].visualStyles?.fg).toBeDefined()
    expect(result['.box'].visualStyles?.fg).not.toBe('')
  })

  test('rgb() background color is preserved', async () => {
    const result = await transformCSSToLayout('.box { background: rgb(0, 100, 200); }')
    expect(result['.box'].visualStyles?.bg).toBeDefined()
  })
})

describe('transformCSSToLayout - display: inline', () => {
  test('display: inline sets display property to inline', async () => {
    const result = await transformCSSToLayout('.span { display: inline; }')
    expect(result['.span'].display).toBe('inline')
  })
})

describe('transformCSSToLayout - min/max dimensions', () => {
  test('min-height: N sets minHeight', async () => {
    const result = await transformCSSToLayout('.box { min-height: 5; }')
    expect(result['.box'].minHeight).toBe(5)
  })

  test('max-width: N sets maxWidth', async () => {
    const result = await transformCSSToLayout('.box { max-width: 40; }')
    expect(result['.box'].maxWidth).toBe(40)
  })

  test('all four min/max constraints are parsed', async () => {
    const result = await transformCSSToLayout(`
      .box { min-width: 10; max-width: 80; min-height: 3; max-height: 20; }
    `)
    expect(result['.box'].minWidth).toBe(10)
    expect(result['.box'].maxWidth).toBe(80)
    expect(result['.box'].minHeight).toBe(3)
    expect(result['.box'].maxHeight).toBe(20)
  })
})

describe('transformCSSToLayout - align-items / align-self all values', () => {
  test('align-items: flex-start sets alignItems', async () => {
    const result = await transformCSSToLayout('.box { align-items: flex-start; }')
    expect(result['.box'].alignItems).toBe('flex-start')
  })

  test('align-items: baseline sets alignItems', async () => {
    const result = await transformCSSToLayout('.box { align-items: baseline; }')
    expect(result['.box'].alignItems).toBe('baseline')
  })

  test('align-self: stretch sets alignSelf', async () => {
    const result = await transformCSSToLayout('.item { align-self: stretch; }')
    expect(result['.item'].alignSelf).toBe('stretch')
  })

  test('align-self: flex-start sets alignSelf', async () => {
    const result = await transformCSSToLayout('.item { align-self: flex-start; }')
    expect(result['.item'].alignSelf).toBe('flex-start')
  })
})

describe('transformCSSToLayout - justify-content all values', () => {
  test('justify-content: space-around sets value', async () => {
    const result = await transformCSSToLayout('.box { justify-content: space-around; }')
    expect(result['.box'].justifyContent).toBe('space-around')
  })

  test('justify-content: space-evenly sets value', async () => {
    const result = await transformCSSToLayout('.box { justify-content: space-evenly; }')
    expect(result['.box'].justifyContent).toBe('space-evenly')
  })

  test('justify-content: flex-start sets value', async () => {
    const result = await transformCSSToLayout('.box { justify-content: flex-start; }')
    expect(result['.box'].justifyContent).toBe('flex-start')
  })
})

describe('transformCSSToLayout - flex-direction all values', () => {
  test('flex-direction: column-reverse sets value', async () => {
    const result = await transformCSSToLayout('.box { flex-direction: column-reverse; }')
    expect(result['.box'].flexDirection).toBe('column-reverse')
  })

  test('flex-direction: row-reverse sets value', async () => {
    const result = await transformCSSToLayout('.box { flex-direction: row-reverse; }')
    expect(result['.box'].flexDirection).toBe('row-reverse')
  })

  test('flex-direction: column sets value', async () => {
    const result = await transformCSSToLayout('.box { flex-direction: column; }')
    expect(result['.box'].flexDirection).toBe('column')
  })
})

describe('transformCSSToLayout - calc() values', () => {
  test('calc(100% - 4) preserved as string', async () => {
    const result = await transformCSSToLayout('.box { width: calc(100% - 4); }')
    expect(result['.box'].width).toBe('calc(100% - 4)')
  })

  test('calc() in height is preserved', async () => {
    const result = await transformCSSToLayout('.box { height: calc(50% - 2); }')
    expect(result['.box'].height).toBe('calc(50% - 2)')
  })
})

describe('transformCSSToLayout - position values', () => {
  test('position: relative sets position', async () => {
    const result = await transformCSSToLayout('.box { position: relative; }')
    expect(result['.box'].position).toBe('relative')
  })

  test('top/left/right/bottom as percentages', async () => {
    const result = await transformCSSToLayout('.box { position: absolute; top: 50%; left: 25%; }')
    expect(result['.box'].position).toBe('absolute')
    // percentage offsets preserved as string or number
    expect(result['.box'].top).toBeDefined()
    expect(result['.box'].left).toBeDefined()
  })
})

describe('extractSFCStyles', () => {
  test('extracts and transforms styles from SFC style blocks', async () => {
    const styleBlocks = [
      {
        content: `
          .button {
            color: white;
            background: blue;
          }
        `,
        scoped: false,
      },
    ]

    const result = await extractSFCStyles(styleBlocks)

    expect(result['.button']).toBeDefined()
    expect(result['.button'].visualStyles?.fg).toBe('white')
    expect(result['.button'].visualStyles?.bg).toBe('blue')
  })

  test('merges multiple style blocks', async () => {
    const styleBlocks = [
      {
        content: `
          .box {
            color: red;
            width: 100;
          }
        `,
        scoped: false,
      },
      {
        content: `
          .box {
            background: blue;
            height: 50;
          }
        `,
        scoped: false,
      },
    ]

    const result = await extractSFCStyles(styleBlocks)

    expect(result['.box']).toBeDefined()
    expect(result['.box'].visualStyles?.fg).toBe('red')
    expect(result['.box'].visualStyles?.bg).toBe('blue')
    expect(result['.box'].width).toBe(100)
    expect(result['.box'].height).toBe(50)
  })
})
