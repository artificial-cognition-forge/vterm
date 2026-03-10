/**
 * Text Wrapping Utility
 *
 * Implements CSS-compliant text wrapping for terminal rendering.
 * Supports: normal, nowrap, pre, pre-wrap, pre-line
 */

// Frame-scoped cache for text wrapping results (OPT-13)
let wrapCache: Map<string, string[]> | null = null

/**
 * Clear the text wrapping cache (should be called at the start of each layout pass)
 */
export function clearWrapCache(): void {
  wrapCache = null
}

/**
 * Enable text wrapping cache (should be called at the start of each layout pass)
 */
export function enableWrapCache(): void {
  wrapCache = new Map()
}

/**
 * Wraps text according to CSS white-space rules
 *
 * @param text - The text to wrap
 * @param width - Available width in characters
 * @param whiteSpace - CSS white-space property value (default: 'normal')
 * @returns Array of lines, each within the specified width
 */
export function wrapText(text: string, width: number, whiteSpace: string = 'normal'): string[] {
  // Check cache first (OPT-13)
  if (wrapCache) {
    const cacheKey = `${text}:${width}:${whiteSpace}`
    const cached = wrapCache.get(cacheKey)
    if (cached) return cached
  }

  if (width <= 0) {
    // Invalid width: process normally but don't wrap
    return wrapText(text, 1000, whiteSpace)
  }

  let result: string[]
  switch (whiteSpace) {
    case 'nowrap':
      result = handleNowrap(text)
      break
    case 'pre':
      result = handlePre(text, width)
      break
    case 'pre-wrap':
      result = handlePreWrap(text, width)
      break
    case 'pre-line':
      result = handlePreLine(text, width)
      break
    case 'normal':
    default:
      result = handleNormal(text, width)
      break
  }

  // Store in cache (OPT-13)
  if (wrapCache) {
    const cacheKey = `${text}:${width}:${whiteSpace}`
    wrapCache.set(cacheKey, result)
  }

  return result
}

/**
 * white-space: normal
 * - Collapses whitespace (multiple spaces → one space)
 * - Newlines treated as spaces
 * - Text wraps at word boundaries
 * - Default CSS behavior
 */
function handleNormal(text: string, width: number): string[] {
  // Normalize whitespace: collapse multiple spaces/newlines to single space
  const normalized = text
    .split(/\s+/)  // Split on any whitespace sequence
    .filter(word => word.length > 0)  // Remove empty strings
    .join(' ')  // Join with single spaces

  return wrapAtWidth(normalized, width)
}

/**
 * white-space: nowrap
 * - Collapses whitespace like normal
 * - Never wraps
 * - All text on single line
 */
function handleNowrap(text: string): string[] {
  // Normalize whitespace like normal, but don't wrap
  const normalized = text
    .split(/\s+/)
    .filter(word => word.length > 0)
    .join(' ')

  return [normalized]
}

/**
 * white-space: pre
 * - Preserves all whitespace and newlines
 * - Text wraps at explicit newlines only
 * - Lines may exceed width
 */
function handlePre(text: string, width: number): string[] {
  // Split on newlines, preserve everything else
  return text.split('\n').map(line => {
    // Preserve the line as-is, but handle very long lines
    // Split long lines at width boundaries (hard break, not word wrap)
    return wrapAtWidth(line, width, true)
  }).flat()
}

/**
 * white-space: pre-wrap
 * - Preserves all whitespace and newlines
 * - Text wraps at explicit newlines AND word boundaries
 * - Like pre but with word wrapping
 */
function handlePreWrap(text: string, width: number): string[] {
  // Split on newlines first
  const lines = text.split('\n')

  const result: string[] = []
  for (const line of lines) {
    // Each line wraps at word boundaries
    result.push(...wrapAtWidth(line, width, false))
  }

  return result
}

/**
 * white-space: pre-line
 * - Newlines are preserved
 * - Spaces are collapsed (like normal)
 * - Text wraps at explicit newlines AND word boundaries
 */
function handlePreLine(text: string, width: number): string[] {
  // Split on explicit newlines
  const lines = text.split('\n')

  const result: string[] = []
  for (const line of lines) {
    // Each line: collapse whitespace, then wrap at width
    const normalized = line
      .split(/[ \t]+/)  // Collapse spaces/tabs only (not newlines, we already split those)
      .filter(word => word.length > 0)
      .join(' ')

    result.push(...wrapAtWidth(normalized, width))
  }

  return result
}

/**
 * Wrap a single line of text at the specified width
 *
 * @param line - Text to wrap (no newlines)
 * @param width - Maximum width per line
 * @param hardBreak - If true, break at width boundary; if false, wrap at word boundaries
 * @returns Array of wrapped lines
 */
function wrapAtWidth(line: string, width: number, hardBreak: boolean = false): string[] {
  if (line.length === 0) return ['']
  if (width <= 0) return [line]

  const lines: string[] = []
  let currentLine = ''

  if (hardBreak) {
    // Hard break mode: just split at width boundaries
    for (let i = 0; i < line.length; i += width) {
      lines.push(line.slice(i, i + width))
    }
    return lines
  }

  // Soft break mode: wrap at word boundaries
  const words = line.split(' ')

  for (const word of words) {
    // If word itself is longer than width, it must be broken (no choice)
    if (word.length > width) {
      // First, flush current line if it has content
      if (currentLine.length > 0) {
        lines.push(currentLine)
        currentLine = ''
      }

      // Break the long word
      for (let i = 0; i < word.length; i += width) {
        lines.push(word.slice(i, i + width))
      }
    } else {
      // Word fits: try to add it to current line
      const testLine = currentLine.length === 0 ? word : currentLine + ' ' + word

      if (testLine.length <= width) {
        // Fits!
        currentLine = testLine
      } else {
        // Doesn't fit: start new line
        if (currentLine.length > 0) {
          lines.push(currentLine)
        }
        currentLine = word
      }
    }
  }

  // Flush remaining content
  if (currentLine.length > 0) {
    lines.push(currentLine)
  }

  return lines.length === 0 ? [''] : lines
}
