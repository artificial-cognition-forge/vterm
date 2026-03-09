/**
 * Render‑correctness – Foreground basic colours
 * Covers terminal named colours and 256‑colour palette indexes.
 */
import { test, expect, describe } from 'bun:test';
import { h, renderCSS, cellColor } from './helpers';

describe('foreground – terminal named colours & palette indexes', () => {
  const named = [
    'black', 'red', 'green', 'yellow',
    'blue', 'magenta', 'cyan', 'white',
    'brightblack', 'brightred', 'brightgreen',
    'brightyellow', 'brightblue', 'brightmagenta',
    'brightcyan', 'brightwhite',
  ];

  for (const name of named) {
    test(`fg: ${name}`, async () => {
      const buf = await renderCSS(
        `.box { color: ${name}; width: 1; height: 1; }`,
        h('div', { class: 'box' }, 'X')
      );
      expect(cellColor(buf, 0, 0)).toBe(name);
    });
  }

  test('fg: 123 (256‑colour index)', async () => {
    const buf = await renderCSS(
      `.box { color: 123; width: 1; height: 1; }`,
      h('div', { class: 'box' }, 'X')
    );
    expect(cellColor(buf, 0, 0)).toBe('123');
  });
});
