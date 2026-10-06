/**
 * The dashboard in Deckle's colours and typeface. Vendure's theme takes shadcn's
 * colour keys and a few of its own, merged over its defaults; each one is filled
 * here from the token build, so the panel follows the tokens instead of a copy.
 */

/** The parts of the token build's foundations.json this reads. */
export interface Foundations {
  readonly colours: readonly {
    readonly token: string;
    readonly light: { readonly hex: string };
    readonly dark: { readonly hex: string };
  }[];
  readonly type: readonly { readonly role: string; readonly family: string }[];
}

type Scheme = 'light' | 'dark';

export type DashboardTheme = Record<Scheme, Record<string, string>>;

/**
 * The token behind each key. The surfaces are set per theme because elevation
 * runs the other way on ink: on paper a card is the lightest sheet over a darker
 * page, on ink it is a shade up from the darkest surface, as Vendure draws them.
 * Hover and the open section of the menu take the copper tint, the menu's text
 * the copper ink, so the accent shows where the editor is.
 */
const fills: Record<string, string | Record<Scheme, string>> = {
  background: { light: 'surface.band', dark: 'surface.page' },
  foreground: 'text.primary',
  card: { light: 'surface.page', dark: 'surface.band' },
  'card-foreground': 'text.primary',
  popover: { light: 'surface.page', dark: 'surface.band' },
  'popover-foreground': 'text.primary',
  primary: 'action.primary',
  'primary-foreground': 'text.on-action',
  secondary: 'surface.sheet',
  'secondary-foreground': 'text.primary',
  muted: 'surface.sheet',
  'muted-foreground': 'text.secondary',
  accent: 'accent.subtle',
  'accent-foreground': 'text.primary',
  destructive: 'feedback.error',
  'destructive-foreground': 'text.on-action',
  success: 'feedback.success',
  'success-foreground': 'text.on-action',
  warning: 'feedback.warning',
  'warning-foreground': 'text.on-action',
  border: 'stroke.subtle',
  input: 'stroke.default',
  ring: 'focus.ring',
  sidebar: { light: 'surface.page', dark: 'surface.band' },
  'sidebar-foreground': 'text.primary',
  'sidebar-primary': 'action.primary',
  'sidebar-primary-foreground': 'text.on-action',
  'sidebar-accent': 'accent.subtle',
  'sidebar-accent-foreground': 'text.accent',
  'sidebar-border': 'stroke.subtle',
  'sidebar-ring': 'focus.ring',
  brand: 'accent.default',
  'dev-mode': 'accent.default',
  'dev-mode-foreground': 'text.on-accent',
};

export function dashboardTheme(foundations: Foundations): DashboardTheme {
  const colour = (token: string, scheme: Scheme): string => {
    const found = foundations.colours.find((entry) => entry.token === token);
    if (!found) {
      throw new Error(`The token build has no colour ${token}`);
    }
    return found[scheme].hex;
  };
  const family = (role: string): string => {
    const found = foundations.type.find((entry) => entry.role === role);
    if (!found) {
      throw new Error(`The token build has no type role ${role}`);
    }
    return found.family;
  };
  // Geist Mono stays for IDs and codes: Deckle has no monospace face.
  const fonts = {
    'font-sans': family('body'),
    'font-body': family('body'),
    'font-heading': family('heading-1'),
  };
  const theme = (scheme: Scheme) => ({
    ...Object.fromEntries(
      Object.entries(fills).map(([key, fill]) => [
        key,
        colour(typeof fill === 'string' ? fill : fill[scheme], scheme),
      ]),
    ),
    ...fonts,
  });
  return { light: theme('light'), dark: theme('dark') };
}
