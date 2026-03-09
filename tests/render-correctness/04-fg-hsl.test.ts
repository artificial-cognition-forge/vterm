/**
 * Render‑correctness – hsl()/hsla() handling
 * Accepts deg, rad, grad, turn units and percentages.
 */
import { test, expect, describe } from 'bun:test';
import { h, renderCSS, cellColor } from './helpers';

describe('foreground – hsl/hsla parsing', () => {
  test('hsl with degrees', async () => {
    const buf = await renderCSS(
      `.box { color: hsl(24, 100%, 50%); width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    // ≈ #ff6600
    expect(cellColor(buf, 0, 0)).toMatch(/^#ff6600$/i);
  });

  test('hsla (alpha applies opacity)', async () => {
    const buf = await renderCSS(
      `.box { color: hsla(24,100%,50%,0.3); width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    // hsl(24,100%,50%) = #ff6600; with alpha 0.3: 255*0.3=76.5→77, 102*0.3=30.6→31, 0*0.3=0
    // Result: #4d1f00
    expect(cellColor(buf, 0, 0)).toMatch(/^#4d1f00$/i);
  });

  test('angle units – rad', async () => {
    const rad = (24 * Math.PI) / 180;
    const buf = await renderCSS(
      `.box { color: hsl(${rad}rad, 100%, 50%); width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toMatch(/^#ff6600$/i);
  });

  test('angle units – turn', async () => {
    const turn = 24 / 360;
    const buf = await renderCSS(
      `.box { color: hsl(${turn}turn, 100%, 50%); width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toMatch(/^#ff6600$/i);
  });
});
