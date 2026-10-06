import { describe, expect, it } from 'vitest';
import { cssValue, type TokenLike } from './values.ts';

const token = (path: string, $type: string, $value: unknown, $description?: string): TokenLike => ({
  path: ['primitive', ...path.split('.')],
  $type,
  $value,
  ...($description === undefined ? {} : { $description }),
});

describe('cssValue', () => {
  it('writes a DTCG colour object as its lowercase hex', () => {
    const copper = { colorSpace: 'srgb', components: [0.62, 0.32, 0.18], alpha: 1, hex: '#9D522F' };
    expect(cssValue(token('color.copper.600', 'color', copper))).toBe('#9d522f');
  });

  it('puts type and space in rem, so they follow the reader’s font size', () => {
    expect(cssValue(token('font.size.20', 'dimension', { value: 20, unit: 'px' }))).toBe('1.25rem');
    expect(cssValue(token('space.24', 'dimension', { value: 24, unit: 'px' }))).toBe('1.5rem');
  });

  it('keeps radii, rules and widths in px, and rem as rem', () => {
    expect(cssValue(token('radius.control', 'dimension', { value: 10, unit: 'px' }))).toBe('10px');
    expect(cssValue(token('grid.max-width', 'dimension', { value: 1280, unit: 'px' }))).toBe(
      '1280px',
    );
    expect(cssValue(token('space.4', 'dimension', { value: 0.25, unit: 'rem' }))).toBe('0.25rem');
  });

  it('quotes only the family names that need it', () => {
    const stack = ['Host Grotesk', 'Arial', 'sans-serif'];
    expect(cssValue(token('font.family.text', 'fontFamily', stack))).toBe(
      "'Host Grotesk', Arial, sans-serif",
    );
  });

  it('writes durations, curves and weights', () => {
    expect(cssValue(token('motion.duration.quick', 'duration', { value: 150, unit: 'ms' }))).toBe(
      '150ms',
    );
    expect(cssValue(token('motion.easing.enter', 'cubicBezier', [0, 0, 0, 1]))).toBe(
      'cubic-bezier(0, 0, 0, 1)',
    );
    expect(cssValue(token('font.weight.600', 'fontWeight', 600))).toBe('600');
  });

  it('reads a number described as "em" as letter-spacing, and any other as a bare number', () => {
    expect(cssValue(token('font.tracking.display', 'number', -0.03, 'em'))).toBe('-0.03em');
    expect(cssValue(token('font.leading.body', 'number', 1.5))).toBe('1.5');
  });
});
