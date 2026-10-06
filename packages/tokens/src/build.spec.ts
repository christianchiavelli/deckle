import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import StyleDictionary from 'style-dictionary';
import { afterEach, describe, expect, it } from 'vitest';
import { createConfig } from './config.ts';

/** Every output file by name, formatted in memory: nothing is written. */
async function format(source?: string[]) {
  const dictionary = new StyleDictionary(createConfig(source === undefined ? {} : { source }));
  const files = await dictionary.formatPlatform('web');
  return Object.fromEntries(
    files.map((file) => [basename(file.destination ?? ''), String(file.output)]),
  );
}

describe('the tokens as built', () => {
  it('match the reviewed output, so no token changes unseen', async () => {
    const outputs = await format();
    for (const [destination, output] of Object.entries(outputs)) {
      expect(output).toMatchSnapshot(destination);
    }
  });

  it('keep every pair the interface relies on above its contrast floor, in both modes', async () => {
    const { contrast } = JSON.parse((await format())['foundations.json'] ?? '{}') as {
      contrast: {
        foreground: string;
        background: string;
        minimum: number;
        light: number;
        dark: number;
      }[];
    };
    expect(contrast.length).toBeGreaterThan(0);
    for (const pair of contrast) {
      const label = `${pair.foreground} on ${pair.background}`;
      expect(pair.light, `${label}, light`).toBeGreaterThanOrEqual(pair.minimum);
      expect(pair.dark, `${label}, dark`).toBeGreaterThanOrEqual(pair.minimum);
    }
  });

  it('give components semantic tokens only, never a primitive', async () => {
    const outputs = await format();
    expect(outputs['index.js']).not.toMatch(/--p-/);
    expect(outputs['index.d.ts']).not.toMatch(/--p-/);
    expect(outputs['tokens.css']).toMatch(/--surface-page: light-dark\(var\(--p-color-/);
  });
});

describe('the token contract', () => {
  let directory: string | undefined;

  afterEach(async () => {
    if (directory !== undefined) {
      await rm(directory, { recursive: true, force: true });
    }
  });

  const colour = (hex: string) => ({
    $type: 'color',
    $value: { colorSpace: 'srgb', components: [0, 0, 0], alpha: 1, hex },
  });

  /** Writes a set of collections and returns the glob that reads them. */
  async function fixture(files: Record<string, object>): Promise<string[]> {
    directory = await mkdtemp(join(tmpdir(), 'deckle-tokens-'));
    for (const [name, contents] of Object.entries(files)) {
      await writeFile(join(directory, name), JSON.stringify(contents));
    }
    return [`${directory.replaceAll('\\', '/')}/*.tokens.json`];
  }

  const primitives = { color: { ink: colour('#111111'), paper: colour('#fafafa') } };
  const page = (alias: string) => ({ surface: { page: { $type: 'color', $value: alias } } });

  it('needs every semantic token in both modes', async () => {
    const source = await fixture({
      'primitives.tokens.json': primitives,
      'semantic.light.tokens.json': {
        ...page('{color.paper}'),
        text: { primary: { $type: 'color', $value: '{color.ink}' } },
      },
      'semantic.dark.tokens.json': page('{color.ink}'),
      'roles.tokens.json': {},
    });
    await expect(format(source)).rejects.toThrow(/both modes; missing: text\.primary \(dark\)/);
  });

  it('needs a dark token to have a light twin too', async () => {
    const source = await fixture({
      'primitives.tokens.json': primitives,
      'semantic.light.tokens.json': page('{color.paper}'),
      'semantic.dark.tokens.json': {
        ...page('{color.ink}'),
        text: { primary: { $type: 'color', $value: '{color.paper}' } },
      },
      'roles.tokens.json': {},
    });
    await expect(format(source)).rejects.toThrow(/missing: text\.primary \(light\)/);
  });

  it('needs every semantic token to alias a primitive rather than hold a value', async () => {
    const source = await fixture({
      'primitives.tokens.json': primitives,
      'semantic.light.tokens.json': { surface: { page: colour('#fafafa') } },
      'semantic.dark.tokens.json': page('{color.ink}'),
      'roles.tokens.json': {},
    });
    await expect(format(source)).rejects.toThrow(/surface\.page must alias exactly one primitive/);
  });

  it('refuses two tokens that would reach components under one name', async () => {
    const source = await fixture({
      'primitives.tokens.json': {
        ...primitives,
        space: { 16: { $type: 'dimension', $value: { value: 16, unit: 'px' } } },
      },
      'semantic.light.tokens.json': page('{color.paper}'),
      'semantic.dark.tokens.json': page('{color.ink}'),
      'roles.tokens.json': { surface: { page: { $type: 'dimension', $value: '{space.16}' } } },
    });
    await expect(format(source)).rejects.toThrow(/Two tokens become surface\.page/);
  });

  it('refuses a token nested under another token’s name', async () => {
    const source = await fixture({
      'primitives.tokens.json': {
        ...primitives,
        space: { 16: { $type: 'dimension', $value: { value: 16, unit: 'px' } } },
      },
      'semantic.light.tokens.json': page('{color.paper}'),
      'semantic.dark.tokens.json': page('{color.ink}'),
      'roles.tokens.json': {
        surface: { page: { inset: { $type: 'dimension', $value: '{space.16}' } } },
      },
    });
    await expect(format(source)).rejects.toThrow(
      /role\.surface\.page\.inset collides with a token named page/,
    );
  });

  it('fails when a contrast pair names a token the set does not have', async () => {
    const source = await fixture({
      'primitives.tokens.json': primitives,
      'semantic.light.tokens.json': page('{color.paper}'),
      'semantic.dark.tokens.json': page('{color.ink}'),
      'roles.tokens.json': {},
    });
    await expect(format(source)).rejects.toThrow(/Contrast pair names a missing token/);
  });
});
