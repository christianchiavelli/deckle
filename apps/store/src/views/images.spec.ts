import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { imageSet, MAX_WIDTH_REM, stageSizes } from './images';

const MELENCOLIA = { width: 1901, height: 2400 };
const WAVE = { width: 2400, height: 1613 };

describe('imageSet', () => {
  it('names each preset by the width it comes out at, a tall print narrower than its box', () => {
    expect(imageSet('/assets/source/d6/336228.webp', MELENCOLIA, ['card', 'page'])).toBe(
      '/assets/source/d6/336228.webp?preset=card&format=webp 507w, ' +
        '/assets/source/d6/336228.webp?preset=page&format=webp 1014w',
    );
    expect(imageSet('/a.webp', WAVE, ['card'])).toBe('/a.webp?preset=card&format=webp 640w');
  });
});

describe('stageSizes', () => {
  it('narrows a tall print by its proportions, and leaves a wide one at the stage’s width', () => {
    expect(stageSizes(MELENCOLIA)).toBe(
      '(min-width: 83rem) calc(((80rem - 4rem) * 7 / 12 - 8rem) * 0.792), ' +
        '(min-width: 64rem) calc((((100vw - 3rem) - 4rem) * 7 / 12 - 8rem) * 0.792), ' +
        'calc((100vw - 7rem) * 0.792)',
    );
    expect(stageSizes(WAVE)).toMatch(/calc\(\(100vw - 7rem\) \* 1\.000\)$/);
  });

  it('knows the layout’s widest content as the tokens set it', () => {
    const css = readFileSync(
      new URL('../../../../packages/tokens/dist/tokens.css', import.meta.url),
      'utf8',
    );
    expect(css).toContain(`--p-grid-max-width: ${String(MAX_WIDTH_REM * 16)}px;`);
  });
});
