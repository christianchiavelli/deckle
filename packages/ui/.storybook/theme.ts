import foundations from '@deckle/tokens/foundations.json';
import { create } from 'storybook/theming';

/**
 * Storybook's own chrome cannot read CSS variables, so it takes the light
 * theme's hex values from the token build, never a copy of them.
 */
function light(token: string): string {
  const colour = foundations.colours.find((entry) => entry.token === token);
  if (!colour) {
    throw new Error(`No colour token named ${token}`);
  }
  return colour.light.hex;
}

const body = foundations.type.find((role) => role.role === 'body');

/** Storybook in Deckle's light theme: its sidebar and toolbar, and the docs pages. */
export const theme = create({
  base: 'light',
  brandTitle: 'Deckle · design system',
  brandUrl: 'https://github.com/christianchiavelli/deckle',
  brandTarget: '_blank',
  colorPrimary: light('accent.default'),
  colorSecondary: light('accent.default'),
  appBg: light('surface.band'),
  appContentBg: light('surface.page'),
  appPreviewBg: light('surface.page'),
  appBorderColor: light('stroke.subtle'),
  appBorderRadius: 10,
  textColor: light('text.primary'),
  textMutedColor: light('text.secondary'),
  textInverseColor: light('text.on-action'),
  barBg: light('surface.page'),
  barTextColor: light('text.secondary'),
  barSelectedColor: light('accent.default'),
  barHoverColor: light('text.accent'),
  inputBg: light('surface.page'),
  inputBorder: light('stroke.default'),
  inputTextColor: light('text.primary'),
  fontBase: body?.family ?? 'sans-serif',
});
