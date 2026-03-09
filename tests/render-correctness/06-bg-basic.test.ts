/**
 * Render‑correctness – background colours (basic names & palette index)
 */
import { test, expect, describe } from 'bun:test';
import { h, renderCSS, cellBg } from './helpers';

describe('background – basic colours & palette index', () => {
  test('bg: blue (named)', async () => {
    const buf = await renderCSS(
      `.box { background: blue; width: 2; height: 1; }`,
      h('div', { class: 'box' })
    );
    expect(cellBg(buf, 0, 0)).toBe('blue');
    expect(cellBg(buf, 1, 0)).toBe('blue');
  });

  test('bg: 45 (256‑palette index)', async () => {
    const buf = await renderCSS(
      `.box { background: 45; width: 1; height: 1; }`,
      h('div', { class: 'box' })
    );
    expect(cellBg(buf, 0, 0)).toBe('45');
  });
});
