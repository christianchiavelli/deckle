import { describe, expect, it } from 'vitest';
import { sameSecret } from '../secret';
import { leaveLink, previewPage, returnPath } from './link';

describe('previewPage', () => {
  it('opens the page each document of the CMS is read on', () => {
    expect(previewPage('story', 'melencolia-i')).toBe('/prints/melencolia-i#story');
    expect(previewPage('curation', 'first-impressions')).toBe('/collections/first-impressions');
    expect(previewPage('drop-page', 'melencolia-i-numbered')).toBe('/drops/melencolia-i-numbered');
  });

  it.each([
    ['a type the store has no page for', 'journal', 'melencolia-i'],
    ["an object's own name", 'toString', 'melencolia-i'],
    ['a slug that would leave the page', 'story', '../admin'],
    ['a slug with capitals', 'curation', 'First-Impressions'],
    ['no type', null, 'melencolia-i'],
    ['no slug', 'story', null],
  ])('opens nothing for %s', (_name, type, slug) => {
    expect(previewPage(type, slug)).toBeNull();
  });
});

describe('leaveLink', () => {
  it('names the page to return to', () => {
    expect(leaveLink('/prints/melencolia-i')).toBe(
      '/api/preview/exit?path=%2Fprints%2Fmelencolia-i',
    );
  });

  it('returns to the page as it stood, query and anchor kept', () => {
    const page = '/prints?technique=engraving&century=16#story';
    const path = new URL(leaveLink(page), 'http://store.invalid').searchParams.get('path');
    expect(returnPath(path)).toBe(page);
  });
});

describe('returnPath', () => {
  it('goes back to the page preview was left from, query and anchor kept', () => {
    expect(returnPath('/prints/melencolia-i?size=A3#story')).toBe(
      '/prints/melencolia-i?size=A3#story',
    );
  });

  it.each([
    ['no path', null],
    ['another site', 'https://elsewhere.example/'],
    ['a protocol-relative address', '//elsewhere.example/'],
    ['a backslash browsers read as a slash', '/\\elsewhere.example/'],
    ['a relative path', 'prints'],
  ])('goes to the front page for %s', (_name, path) => {
    expect(returnPath(path)).toBe('/');
  });
});

describe('sameSecret', () => {
  it('matches the secret, and nothing shorter, longer or different', () => {
    const secret = 'a-preview-secret-that-is-long-enough';
    expect(sameSecret(secret, secret)).toBe(true);
    expect(sameSecret(secret.slice(1), secret)).toBe(false);
    expect(sameSecret(`${secret}!`, secret)).toBe(false);
    expect(sameSecret(`${secret.slice(0, -1)}?`, secret)).toBe(false);
  });
});
