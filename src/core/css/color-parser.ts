/**
 * Basic terminal colors supported by blessed
 */
const BASIC_COLORS = [
  'black', 'red', 'green', 'yellow', 'blue', 'magenta', 'cyan', 'white',
  'gray', 'grey', 'brightblack', 'brightred', 'brightgreen', 'brightyellow',
  'brightblue', 'brightmagenta', 'brightcyan', 'brightwhite'
] as const

/**
 * CSS named colors mapped to hex values
 * Full CSS3 color list
 */
const CSS_COLORS: Record<string, string> = {
  aliceblue: '#f0f8ff',
  antiquewhite: '#faebd7',
  aqua: '#00ffff',
  aquamarine: '#7fffd4',
  azure: '#f0ffff',
  beige: '#f5f5dc',
  bisque: '#ffe4c4',
  blanchedalmond: '#ffebcd',
  blueviolet: '#8a2be2',
  brown: '#a52a2a',
  burlywood: '#deb887',
  cadetblue: '#5f9ea0',
  chartreuse: '#7fff00',
  chocolate: '#d2691e',
  coral: '#ff7f50',
  cornflowerblue: '#6495ed',
  cornsilk: '#fff8dc',
  crimson: '#dc143c',
  darkblue: '#00008b',
  darkcyan: '#008b8b',
  darkgoldenrod: '#b8860b',
  darkgray: '#a9a9a9',
  darkgrey: '#a9a9a9',
  darkgreen: '#006400',
  darkkhaki: '#bdb76b',
  darkmagenta: '#8b008b',
  darkolivegreen: '#556b2f',
  darkorange: '#ff8c00',
  darkorchid: '#9932cc',
  darkred: '#8b0000',
  darksalmon: '#e9967a',
  darkseagreen: '#8fbc8f',
  darkslateblue: '#483d8b',
  darkslategray: '#2f4f4f',
  darkslategrey: '#2f4f4f',
  darkturquoise: '#00ced1',
  darkviolet: '#9400d3',
  deeppink: '#ff1493',
  deepskyblue: '#00bfff',
  dimgray: '#696969',
  dimgrey: '#696969',
  dodgerblue: '#1e90ff',
  firebrick: '#b22222',
  floralwhite: '#fffaf0',
  forestgreen: '#228b22',
  fuchsia: '#ff00ff',
  gainsboro: '#dcdcdc',
  ghostwhite: '#f8f8ff',
  gold: '#ffd700',
  goldenrod: '#daa520',
  greenyellow: '#adff2f',
  honeydew: '#f0fff0',
  hotpink: '#ff69b4',
  indianred: '#cd5c5c',
  indigo: '#4b0082',
  ivory: '#fffff0',
  khaki: '#f0e68c',
  lavender: '#e6e6fa',
  lavenderblush: '#fff0f5',
  lawngreen: '#7cfc00',
  lemonchiffon: '#fffacd',
  lightblue: '#add8e6',
  lightcoral: '#f08080',
  lightcyan: '#e0ffff',
  lightgoldenrodyellow: '#fafad2',
  lightgray: '#d3d3d3',
  lightgrey: '#d3d3d3',
  lightgreen: '#90ee90',
  lightpink: '#ffb6c1',
  lightsalmon: '#ffa07a',
  lightseagreen: '#20b2aa',
  lightskyblue: '#87cefa',
  lightslategray: '#778899',
  lightslategrey: '#778899',
  lightsteelblue: '#b0c4de',
  lightyellow: '#ffffe0',
  lime: '#00ff00',
  limegreen: '#32cd32',
  linen: '#faf0e6',
  maroon: '#800000',
  mediumaquamarine: '#66cdaa',
  mediumblue: '#0000cd',
  mediumorchid: '#ba55d3',
  mediumpurple: '#9370db',
  mediumseagreen: '#3cb371',
  mediumslateblue: '#7b68ee',
  mediumspringgreen: '#00fa9a',
  mediumturquoise: '#48d1cc',
  mediumvioletred: '#c71585',
  midnightblue: '#191970',
  mintcream: '#f5fffa',
  mistyrose: '#ffe4e1',
  moccasin: '#ffe4b5',
  navajowhite: '#ffdead',
  navy: '#000080',
  oldlace: '#fdf5e6',
  olive: '#808000',
  olivedrab: '#6b8e23',
  orange: '#ffa500',
  orangered: '#ff4500',
  orchid: '#da70d6',
  palegoldenrod: '#eee8aa',
  palegreen: '#98fb98',
  paleturquoise: '#afeeee',
  palevioletred: '#db7093',
  papayawhip: '#ffefd5',
  peachpuff: '#ffdab9',
  peru: '#cd853f',
  pink: '#ffc0cb',
  plum: '#dda0dd',
  powderblue: '#b0e0e6',
  purple: '#800080',
  rebeccapurple: '#663399',
  rosybrown: '#bc8f8f',
  royalblue: '#4169e1',
  saddlebrown: '#8b4513',
  salmon: '#fa8072',
  sandybrown: '#f4a460',
  seagreen: '#2e8b57',
  seashell: '#fff5ee',
  sienna: '#a0522d',
  silver: '#c0c0c0',
  skyblue: '#87ceeb',
  slateblue: '#6a5acd',
  slategray: '#708090',
  slategrey: '#708090',
  snow: '#fffafa',
  springgreen: '#00ff7f',
  steelblue: '#4682b4',
  tan: '#d2b48c',
  teal: '#008080',
  thistle: '#d8bfd8',
  tomato: '#ff6347',
  turquoise: '#40e0d0',
  violet: '#ee82ee',
  wheat: '#f5deb3',
  whitesmoke: '#f5f5f5',
  yellowgreen: '#9acd32',
}

