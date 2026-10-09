import { describe, expect, it } from 'vitest';
import { paletteOf, RECEIPT_PALETTE } from './receipt-palette.js';

describe('the receipt palette', () => {
  it('takes every colour from the tokens, light and dark', () => {
    expect(RECEIPT_PALETTE.light).toMatchObject({ page: '#fcfaf6', text: '#17130f' });
    expect(RECEIPT_PALETTE.dark).toMatchObject({ page: '#17130f', text: '#f0e9df' });
    for (const scheme of [RECEIPT_PALETTE.light, RECEIPT_PALETTE.dark]) {
      for (const hex of Object.values(scheme)) {
        expect(hex).toMatch(/^#[0-9a-f]{6}$/);
      }
    }
  });

  it('refuses a token build that lacks one', () => {
    expect(() => paletteOf({ colours: [] }, 'light')).toThrow(/surface\.band/);
  });
});
