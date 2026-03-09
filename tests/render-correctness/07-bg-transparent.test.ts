/**
 * Render‑correctness – transparent backgrounds
 * Covers both the CSS keyword and opacity‑based transparency.
 */
import { test, expect, describe } from 'bun:test';
import { h, renderCSS, cellBg } from './helpers';

describe('background – transparency handling', () => {
  test('background: transparent clears fill', async () => {
    const buf = await renderCSS(
      `.box { background: transparent; width: 1; height: 1; }`,
      h('div', { class: 'box' })
    );
    expect(cellBg(buf, 0, 0)).toBeNull();
  });

  test('opacity < 1 suppresses background fill', async () => {
    const buf = await renderCSS(
      `.box { background: magenta; opacity: 0.4; width: 2; height: 1; }`,
      h('div', { class: 'box' })
    );
    expect(cellBg(buf, 0, 0)).toBeNull();
    expect(cellBg(buf, 1, 0)).toBeNull();
  });

  test('opacity = 1 retains background', async () => {
    const buf = await renderCSS(
      `.box { background: magenta; opacity: 1; width: 1; height: 1; }`,
      h('div', { class: 'box' })
    );
    expect(cellBg(buf, 0, 0)).toBe('magenta');
  });
});
