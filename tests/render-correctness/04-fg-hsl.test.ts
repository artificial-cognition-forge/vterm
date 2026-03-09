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

  test('hsla (alpha ignored)', async () => {
    const buf = await renderCSS(
      `.box { color: hsla(24,100%,50%,0.3); width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toMatch(/^#ff6600$/i);
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
