import { describe, expect, it } from 'vitest';
import { contrastRatio, relativeLuminance } from './contrast.ts';

describe('contrast', () => {
  it('matches the WCAG reference values', () => {
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#000000')).toBe(0);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    // WebAIM's checker gives #767676 on white as 4.54:1, the lightest grey that passes AA.
    expect(contrastRatio('#767676', '#ffffff')).toBeCloseTo(4.54, 2);
  });

  it('is the same whichever colour is in front', () => {
    expect(contrastRatio('#9d522f', '#fcfaf6')).toBe(contrastRatio('#fcfaf6', '#9d522f'));
  });

  it('accepts hex with or without the hash, and refuses anything else', () => {
    expect(relativeLuminance('9D522F')).toBe(relativeLuminance('#9d522f'));
    expect(() => relativeLuminance('#fff')).toThrow(/#rrggbb/);
    expect(() => relativeLuminance('rgb(0 0 0)')).toThrow(/#rrggbb/);
  });
});
