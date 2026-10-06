import foundations from '@deckle/tokens/foundations.json';
import { create } from 'storybook/theming';
import { seal } from '../src/brand/seal.ts';

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

/*
 * The sidebar's title is the store's own lockup, the seal and the name set as
 * an imprint. Storybook renders a title without an image as HTML.
 */
const lockup = [
  '<span style="display: inline-flex; align-items: center; gap: 10px">',
  `<svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true"><path fill="${light('icon.accent')}" fill-rule="evenodd" d="${seal}"/></svg>`,
  '<span style="font-weight: 600; letter-spacing: 0.22em; text-transform: uppercase">Deckle</span>',
  `<span style="color: ${light('text.secondary')}; font-size: 12px; font-weight: 500; white-space: nowrap">design system</span>`,
  '</span>',
].join('');

/** Storybook in Deckle's light theme: its sidebar and toolbar, and the docs pages. */
export const theme = create({
  base: 'light',
  brandTitle: lockup,
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
