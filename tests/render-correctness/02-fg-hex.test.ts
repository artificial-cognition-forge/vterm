/**
 * Render‑correctness – hex colour handling
 * Tests #RRGGBB, #RGB, #RGBA, #RRGGBBAA (alpha stripped).
 */
import { test, expect, describe } from 'bun:test';
import { h, renderCSS, cellColor } from './helpers';

describe('foreground – hex expansions & alpha stripping', () => {
  test('#RRGGBB passes through', async () => {
    const buf = await renderCSS(
      `.box { color: #ff6600; width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toBe('#ff6600');
  });

  test('#RGB expands to #RRGGBB', async () => {
    const buf = await renderCSS(
      `.box { color: #f60; width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toBe('#ff6600');
  });

  test('#RGBA expands and drops alpha', async () => {
    const buf = await renderCSS(
      `.box { color: #f60a; width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toBe('#ff6600');
  });

  test('#RRGGBBAA strips alpha', async () => {
    const buf = await renderCSS(
      `.box { color: #ff6600aa; width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toBe('#ff6600');
  });
});
