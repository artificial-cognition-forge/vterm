/**
 * Render‑correctness – full CSS‑3 named colours
 * Representative samples; the parser test covers the exhaustive list.
 */
import { test, expect, describe } from 'bun:test';
import { h, renderCSS, cellColor } from './helpers';

const samples = [
  { name: 'aliceblue', hex: '#f0f8ff' },
  { name: 'rebeccapurple', hex: '#663399' },
  { name: 'goldenrod', hex: '#daa520' },
  { name: 'lightgray', hex: '#d3d3d3' },
  { name: 'darkslategray', hex: '#2f4f4f' },
];

describe('foreground – CSS named colours', () => {
  for (const { name, hex } of samples) {
    test(`named colour ${name}`, async () => {
      const buf = await renderCSS(
        `.box { color: ${name}; width: 1; height: 1; }`,
        h('div', { class: 'box' }, 'X')
      );
      expect(cellColor(buf, 0, 0)).toBe(hex);
    });
  }
});
