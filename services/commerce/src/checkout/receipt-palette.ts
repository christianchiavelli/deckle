import foundations from '@deckle/tokens/foundations.json' with { type: 'json' };

/** The parts of the token build's foundations.json the receipt reads. */
export interface Foundations {
  readonly colours: readonly {
    readonly token: string;
    readonly light: { readonly hex: string };
    readonly dark: { readonly hex: string };
  }[];
}

/**
 * The token behind each colour the receipt's template names. A mail app reads
 * no custom properties, so the template gets the hex of each, in both themes:
 * light written inline, dark in the styles of the mail apps that follow the
 * reader's theme.
 */
const ROLES = {
  band: 'surface.band',
  page: 'surface.page',
  sheet: 'surface.sheet',
  deep: 'surface.deep',
  text: 'text.primary',
  secondary: 'text.secondary',
  accentText: 'text.accent',
  accent: 'accent.default',
  accentSubtle: 'accent.subtle',
  onAccent: 'text.on-accent',
  stroke: 'stroke.subtle',
  strokeOnSheet: 'stroke.default',
  onDeep: 'text.on-deep',
  onDeepSecondary: 'text.on-deep-secondary',
} as const;

export type Palette = Readonly<Record<keyof typeof ROLES, string>>;

export function paletteOf(from: Foundations, scheme: 'light' | 'dark'): Palette {
  return Object.fromEntries(
    Object.entries(ROLES).map(([role, token]) => {
      const found = from.colours.find((entry) => entry.token === token);
      if (found === undefined) {
        throw new Error(`The token build has no ${token} for the receipt's ${role}`);
      }
      return [role, found[scheme].hex];
    }),
  ) as Palette;
}

/** The receipt's colours in both themes, from the tokens the store and the panels read. */
export const RECEIPT_PALETTE = {
  light: paletteOf(foundations, 'light'),
  dark: paletteOf(foundations, 'dark'),
} as const;
