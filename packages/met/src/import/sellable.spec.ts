import { describe, expect, it } from 'vitest';
import melencolia from '../api/fixtures/336228-melencolia-i.json' with { type: 'json' };
import theLetter from '../api/fixtures/352204-the-letter-not-public-domain.json' with { type: 'json' };
import { metObjectSchema } from '../api/met-object.js';
import { assertSellable, CurationError } from './sellable.js';

const durer = metObjectSchema.parse(melencolia);

describe('assertSellable', () => {
  it('lets a public-domain work with an image and a firm attribution through', () => {
    expect(() => {
      assertSellable(durer, 'melencolia-i');
    }).not.toThrow();
  });

  it('refuses a work The Met does not flag as public domain, however old', () => {
    expect(() => {
      assertSellable(metObjectSchema.parse(theLetter), 'the-letter');
    }).toThrow(new CurationError('the-letter is not in the public domain'));
  });

  it('refuses a work without an open-access image', () => {
    expect(() => {
      assertSellable({ ...durer, primaryImage: '' }, 'x');
    }).toThrow('no open-access image');
  });

  it.each(['After', 'after', 'Attributed to', 'Workshop of', 'Issued by', '(?)', 'Circle of'])(
    'refuses an attribution qualified as "%s"',
    (artistPrefix) => {
      expect(() => {
        assertSellable({ ...durer, artistPrefix }, 'x');
      }).toThrow(CurationError);
    },
  );

  it('refuses a publisher named in place of the maker, but not an artist who published', () => {
    expect(() => {
      assertSellable({ ...durer, artistRole: 'Publisher' }, 'x');
    }).toThrow('(Publisher)');
    expect(() => {
      assertSellable({ ...durer, artistRole: 'Artist and publisher' }, 'x');
    }).not.toThrow();
    expect(() => {
      assertSellable({ ...durer, artistPrefix: 'Designed and etched by' }, 'x');
    }).not.toThrow();
  });
});
