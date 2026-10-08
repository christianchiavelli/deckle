import type { IncomingMessage } from 'node:http';
import { describe, expect, it } from 'vitest';
import { languageOf } from './language.js';

const accepting = (header?: string) =>
  ({ headers: header === undefined ? {} : { 'accept-language': header } }) as IncomingMessage;

describe('languageOf', () => {
  it('reads Portuguese for the store’s Portuguese edition', () => {
    expect(languageOf(accepting('pt-BR'))).toBe('pt');
    expect(languageOf(accepting('pt'))).toBe('pt');
    expect(languageOf(accepting('pt-BR,pt;q=0.9,en;q=0.8'))).toBe('pt');
  });

  it('reads English for English, for no header and for a language the store does not write', () => {
    expect(languageOf(accepting('en'))).toBe('en');
    expect(languageOf(accepting())).toBe('en');
    expect(languageOf(accepting('fr-FR,de;q=0.7'))).toBe('en');
  });

  it('follows the weights, not the order', () => {
    expect(languageOf(accepting('en;q=0.4, pt-BR;q=0.8'))).toBe('pt');
    expect(languageOf(accepting('pt;q=0.3, en-GB'))).toBe('en');
  });

  it('takes the first of two equally welcome, and none that is refused or malformed', () => {
    expect(languageOf(accepting('pt, en'))).toBe('pt');
    expect(languageOf(accepting('pt;q=0, en;q=0.1'))).toBe('en');
    expect(languageOf(accepting('pt;q=abc, en;q=0.1'))).toBe('en');
    expect(languageOf(accepting(' , ;q=1'))).toBe('en');
  });
});
