/**
 * Render‑correctness – mixed fg & bg using different syntaxes
 */
import { test, expect, describe } from 'bun:test';
import { h, renderCSS, cellColor, cellBg } from './helpers';

describe('foreground + background combination', () => {
  test('fg from hsl, bg from #RGB', async () => {
    const buf = await renderCSS(
      `.box { color: hsl(120,100%,25%); background: #f60; width: 1; height: 1; }`,
      h('div', { class: 'box' })
    );
    // hsl(120,100%,25%) ≈ #008000 (dark green)
    expect(cellColor(buf, 0, 0)).toBe('#008000');
    expect(cellBg(buf, 0, 0)).toBe('#ff6600');
  });
});
