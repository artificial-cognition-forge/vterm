import { describe, it, expect } from 'bun:test'
import { wrapText } from './text-wrapper'

describe('Text Wrapping - white-space: normal', () => {
  it('wraps text at word boundaries', () => {
    const result = wrapText('Hello world this is a test', 10, 'normal')
    expect(result).toEqual(['Hello', 'world this', 'is a test'])
  })

  it('collapses multiple spaces', () => {
    const result = wrapText('Hello    world', 20, 'normal')
    expect(result).toEqual(['Hello world'])
  })

  it('collapses newlines to spaces', () => {
    const result = wrapText('Hello\nworld', 20, 'normal')
    expect(result).toEqual(['Hello world'])
  })

  it('wraps at container width', () => {
    const result = wrapText('The quick brown fox jumps', 8, 'normal')
    expect(result).toEqual(['The', 'quick', 'brown', 'fox', 'jumps'])
  })

  it('handles empty string', () => {
    const result = wrapText('', 10, 'normal')
    expect(result).toEqual([''])
  })

  it('handles single word longer than width', () => {
    const result = wrapText('supercalifragilisticexpialidocious', 5, 'normal')
    // Word is longer than width, so it's broken at 5-char boundaries
    expect(result).toEqual(['super', 'calif', 'ragil', 'istic', 'expia', 'lidoc', 'ious'])
  })

  it('handles mixed spaces and newlines', () => {
    const result = wrapText('Hello  \n\n  world', 20, 'normal')
    expect(result).toEqual(['Hello world'])
  })

  it('width of 1', () => {
    const result = wrapText('abc', 1, 'normal')
    expect(result).toEqual(['a', 'b', 'c'])
  })
})

describe('Text Wrapping - white-space: nowrap', () => {
  it('never wraps text', () => {
    const result = wrapText('This is a very long line that should not wrap', 10, 'nowrap')
    expect(result).toEqual(['This is a very long line that should not wrap'])
  })

  it('collapses whitespace like normal', () => {
    const result = wrapText('Hello    world', 100, 'nowrap')
    expect(result).toEqual(['Hello world'])
  })

  it('collapses newlines', () => {
    const result = wrapText('Hello\nworld', 100, 'nowrap')
    expect(result).toEqual(['Hello world'])
  })
})

describe('Text Wrapping - white-space: pre', () => {
  it('preserves newlines', () => {
    const result = wrapText('Hello\nworld', 20, 'pre')
    expect(result).toEqual(['Hello', 'world'])
  })

  it('preserves multiple spaces', () => {
    const result = wrapText('Hello    world', 20, 'pre')
    expect(result).toEqual(['Hello    world'])
  })

  it('does not wrap at word boundaries (only at newlines)', () => {
    const result = wrapText('Hello world this is test', 5, 'pre')
    // In pre mode, very long lines are hard-broken to fit terminal width
    expect(result).toEqual(['Hello', ' worl', 'd thi', 's is ', 'test'])
  })

  it('handles empty lines', () => {
    const result = wrapText('Hello\n\nworld', 20, 'pre')
    expect(result).toEqual(['Hello', '', 'world'])
  })

  it('hard breaks very long lines', () => {
    const result = wrapText('supercalifragilistic', 5, 'pre')
    expect(result).toEqual(['super', 'calif', 'ragil', 'istic'])
  })
})

describe('Text Wrapping - white-space: pre-wrap', () => {
  it('preserves newlines and wraps at word boundaries', () => {
    const result = wrapText('Hello world\nthis is test', 8, 'pre-wrap')
    expect(result).toEqual(['Hello', 'world', 'this is', 'test'])
  })

  it('preserves multiple spaces', () => {
    const result = wrapText('Hello    world', 20, 'pre-wrap')
    expect(result).toEqual(['Hello    world'])
  })

  it('wraps long words', () => {
    const result = wrapText('supercalifragilistic', 5, 'pre-wrap')
    expect(result).toEqual(['super', 'calif', 'ragil', 'istic'])
  })

  it('handles multiple newlines', () => {
    const result = wrapText('Hello\n\nworld', 20, 'pre-wrap')
    expect(result).toEqual(['Hello', '', 'world'])
  })
})

describe('Text Wrapping - white-space: pre-line', () => {
  it('preserves newlines', () => {
    const result = wrapText('Hello\nworld', 20, 'pre-line')
    expect(result).toEqual(['Hello', 'world'])
  })

  it('collapses spaces within lines', () => {
    const result = wrapText('Hello    world', 20, 'pre-line')
    expect(result).toEqual(['Hello world'])
  })

  it('wraps at word boundaries within lines', () => {
    const result = wrapText('The quick brown\nfox jumps over', 8, 'pre-line')
    // "fox jumps" is 9 chars, exceeds width of 8, so wraps
    expect(result).toEqual(['The', 'quick', 'brown', 'fox', 'jumps', 'over'])
  })

  it('preserves empty lines', () => {
    const result = wrapText('Hello\n\nworld', 20, 'pre-line')
    expect(result).toEqual(['Hello', '', 'world'])
  })

  it('collapses multiple spaces but preserves tabs', () => {
    // Note: pre-line collapses only spaces/tabs, not all whitespace
    const result = wrapText('Hello  \t  world', 20, 'pre-line')
    expect(result).toEqual(['Hello world'])
  })
})

describe('Text Wrapping - Edge Cases', () => {
  it('handles width of 0 gracefully', () => {
    const result = wrapText('hello world', 0, 'normal')
    // Width 0 is invalid, returns the text normalized on one line
    expect(result).toEqual(['hello world'])
  })

  it('handles very long single word with normal wrapping', () => {
    const word = 'a'.repeat(50)
    const result = wrapText(word, 10, 'normal')
    expect(result.length).toBe(5)
    expect(result[0]).toBe('a'.repeat(10))
  })

  it('handles text with only spaces', () => {
    const result = wrapText('     ', 10, 'normal')
    expect(result).toEqual([''])
  })

  it('handles text with tabs', () => {
    const result = wrapText('hello\t\tworld', 20, 'normal')
    expect(result).toEqual(['hello world'])
  })

  it('handles mixed line endings', () => {
    const result = wrapText('line1\nline2\nline3', 20, 'normal')
    expect(result).toEqual(['line1 line2 line3'])
  })
})

describe('Text Wrapping - Real World Examples', () => {
  it('wraps sentence at terminal width', () => {
    const text = 'Here are the files in the current directory. You have a vterm.config.ts file.'
    const result = wrapText(text, 40, 'normal')
    expect(result.every(line => line.length <= 40)).toBe(true)
    expect(result.join(' ').replace(/\s+/g, ' ')).toBe(text)
  })

  it('code block with pre mode', () => {
    const code = 'function hello()\n  console.log("hi")\nend'
    const result = wrapText(code, 20, 'pre')
    expect(result).toEqual([
      'function hello()',
      '  console.log("hi")',
      'end'
    ])
  })

  it('terminal output with preserved formatting', () => {
    const output = 'drwxr-xr-x  5 user user 4096 Mar  8 10:23 .'
    const result = wrapText(output, 50, 'pre')
    expect(result).toEqual([output])
  })

  it('paragraph wrapping', () => {
    const para = 'The quick brown fox jumps over the lazy dog. This is a test of the text wrapping system.'
    const result = wrapText(para, 25, 'normal')
    expect(result.every(line => line.length <= 25)).toBe(true)
  })
})
