import sharp from 'sharp';

export interface MasterSettings {
  readonly format: 'webp' | 'jpg';
  /** The master's longest side, in pixels; an original smaller than this keeps its own size. */
  readonly longEdge: number;
  readonly quality: number;
}

/**
 * The reduced master every service reads. More pixels at a lower quality kept
 * more of the engraved line under zoom than fewer pixels at a higher one, for
 * the same bytes: measured in docs/adr/XXXX-reduced-masters.md.
 */
export const MASTER: MasterSettings = { format: 'webp', longEdge: 2400, quality: 60 };

export interface Master {
  readonly data: Buffer;
  readonly width: number;
  readonly height: number;
}

/**
 * Turns an original into the master: upright, no larger than `longEdge`, in
 * sRGB and with every piece of metadata dropped (sharp keeps none unless asked).
 * The same original and settings give the same bytes, which the importer relies
 * on to rewrite nothing when nothing changed.
 */
export async function encodeMaster(
  input: string | Buffer,
  { format, longEdge, quality }: MasterSettings,
): Promise<Master> {
  const resized = sharp(input, { failOn: 'error' })
    .autoOrient()
    .resize({ width: longEdge, height: longEdge, fit: 'inside', withoutEnlargement: true })
    .toColourspace('srgb');
  const encoded =
    format === 'webp'
      ? resized.webp({ quality, effort: 6, smartSubsample: true })
      : resized.jpeg({ quality, mozjpeg: true });
  const { data, info } = await encoded.toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height };
}
