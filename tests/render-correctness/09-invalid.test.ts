/**
 * Render‑correctness – unknown colour strings
 * Renderer must not crash and must leave colour undefined.
 */
import { test, expect, describe } from 'bun:test';
import { h, renderCSS, cellColor, cellBg } from './helpers';

describe('invalid colour handling', () => {
  test('unknown fg string', async () => {
    const buf = await renderCSS(
      `.box { color: not-a-colour; width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toBeNull();
  });

  test('unknown bg string', async () => {
    const buf = await renderCSS(
      `.box { background: definitely-not; width: 1; height: 1; }`,
      h('div', { class: 'box' })
    );
    expect(cellBg(buf, 0, 0)).toBeNull();
  });
});
