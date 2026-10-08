import { describe, expect, it } from 'vitest';
import { editionNamed, editionsFromHere, editionsOf, pageOf, switchedPath } from './editions';

describe('pageOf', () => {
  it('names the page without its edition, as the browser and the proxy write it', () => {
    expect(pageOf('/pt-br/prints/melencolia-i')).toBe('/prints/melencolia-i');
    expect(pageOf('/en/prints/melencolia-i')).toBe('/prints/melencolia-i');
    expect(pageOf('/prints/melencolia-i')).toBe('/prints/melencolia-i');
  });

  it('takes an edition for the front page, and only a whole segment for an edition', () => {
    expect(pageOf('/pt-br')).toBe('/');
    expect(pageOf('/en')).toBe('/');
    expect(pageOf('/')).toBe('/');
    expect(pageOf('/engravings')).toBe('/engravings');
    expect(pageOf('/pt-brazil')).toBe('/pt-brazil');
  });

  it('keeps the query, on the front page too', () => {
    expect(pageOf('/pt-br/search?q=durer')).toBe('/search?q=durer');
    expect(pageOf('/pt-br?q=durer')).toBe('/?q=durer');
  });
});

describe('editionsOf', () => {
  it('leads to the page in each edition, the reader’s marked', () => {
    expect(editionsOf('/prints', 'pt-br')).toEqual([
      { name: 'English', short: 'EN', lang: 'en', href: '/prints', current: false },
      { name: 'Português', short: 'PT', lang: 'pt-BR', href: '/pt-br/prints', current: true },
    ]);
    expect(editionsOf('/', 'en').map(({ href, current }) => [href, current])).toEqual([
      ['/', true],
      ['/pt-br', false],
    ]);
  });
});

describe('editionNamed', () => {
  it('finds the edition a link names, and none the store does not have', () => {
    expect(editionNamed('pt-BR')).toBe('pt-br');
    expect(editionNamed('en')).toBe('en');
    expect(editionNamed('fr')).toBeUndefined();
  });
});

describe('editionsFromHere', () => {
  it('asks the store for the page in each edition, the reader’s marked', () => {
    expect(editionsFromHere('en').map(({ href, current }) => [href, current])).toEqual([
      ['/api/edition?to=en', true],
      ['/api/edition?to=pt-br', false],
    ]);
  });
});

describe('switchedPath', () => {
  const host = 'localhost:8080';

  it('leads to the page the browser came from, query kept, in the edition asked for', () => {
    expect(switchedPath('pt-br', 'http://localhost:8080/prints?technique=etchings', host)).toBe(
      '/pt-br/prints?technique=etchings',
    );
    expect(switchedPath('en', 'http://localhost:8080/pt-br/search?q=d%C3%BCrer', host)).toBe(
      '/search?q=d%C3%BCrer',
    );
    expect(switchedPath('pt-br', 'http://localhost:8080/', host)).toBe('/pt-br');
  });

  it.each([
    ['no page named', null, host],
    ['no host known', 'http://localhost:8080/prints', null],
    ['an address it cannot read', 'not a url', host],
    ['another site', 'https://elsewhere.example/prints', host],
  ])('leads to the front page for %s', (_name, referer, at) => {
    expect(switchedPath('pt-br', referer, at)).toBe('/pt-br');
  });

  it('never leaves the store, whatever the path says', () => {
    expect(switchedPath('en', 'http://localhost:8080//elsewhere.example/x', host)).toBe('/');
  });
});
