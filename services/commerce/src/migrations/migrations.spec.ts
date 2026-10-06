import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { migrations } from './index.js';

const here = fileURLToPath(new URL('.', import.meta.url));

describe('migrations', () => {
  it('lists the class of every migration file, oldest first', async () => {
    const files = (await readdir(here)).filter((file) => /^\d+-[a-z0-9-]+\.ts$/.test(file)).sort();
    const declared = await Promise.all(
      files.map(
        async (file) => /export class (\w+)/.exec(await readFile(here + file, 'utf8'))?.[1],
      ),
    );
    expect(migrations.map(({ name }) => name)).toEqual(declared);
    const timestamps = migrations.map(({ name }) => Number(/(\d+)$/.exec(name)?.[1]));
    expect(timestamps).toEqual([...timestamps].sort((a, b) => a - b));
  });
});
