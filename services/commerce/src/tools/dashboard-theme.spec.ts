import foundations from '@deckle/tokens/foundations.json' with { type: 'json' };
import { describe, expect, it } from 'vitest';
import { dashboardTheme } from './dashboard-theme.js';

const hex = (token: string, scheme: 'light' | 'dark') =>
  foundations.colours.find((entry) => entry.token === token)?.[scheme].hex;

describe('dashboardTheme', () => {
  const theme = dashboardTheme(foundations);

  it('fills each colour key from the token build, in both themes', () => {
    expect(theme.light['primary']).toBe(hex('action.primary', 'light'));
    expect(theme.dark['primary']).toBe(hex('action.primary', 'dark'));
    expect(theme.light['ring']).toBe(hex('focus.ring', 'light'));
    expect(theme.dark['brand']).toBe(hex('accent.default', 'dark'));
    for (const scheme of ['light', 'dark'] as const) {
      for (const [key, value] of Object.entries(theme[scheme])) {
        if (!key.startsWith('font-')) {
          expect(value, `${scheme} ${key}`).toMatch(/^#[0-9a-f]{6}$/);
        }
      }
    }
  });

  it('raises a card off the page on paper and on ink alike', () => {
    expect(theme.light['card']).toBe(hex('surface.page', 'light'));
    expect(theme.light['background']).toBe(hex('surface.band', 'light'));
    expect(theme.dark['card']).toBe(hex('surface.band', 'dark'));
    expect(theme.dark['background']).toBe(hex('surface.page', 'dark'));
  });

  it("sets the store's typeface for text and headings", () => {
    expect(theme.light['font-body']).toMatch(/^'Host Grotesk'/);
    expect(theme.dark['font-heading']).toMatch(/^'Host Grotesk'/);
    expect(theme.light).not.toHaveProperty('font-mono');
  });

  it('refuses a token build without a colour or a type role it reads', () => {
    expect(() => dashboardTheme({ ...foundations, colours: [] })).toThrow(/no colour/);
    expect(() => dashboardTheme({ ...foundations, type: [] })).toThrow(/no type role body/);
  });
});
