import foundations from '@deckle/tokens/foundations.json' with { type: 'json' };
import type { Copper } from './favicon.ts';

interface Colour {
  readonly token: string;
  readonly light: { readonly hex: string };
  readonly dark: { readonly hex: string };
}

/** The accent's two values out of a list of semantic colours. */
export function copperFrom(colours: readonly Colour[]): Copper {
  const accent = colours.find((colour) => colour.token === 'accent.default');
  if (!accent) {
    throw new Error('The token build has no accent.default');
  }
  return { light: accent.light.hex, dark: accent.dark.hex };
}

/** The accent's two values, from the token build: never a copy of them. */
export const copper = () => copperFrom(foundations.colours);
