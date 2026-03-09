/**
 * Render‑correctness – rgb()/rgba() handling
 * Checks integer, percentage, whitespace and upper‑case variants.
 */
import { test, expect, describe } from 'bun:test';
import { h, renderCSS, cellColor } from './helpers';

describe('foreground – rgb/rgba parsing', () => {
  test('rgb integer values', async () => {
    const buf = await renderCSS(
      `.box { color: rgb(255,102,0); width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toBe('#ff6600');
  });

  test('rgba integer values (alpha applies opacity)', async () => {
    const buf = await renderCSS(
      `.box { color: rgba(255,102,0,0.5); width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    // 255*0.5=128→0x80, 102*0.5=51→0x33, 0*0.5=0→0x00 = #803300
    expect(cellColor(buf, 0, 0)).toBe('#803300');
  });

  test('rgb percentages', async () => {
    const buf = await renderCSS(
      `.box { color: rgb(100%,50%,0%); width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    // 100% → 255, 50% → 128, 0% → 0 → #ff8000
    expect(cellColor(buf, 0, 0)).toBe('#ff8000');
  });

  test('whitespace & case tolerance', async () => {
    const buf = await renderCSS(
      `.box { color: RGB ( 255 , 0 , 0 ); width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toBe('#ff0000');
  });
});
