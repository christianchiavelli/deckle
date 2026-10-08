import { describe, expect, it } from 'vitest';
import { previewUrl, previewUrlFor } from './preview-url';

const base = 'http://localhost:8080/api/preview';
const secret = 'preview-secret-with/odd&characters=000';

describe('previewUrl', () => {
  it('adds the secret, the type and the slug to the store preview address', () => {
    const url = new URL(previewUrl(base, secret, { type: 'story', slug: 'melencolia-i' }));
    expect(url.origin + url.pathname).toBe(base);
    expect(Object.fromEntries(url.searchParams)).toEqual({
      secret,
      type: 'story',
      slug: 'melencolia-i',
    });
  });

  it('opens the Portuguese edition for a document edited in Portuguese, and English as is', () => {
    const inPortuguese = new URL(
      previewUrl(base, secret, { type: 'story', slug: 'melencolia-i', locale: 'pt' }),
    );
    expect(inPortuguese.searchParams.get('locale')).toBe('pt');
    const inEnglish = new URL(
      previewUrl(base, secret, { type: 'story', slug: 'melencolia-i', locale: 'en' }),
    );
    expect(inEnglish.searchParams.has('locale')).toBe(false);
  });

  it('keeps any query the store address already has', () => {
    const url = new URL(previewUrl(`${base}?v=2`, secret, { type: 'drop-page', slug: 'x' }));
    expect(url.searchParams.get('v')).toBe('2');
    expect(url.searchParams.get('type')).toBe('drop-page');
  });
});

describe('previewUrlFor', () => {
  it('builds the address once the document has a slug', () => {
    expect(previewUrlFor(base, secret, 'curation', 'first-impressions')).toContain(
      'slug=first-impressions',
    );
  });

  it('passes the locale being edited on', () => {
    expect(previewUrlFor(base, secret, 'curation', 'first-impressions', 'pt')).toContain(
      'locale=pt',
    );
  });

  it.each([[undefined], [null], [''], [42]])('hides preview while the slug is %j', (slug) => {
    expect(previewUrlFor(base, secret, 'story', slug)).toBeNull();
  });
});
