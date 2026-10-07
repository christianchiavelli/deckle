import type { JournalQuery } from '../gateway/generated';
import type { Detail } from '@deckle/ui';
import { imageAt } from './images';

type JournalWork = JournalQuery['artworks']['edges'][number]['node'];

export interface JournalEntry {
  readonly slug: string;
  /** The work's title, which names the card. */
  readonly title: string;
  /** The story's own title, above it: "About the engraving". */
  readonly kicker: string;
  readonly lede: string | null;
  readonly image: {
    readonly src: string;
    readonly width: number;
    readonly height: number;
    readonly detail: Detail;
  };
}

/** The whole print, for a story whose editor chose no detail. */
export const WHOLE_PRINT: Detail = { x: 50, y: 50, zoom: 1 };

/**
 * The journal: every work that has a story and a picture, the newest story
 * first. A story lives on its print's page, so the entry leads there.
 */
export function journalOf(works: readonly JournalWork[]): JournalEntry[] {
  return works
    .flatMap((work) =>
      work.story && work.image ? [{ work, story: work.story, image: work.image }] : [],
    )
    .sort((a, b) => Date.parse(b.story.updatedAt) - Date.parse(a.story.updatedAt))
    .map(({ work, story, image }) => ({
      slug: work.slug,
      title: work.title,
      kicker: story.title,
      lede: story.lede,
      image: {
        src: imageAt(image.url, 'page'),
        width: image.width,
        height: image.height,
        detail: story.detail ?? WHOLE_PRINT,
      },
    }));
}

/** Where a story is read: on its print's page, at the story. */
export const storyHref = (slug: string) => `/prints/${slug}#story`;
