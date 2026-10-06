import type { FieldHookArgs, PayloadRequest, TextField, TypeWithID } from 'payload';
import { describe, expect, it } from 'vitest';
import { isSlug, validateSlug, validateSlugList } from './slug';
import { blankToNull } from './text';
import { isHttpUrl, validateHttpUrl } from './url';

/** The slice of a validation call Payload's own `text` check reads. */
const options = (required: boolean) =>
  ({
    required,
    req: { payload: { config: {} }, t: (key: string) => key },
  }) as unknown as Parameters<typeof validateSlug>[1] & TextField;

const manyOptions = (required: boolean) =>
  options(required) as unknown as Parameters<typeof validateSlugList>[1];

/** The same call from an editor who reads the admin in Portuguese. */
const inPortuguese = (required: boolean) =>
  ({
    required,
    req: { payload: { config: {} }, t: (key: string) => key, i18n: { language: 'pt' } },
  }) as unknown as Parameters<typeof validateSlug>[1] & TextField;

describe('slugs', () => {
  it.each(['melencolia-i', 'the-rhinoceros', 'a', '1830-32', 'under-the-wave-off-kanagawa'])(
    'accepts %s',
    (slug) => {
      expect(isSlug(slug)).toBe(true);
      expect(validateSlug(slug, options(true))).toBe(true);
    },
  );

  it.each([
    'The-Rhinoceros',
    'the rhinoceros',
    '-the-rhinoceros',
    'the--rhinoceros',
    'rhinocéros',
    '',
  ])('rejects %j', (slug) => {
    expect(isSlug(slug)).toBe(false);
  });

  it('explains the format when a slug is malformed', () => {
    expect(validateSlug('The_Rhinoceros', options(true))).toMatch(/^Use lowercase letters/);
  });

  it("leaves a missing value to Payload's required check", () => {
    expect(validateSlug(undefined, options(true))).toBe('validation:required');
    expect(validateSlug(undefined, options(false))).toBe(true);
  });
});

describe('slug lists', () => {
  it('accepts well-formed, distinct slugs in any order', () => {
    expect(validateSlugList(['the-rhinoceros', 'melencolia-i'], manyOptions(true))).toBe(true);
  });

  it('asks for at least one artwork only when required', () => {
    expect(validateSlugList([], manyOptions(true))).toBe('Add at least one artwork');
    expect(validateSlugList(null, manyOptions(true))).toBe('Add at least one artwork');
    expect(validateSlugList([], manyOptions(false))).toBe(true);
  });

  it('names the malformed slugs', () => {
    expect(validateSlugList(['melencolia-i', 'Bad Slug'], manyOptions(true))).toMatch(
      /^Not a slug: Bad Slug\./,
    );
  });

  it('names each slug listed twice, once', () => {
    const value = ['melencolia-i', 'the-rhinoceros', 'melencolia-i', 'melencolia-i'];
    expect(validateSlugList(value, manyOptions(true))).toBe('Listed more than once: melencolia-i');
  });
});

describe('http URLs', () => {
  it.each([
    'https://www.metmuseum.org/art/collection/search/45434',
    'http://example.org/',
    'https://example.org/a?b=c#d',
  ])('accepts %s', (url) => {
    expect(isHttpUrl(url)).toBe(true);
    expect(validateHttpUrl(url, options(true))).toBe(true);
  });

  it.each([
    'javascript:alert(1)',
    'mailto:someone@example.org',
    '/relative/path',
    'https://',
    'www.metmuseum.org',
    'ftp://example.org/file',
  ])('rejects %s', (url) => {
    expect(isHttpUrl(url)).toBe(false);
    expect(validateHttpUrl(url, options(true))).toMatch(/^Use an absolute http\(s\) URL/);
  });

  it("leaves a missing value to Payload's required check", () => {
    expect(validateHttpUrl('', options(true))).toBe('validation:required');
    expect(validateHttpUrl(null, options(false))).toBe(true);
  });
});

describe("messages in the editor's language", () => {
  const many = inPortuguese(true) as unknown as Parameters<typeof validateSlugList>[1];

  it('explains a malformed slug or URL in Portuguese', () => {
    expect(validateSlug('The_Rhinoceros', inPortuguese(true))).toMatch(/^Use letras minúsculas/);
    expect(validateHttpUrl('javascript:alert(1)', inPortuguese(true))).toMatch(
      /^Use uma URL absoluta/,
    );
  });

  it('words every slug list problem in Portuguese', () => {
    expect(validateSlugList([], many)).toBe('Adicione ao menos uma obra');
    expect(validateSlugList(['Bad Slug'], many)).toMatch(/^Não é um slug: Bad Slug\. Use letras/);
    expect(validateSlugList(['melencolia-i', 'melencolia-i'], many)).toBe(
      'Repetido na lista: melencolia-i',
    );
  });
});

describe('blankToNull', () => {
  const run = (value: unknown) =>
    blankToNull({ value, req: {} as PayloadRequest } as FieldHookArgs<TypeWithID, string | null>);

  it('stores an empty or blank text as null', () => {
    expect(run('')).toBeNull();
    expect(run('   \n')).toBeNull();
  });

  it('keeps written text, and absent values, as they are', () => {
    expect(run('Five prints to start with.')).toBe('Five prints to start with.');
    expect(run(undefined)).toBeUndefined();
    expect(run(null)).toBeNull();
  });
});
