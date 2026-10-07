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
