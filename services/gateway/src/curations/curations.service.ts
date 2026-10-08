import { Injectable } from '@nestjs/common';
import { CmsClient, type CmsReading } from '../cms/cms.client.js';
import type { CmsCuration } from '../cms/cms.responses.js';
import type { Curation } from './curation.model.js';

const toCuration = (curation: CmsCuration): Curation => ({
  slug: curation.slug,
  title: curation.title,
  intro: curation.intro,
  updatedAt: curation.updatedAt,
  artworkSlugs: curation.artworks,
});

@Injectable()
export class CurationsService {
  constructor(private readonly cms: CmsClient) {}

  async list(reading: CmsReading = {}): Promise<Curation[]> {
    return (await this.cms.curations(reading)).map(toCuration);
  }

  async bySlug(slug: string, reading: CmsReading = {}): Promise<Curation | null> {
    const curation = await this.cms.curationBySlug(slug, reading);
    return curation === null ? null : toCuration(curation);
  }
}
