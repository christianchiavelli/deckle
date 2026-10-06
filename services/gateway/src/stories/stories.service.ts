import { Injectable, Logger } from '@nestjs/common';
import { CmsClient } from '../cms/cms.client.js';
import type { CmsStory } from '../cms/cms.responses.js';
import { lexicalToBlocks, safeHref } from '../cms/lexical/lexical-to-blocks.js';
import type { Source, Story } from './story.model.js';

@Injectable()
export class StoriesService {
  private readonly logger = new Logger(StoriesService.name);

  constructor(private readonly cms: CmsClient) {}

  /** The story of each work, in the order asked, null where none is published: one CMS call. */
  async forArtworks(artworkSlugs: readonly string[]): Promise<(Story | null)[]> {
    const stories = await this.cms.storiesForArtworks(artworkSlugs);
    const byArtwork = new Map(stories.map((story) => [story.artworkSlug, story]));
    return artworkSlugs.map((slug) => {
      const story = byArtwork.get(slug);
      return story === undefined ? null : this.toStory(story);
    });
  }

  private toStory(story: CmsStory): Story {
    const body = lexicalToBlocks(story.body);
    const warnings = [...body.warnings];
    const sources: Source[] = story.sources.map((source) => {
      const url = source.url === null ? null : safeHref(source.url);
      if (source.url !== null && url === null) {
        warnings.push(`dropped the unsafe address of the source "${source.label}"`);
      }
      return { label: source.label, url };
    });
    for (const warning of warnings) {
      this.logger.warn(`The story of ${story.artworkSlug}: ${warning}`);
    }
    return {
      title: story.title,
      lede: story.lede,
      blocks: [...body.blocks],
      sources,
      updatedAt: story.updatedAt,
    };
  }
}
