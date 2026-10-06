import { describe, expect, it } from 'vitest';
import { aliasIntoPrimitives, collectionOf, namespaced } from './collections.ts';

describe('collections', () => {
  it('knows each token file by its name, on any platform', () => {
    expect(collectionOf('tokens/primitives.tokens.json')).toBe('primitive');
    expect(collectionOf('D:\\deckle\\tokens\\semantic.dark.tokens.json')).toBe('dark');
    expect(collectionOf('tokens/roles.tokens.json')).toBe('role');
    expect(collectionOf('tokens/extra.tokens.json')).toBeUndefined();
  });

  it('reads primitives as they are, into their own namespace', () => {
    const contents = JSON.stringify({ radius: { control: { $type: 'dimension', $value: 'x' } } });
    expect(namespaced('primitives.tokens.json', contents)).toEqual({
      primitive: { radius: { control: { $type: 'dimension', $value: 'x' } } },
    });
  });

  it('points every alias of a role or a mode at the primitives', () => {
    const contents = JSON.stringify({
      radius: { control: { $type: 'dimension', $value: '{radius.control}' } },
    });
    expect(namespaced('roles.tokens.json', contents)).toEqual({
      role: { radius: { control: { $type: 'dimension', $value: '{primitive.radius.control}' } } },
    });
  });

  it('rewrites aliases inside arrays and leaves other values alone', () => {
    expect(aliasIntoPrimitives({ a: ['{x.y}', 2, null], b: { c: true } })).toEqual({
      a: ['{primitive.x.y}', 2, null],
      b: { c: true },
    });
  });

  it('refuses a file that is not one of the collections', () => {
    expect(() => namespaced('tokens/extra.tokens.json', '{}')).toThrow(/Not a token collection/);
  });
});
