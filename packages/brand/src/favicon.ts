import { seal } from './seal.js';

export interface Copper {
  /** The accent on paper, for a light tab strip. */
  readonly light: string;
  /** The accent on ink, for a dark one. */
  readonly dark: string;
}

/**
 * The favicon: the seal in the accent copper. Its own media query picks the
 * light or dark copper, so the mark keeps its contrast whichever theme the
 * browser draws its tabs in.
 */
export function favicon({ light, dark }: Copper): string {
  return [
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">',
    `  <style>path { fill: ${light} } @media (prefers-color-scheme: dark) { path { fill: ${dark} } }</style>`,
    `  <path fill-rule="evenodd" d="${seal}"/>`,
    '</svg>',
    '',
  ].join('\n');
}
