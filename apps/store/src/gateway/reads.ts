import {
  CATALOG,
  CURATIONS,
  curationTag,
  dropPageTag,
  priceTag,
  STORIES,
  workTags,
} from '@deckle/cache-tags';
import { cacheLife, cacheTag } from 'next/cache';
import { draftMode } from 'next/headers';
import { copyOf, type Lang } from '../copy';
import { serverEnv } from '../server-env';
import {
  CatalogueDocument,
  CountriesDocument,
  CurationDocument,
  CurationsDocument,
  DropDocument,
  DropsDocument,
  DropStocksDocument,
  HomeDocument,
  JournalDocument,
  SizingDocument,
  type TypedDocumentString,
  WorkDocument,
} from './generated';
import { requestGateway } from './request';

/**
 * What the pages read from the gateway. Each read is cached by Next and
 * tagged with the words the gateway drops when commerce or the CMS reports a
 * change (ADR 0012), so a page is served from the cache until the moment it
 * would be wrong.
 *
 * The gateway is not there when the image is built: a page that reads with no
 * route parameter to wait for calls `connection()` first, so it renders at
 * request time and its reads come from this cache.
 */

/**
 * The three scans the sizing page explains sizes with: one that stops at A4,
 * one at A3 and one that reaches A2.
 */
export const SIZING_EXAMPLES = {
  first: 'knight-death-and-the-devil',
  second: 'melencolia-i',
  third: 'mill-river-scenery',
} as const;

/** The works the front page is drawn around: the approved design's choices. */
export const FRONT_PAGE = {
  /** The editor's selection under "The prints", kept in the CMS. */
  curation: 'first-impressions',
  hero: 'under-the-wave-off-kanagawa',
  /** The work whose scan explains how sizes are set. */
  sizing: 'melencolia-i',
} as const;

/**
 * One read of the gateway, cached as the function that calls it is. A read
 * of the CMS's words names the page's edition, an argument of the cached
 * function, so each edition is cached apart; the rest is the same in both.
 */
async function ask<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  variables: TVariables,
  lang?: Lang,
): Promise<TResult> {
  // In draft mode Next runs every cached read afresh and keeps nothing, so the
  // CMS's newest drafts reach this one visitor, and the cache never sees them.
  const { isEnabled: previewing } = await draftMode();
  const env = serverEnv();
  const answer = await requestGateway(env.GATEWAY_URL, document, variables, {
    ...(previewing ? { preview: env.GATEWAY_PREVIEW_SECRET } : {}),
    ...(lang === undefined ? {} : { language: copyOf(lang).htmlLang }),
  });
  if (answer.complete) {
    cacheLife('gateway');
  } else {
    // A field a failed service left null is null for now, not for good: keep
    // it for seconds, and the next visit asks again.
    cacheLife('seconds');
  }
  return answer.data;
}

export async function readHome(lang: Lang) {
  'use cache';
  cacheTag(CATALOG, curationTag(FRONT_PAGE.curation));
  return ask(HomeDocument, FRONT_PAGE, lang);
}

/** Every work as a tile: one entry for every page that lists or picks from them. */
export async function readCatalogue() {
  'use cache';
  cacheTag(CATALOG);
  return ask(CatalogueDocument, {});
}

export async function readWork(slug: string, lang: Lang) {
  'use cache';
  cacheTag(...workTags(slug));
  return ask(WorkDocument, { slug }, lang);
}

/** Every work and its story: a story added, changed or removed anywhere drops it. */
export async function readJournal(lang: Lang) {
  'use cache';
  cacheTag(CATALOG, STORIES);
  return ask(JournalDocument, {}, lang);
}

/** The editor's collections, each work as its picture. */
export async function readCurations(lang: Lang) {
  'use cache';
  cacheTag(CATALOG, CURATIONS);
  return ask(CurationsDocument, {}, lang);
}

/** One collection, its works as tiles. */
export async function readCuration(slug: string, lang: Lang) {
  'use cache';
  cacheTag(CATALOG, curationTag(slug));
  return ask(CurationDocument, { slug }, lang);
}

export async function readSizing() {
  'use cache';
  cacheTag(CATALOG);
  return ask(SizingDocument, SIZING_EXAMPLES);
}

/** Every drop, with its words, its price and its print: never its stock. */
export async function readDrops(lang: Lang) {
  'use cache';
  const { drops } = await ask(DropsDocument, {}, lang);
  cacheTag(CATALOG, ...drops.flatMap((drop) => [dropPageTag(drop.slug), priceTag(drop.slug)]));
  return drops;
}

export async function readDrop(slug: string, lang: Lang) {
  'use cache';
  cacheTag(dropPageTag(slug), priceTag(slug));
  const { drop } = await ask(DropDocument, { slug }, lang);
  if (drop) {
    cacheTag(...workTags(drop.artworkSlug));
  }
  return drop;
}

/**
 * Where each drop's copies stand, by slug. Kept for a second at most, so a
 * thousand visitors cost the gateway one read a second; the drop's own page
 * follows the copies live instead.
 */
export async function readDropStocks() {
  'use cache';
  cacheLife('seconds');
  const answer = await requestGateway(serverEnv().GATEWAY_URL, DropStocksDocument, {});
  return answer.data.drops;
}

/** Where the shop ships, for the checkout's country field. */
export async function readCountries() {
  'use cache';
  return ask(CountriesDocument, {});
}
