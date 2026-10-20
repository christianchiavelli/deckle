/** The sizes commerce's asset server renders a master at: its presets, and nothing else. */
export type ImagePreset = 'thumb' | 'card' | 'page' | 'zoom';

/**
 * A master's address at one of the asset server's presets, as WebP. The
 * server refuses free-form sizes, so a page asks only for these: `thumb` for
 * a search suggestion, `card` for tiles, `page` for a work's own picture,
 * `zoom` for the whole master.
 */
export function imageAt(url: string, preset: ImagePreset): string {
  return `${url}${url.includes('?') ? '&' : '?'}preset=${preset}&format=webp`;
}

/** Each preset's box, in pixels: commerce fits a master inside it and keeps its proportions. */
const BOX: Readonly<Record<ImagePreset, number>> = {
  thumb: 160,
  card: 640,
  page: 1280,
  zoom: 2400,
};

/**
 * A master at several presets, as a `srcset` the browser picks from by the
 * width `sizes` gives it. Each file is named by the width it comes out at: a
 * print taller than wide fills its box's height, so it comes out narrower.
 */
export function imageSet(
  url: string,
  master: { readonly width: number; readonly height: number },
  presets: readonly ImagePreset[],
): string {
  return presets
    .map((preset) => {
      const scale = Math.min(1, BOX[preset] / master.width, BOX[preset] / master.height);
      return `${imageAt(url, preset)} ${String(Math.round(master.width * scale))}w`;
    })
    .join(', ');
}

/** The widest the content gets, `--p-grid-max-width`: a test holds the two equal. */
export const MAX_WIDTH_REM = 80;

/**
 * How wide a print is drawn on a stage beside its words, for `sizes`, which is
 * read before any CSS. On a phone the stage is square and the page's width,
 * less the gutters (1.5rem a side) and its insets (2rem); from `md` it takes
 * its share of the content (7 of 12 on a work's page and the front page, 5 of
 * 11 on a drop's), less the gap between columns (4rem) and its insets (4rem).
 * A print taller than wide is drawn narrower by its proportions, so a phone
 * asks for the smallest file that is still sharp on it.
 */
export function stageSizes(
  master: { readonly width: number; readonly height: number },
  [takes, of]: readonly [takes: number, of: number] = [7, 12],
): string {
  const ratio = Math.min(1, master.width / master.height).toFixed(3);
  const column = (content: string) =>
    `calc(((${content} - 4rem) * ${String(takes)} / ${String(of)} - 8rem) * ${ratio})`;
  return [
    `(min-width: ${String(MAX_WIDTH_REM + 3)}rem) ${column(`${String(MAX_WIDTH_REM)}rem`)}`,
    `(min-width: 64rem) ${column('(100vw - 3rem)')}`,
    `calc((100vw - 7rem) * ${ratio})`,
  ].join(', ');
}