/**
 * Convert HSL to RGB
 */
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100
  l /= 100

  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = l - c / 2

  let r = 0, g = 0, b = 0

  if (h >= 0 && h < 60) {
    r = c; g = x; b = 0
  } else if (h >= 60 && h < 120) {
    r = x; g = c; b = 0
  } else if (h >= 120 && h < 180) {
    r = 0; g = c; b = x
  } else if (h >= 180 && h < 240) {
    r = 0; g = x; b = c
  } else if (h >= 240 && h < 300) {
    r = x; g = 0; b = c
  } else if (h >= 300 && h < 360) {
    r = c; g = 0; b = x
  }

  return [
    Math.round((r + m) * 255),
    Math.round((g + m) * 255),
    Math.round((b + m) * 255)
  ]
}

/**
 * Parse a color value from CSS to blessed format
 * Supports: basic colors, CSS named colors, hex colors, rgb/rgba, hsl/hsla, 256-color palette
 * All CSS named colors are converted to hex for maximum terminal compatibility
 */
export function parseColor(value: string): string | null {
  value = value.trim().toLowerCase()

  // Hex colors - blessed supports these directly
  if (value.startsWith('#')) {
    // Strip alpha channel if present (8-digit hex: #RRGGBBAA)
    // Terminals don't support alpha, so we just use RGB portion
    if (value.length === 9) {
      return value.substring(0, 7) // #RRGGBB
    }
// Also handle short form with alpha (#RGBA)
      if (value.length === 5) {
        // Convert #RGBA to #RRGGBB (expand and strip alpha)
        const r = value[1]
        const g = value[2]
        const b = value[3]
        return `#${r}${r}${g}${g}${b}${b}`
      }
      // Handle 3‑digit hex shorthand (#RGB) – expand to #RRGGBB
      if (value.length === 4) {
        const r = value[1]
        const g = value[2]
        const b = value[3]
        return `#${r}${r}${g}${g}${b}${b}`
      }
      return value
  }

  // RGB/RGBA - convert to hex (supports percentages and whitespace)
  if (value.startsWith('rgb')) {
    const start = value.indexOf('(');
    const end = value.lastIndexOf(')');
    if (start === -1 || end === -1) return null;
    const inner = value.slice(start + 1, end);
    const parts = inner.split(',').map(p => p.trim());
    if (parts.length >= 3) {
      const to255 = (v: string) => {
        if (v.endsWith('%')) {
          return Math.round(parseFloat(v) * 2.55);
        }
        return parseInt(v, 10);
      };
      const r = to255(parts[0]!);
      const g = to255(parts[1]!);
      const b = to255(parts[2]!);
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }
  }

  // HSL/HSLA - convert to hex
  if (value.startsWith('hsl')) {
    const match = value.match(/hsla?\(\s*(\d+)\s*,\s*(\d+)%?\s*,\s*(\d+)%?/)
    if (match && match[1] && match[2] && match[3]) {
      const h = parseInt(match[1])
      const s = parseInt(match[2])
      const l = parseInt(match[3])

      const [r, g, b] = hslToRgb(h, s, l)

      // Convert to hex
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
    }
  }

  // 256-color palette (0-255) - blessed supports these as numbers
  const colorIndex = parseInt(value)
  if (!isNaN(colorIndex) && colorIndex >= 0 && colorIndex <= 255) {
    return colorIndex.toString()
  }

  // CSS named colors - convert to hex for compatibility
if (CSS_COLORS[value]) {
      // CSS named color converted to hex – ensure string type
      return CSS_COLORS[value] as string
    }

  // Basic terminal colors - keep as-is (terminals understand these natively)
  if (BASIC_COLORS.includes(value as any)) {
    return value
  }

  // Fallback - return as-is
  return value
}

/**
 * Parse border shorthand: "1px solid blue" → { fg: 'blue' }
 */
export function parseBorder(value: string): { fg?: string; bg?: string } | null {
  const parts = value.trim().split(/\s+/)
  const borderStyle: { fg?: string; bg?: string } = {}

  // Keywords that are not colors
  const borderKeywords = new Set(['none', 'solid', 'dashed', 'dotted', 'double', 'groove', 'ridge', 'inset', 'outset', 'line', 'heavy', 'bg', 'ascii'])

  // Look for color in the parts
  for (const part of parts) {
    if (!borderKeywords.has(part) && !part.match(/^\d/)) {
      const parsed = parseColor(part);
      if (parsed !== null) borderStyle.fg = parsed;
      break
    }
  }

  return Object.keys(borderStyle).length > 0 ? borderStyle : null
}
