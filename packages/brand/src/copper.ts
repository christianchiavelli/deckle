import type { Copper } from './favicon.js';

/** A semantic colour as the token build writes it in foundations.json. */
export interface Colour {
  readonly token: string;
  readonly light: { readonly hex: string };
  readonly dark: { readonly hex: string };
}

/**
 * The accent's two values out of the token build's semantic colours. The caller
 * reads foundations.json and passes its colours in, so the brand imports no data
 * and loads the same way in Node, in a bundler and in the browser.
 */
export function copperFrom(colours: readonly Colour[]): Copper {
  const accent = colours.find((colour) => colour.token === 'accent.default');
  if (!accent) {
    throw new Error('The token build has no accent.default');
  }
  return { light: accent.light.hex, dark: accent.dark.hex };
}
