/**
 * WCAG 2.2 contrast between two sRGB colours, and the pairs the interface
 * relies on. A token change that drops a pair below its floor fails the build.
 */

function channel(hex: string, offset: number): number {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const digits = hex.replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(digits)) {
    throw new Error(`Expected a #rrggbb colour, got ${hex}`);
  }
  return 0.2126 * channel(digits, 0) + 0.7152 * channel(digits, 2) + 0.0722 * channel(digits, 4);
}

export function contrastRatio(foreground: string, background: string): number {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort(
    (a, b) => b - a,
  ) as [number, number];
  return (lighter + 0.05) / (darker + 0.05);
}

export interface ContrastPair {
  foreground: string;
  background: string;
  /** 7 for body text that must read at a glance, 4.5 for text, 3 for large text and controls. */
  minimum: number;
}

/** Semantic paths (`text.primary`) on the surfaces they are used on. */
export const contrastPairs: readonly ContrastPair[] = [
  { foreground: 'text.primary', background: 'surface.page', minimum: 7 },
  { foreground: 'text.secondary', background: 'surface.page', minimum: 4.5 },
  { foreground: 'text.secondary', background: 'surface.band', minimum: 4.5 },
  { foreground: 'text.muted', background: 'surface.page', minimum: 4.5 },
  { foreground: 'text.accent', background: 'surface.page', minimum: 4.5 },
  { foreground: 'text.accent', background: 'surface.band', minimum: 4.5 },
  { foreground: 'text.on-feature', background: 'surface.feature', minimum: 4.5 },
  { foreground: 'text.on-deep', background: 'surface.deep', minimum: 7 },
  { foreground: 'text.on-deep-secondary', background: 'surface.deep', minimum: 4.5 },
  { foreground: 'text.on-action', background: 'action.primary', minimum: 4.5 },
  { foreground: 'text.on-accent', background: 'accent.default', minimum: 4.5 },
  { foreground: 'accent.default', background: 'surface.page', minimum: 3 },
  { foreground: 'focus.ring', background: 'surface.page', minimum: 3 },
  { foreground: 'stroke.strong', background: 'surface.page', minimum: 3 },
  { foreground: 'feedback.error', background: 'surface.page', minimum: 4.5 },
  { foreground: 'component.announce.text', background: 'component.announce.surface', minimum: 4.5 },
];
