import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { makeJpeg } from '../test/images.js';
import { encodeMaster, MASTER } from './master.js';

const settings = { format: 'webp', longEdge: 64, quality: 80 } as const;

describe('encodeMaster', () => {
  it('scales the original down to the long edge, keeping its proportions', async () => {
    const original = Buffer.from(await makeJpeg(400, 300, { noise: true }));
    const master = await encodeMaster(original, settings);
    expect([master.width, master.height]).toEqual([64, 48]);
    const meta = await sharp(master.data).metadata();
    expect([meta.format, meta.width, meta.height]).toEqual(['webp', 64, 48]);
  });

  it('never enlarges an original smaller than the long edge', async () => {
    const master = await encodeMaster(Buffer.from(await makeJpeg(40, 20)), settings);
    expect([master.width, master.height]).toEqual([40, 20]);
  });

  it('turns an original stored on its side upright, then drops the orientation tag', async () => {
    const original = Buffer.from(await makeJpeg(80, 40, { orientation: 6 }));
    const master = await encodeMaster(original, settings);
    expect([master.width, master.height]).toEqual([32, 64]);
    expect((await sharp(master.data).metadata()).orientation).toBeUndefined();
  });

  it('converts a wide-gamut original to sRGB and keeps no profile or EXIF', async () => {
    const red = await sharp({
      create: { width: 16, height: 16, channels: 3, background: { r: 255, g: 0, b: 0 } },
    })
      .withIccProfile('p3')
      .withExif({ IFD0: { Copyright: 'someone' } })
      .png()
      .toBuffer();
    expect((await sharp(red).metadata()).hasProfile).toBe(true);

    // Stored as Display P3, sRGB red is about (234, 51, 35). Had the profile
    // been dropped without converting, those numbers would now read as sRGB.
    const master = await encodeMaster(red, { ...settings, format: 'jpg', quality: 95 });
    const meta = await sharp(master.data).metadata();
    expect(meta.hasProfile).toBe(false);
    expect(meta.exif).toBeUndefined();
    expect(meta.space).toBe('srgb');
    const pixel = await sharp(master.data).raw().toBuffer();
    expect(pixel[0]).toBeGreaterThan(245);
    expect(pixel[1]).toBeLessThan(15);
  });

  it('gives the same bytes for the same original and settings', async () => {
    const original = Buffer.from(await makeJpeg(300, 200, { noise: true }));
    const [first, second] = await Promise.all([
      encodeMaster(original, settings),
      encodeMaster(original, settings),
    ]);
    expect(first.data.equals(second.data)).toBe(true);
  });

  it('is set to a format the catalog schema accepts', () => {
    expect(['jpg', 'webp']).toContain(MASTER.format);
    expect(MASTER.longEdge).toBeGreaterThanOrEqual(1600);
  });
});
