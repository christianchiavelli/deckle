import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { z } from 'zod';
import type { Env } from '../config/env.js';
import { sendUpstream } from '../upstream/http.js';
import {
  UpstreamContractError,
  UpstreamHttpError,
  UpstreamUnavailableError,
} from '../upstream/upstream-errors.js';
import {
  type CmsCuration,
  type CmsDropPage,
  type CmsStory,
  cmsCurationSchema,
  cmsDropPageSchema,
  cmsStorySchema,
  payloadList,
} from './cms.responses.js';

/**
 * The Payload collection that holds the gateway's read-only user. Payload's API-key
 * header names it: `Authorization: <collection slug> API-Key <key>`.
 */
export const CMS_API_KEY_COLLECTION = 'users';

const CMS_TIMEOUT_MS = 5000;
const MAX_CURATIONS = 100;

/**
 * The gateway's CMS user can read drafts, because preview goes through it. Every
 * query here asks for published documents only, and `find` drops a draft that
 * comes back anyway, unless the store asked for drafts, in preview.
 */
const PUBLISHED_ONLY = { 'where[_status][equals]': 'published' } as const;

/** Payload's own switch: the newest version of each document, a draft if there is one. */
const NEWEST_DRAFTS = { draft: 'true' } as const;

/** The languages the CMS keeps its words in; English is its default. */
export type CmsLanguage = 'en' | 'pt';

export interface CmsReading {
  /** The newest version of each document, draft or not: for the store's preview only. */
  readonly drafts?: boolean;
  /** The language of the words; a field nobody has translated comes back in English. */
  readonly language?: CmsLanguage;
}

const versionsFor = ({ drafts = false }: CmsReading) => (drafts ? NEWEST_DRAFTS : PUBLISHED_ONLY);

/** Payload's own switches: a locale, and the one to fall back on, English being the default. */
const languageFor = ({ language = 'en' }: CmsReading): Record<string, string> =>
  language === 'en' ? {} : { locale: language, 'fallback-locale': 'en' };

type Publishable = z.ZodType<{ readonly _status: 'draft' | 'published' | null }>;

/** The CMS's REST API, read-only: published stories, curations and drop pages, without relations. */
@Injectable()
export class CmsClient {
  private readonly logger = new Logger(CmsClient.name);
  private readonly baseUrl: string;
  private readonly authorization: string;

  constructor(config: ConfigService<Env, true>) {
    this.baseUrl = config.get('CMS_API_URL', { infer: true }).replace(/\/+$/, '');
    this.authorization = `${CMS_API_KEY_COLLECTION} API-Key ${config.get('CMS_API_KEY', { infer: true })}`;
  }

  /** The published story of each of these works that has one: one request for a whole page. */
  async storiesForArtworks(
    artworkSlugs: readonly string[],
    reading: CmsReading = {},
  ): Promise<readonly CmsStory[]> {
    if (artworkSlugs.length === 0) return [];
    return this.find('stories', cmsStorySchema, reading, {
      // Slugs are lowercase words joined by hyphens, so the comma list Payload expects is safe.
      'where[artworkSlug][in]': artworkSlugs.join(','),
      // `artworkSlug` is unique in the CMS: at most one story per work.
      limit: String(artworkSlugs.length),
    });
  }

  async curations(reading: CmsReading = {}): Promise<readonly CmsCuration[]> {
    return this.find('curations', cmsCurationSchema, reading, {
      sort: 'title',
      limit: String(MAX_CURATIONS),
    });
  }

  async curationBySlug(slug: string, reading: CmsReading = {}): Promise<CmsCuration | null> {
    const [curation] = await this.find('curations', cmsCurationSchema, reading, {
      'where[slug][equals]': slug,
      limit: '1',
    });
    return curation ?? null;
  }

  /** The published page of each of these drops that has one: one request for the drops page. */
  async dropPages(
    slugs: readonly string[],
    reading: CmsReading = {},
  ): Promise<readonly CmsDropPage[]> {
    if (slugs.length === 0) return [];
    return this.find('drop-pages', cmsDropPageSchema, reading, {
      'where[slug][in]': slugs.join(','),
      limit: String(slugs.length),
    });
  }

  private async find<T extends Publishable>(
    collection: string,
    document: T,
    reading: CmsReading,
    query: Record<string, string>,
  ): Promise<z.output<T>[]> {
    const url = new URL(`${this.baseUrl}/${collection}`);
    for (const [key, value] of Object.entries({
      ...query,
      ...versionsFor(reading),
      ...languageFor(reading),
      depth: '0',
    })) {
      url.searchParams.set(key, value);
    }

    const response = await sendUpstream({
      service: 'cms',
      url,
      method: 'GET',
      headers: { authorization: this.authorization },
      timeoutMs: CMS_TIMEOUT_MS,
      retryOnNetworkError: true,
    });
    if (response.status >= 500) {
      throw new UpstreamUnavailableError('cms', `answered ${response.status}`);
    }
    if (response.status !== 200) {
      throw new UpstreamHttpError('cms', response.status, `GET /${collection}`);
    }

    const parsed = payloadList(document).safeParse(response.json);
    if (!parsed.success) {
      throw new UpstreamContractError('cms', `GET /${collection}`, parsed.error);
    }
    if (reading.drafts === true) {
      return parsed.data.docs;
    }
    const published = parsed.data.docs.filter((doc) => doc._status !== 'draft');
    if (published.length < parsed.data.docs.length) {
      this.logger.warn(
        `The CMS answered a published-only query on ${collection} with drafts; dropped them`,
      );
    }
    return published;
  }
}
