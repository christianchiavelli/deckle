import { CATALOG, CURATIONS, curationTag, STORIES, workTags } from '@deckle/cache-tags';
import { cacheLife, cacheTag } from 'next/cache';
import { serverEnv } from '../server-env';
import {
  CatalogueDocument,
  CurationDocument,
  CurationsDocument,
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

async function ask<TResult, TVariables>(
  document: TypedDocumentString<TResult, TVariables>,
  variables: TVariables,
): Promise<TResult> {
  const answer = await requestGateway(serverEnv().GATEWAY_URL, document, variables);
  if (answer.complete) {
    cacheLife('gateway');
  } else {
    // A field a failed service left null is null for now, not for good: keep
    // it for seconds, and the next visit asks again.
    cacheLife('seconds');
  }
  return answer.data;
}

export async function readHome() {
  'use cache';
  cacheTag(CATALOG, curationTag(FRONT_PAGE.curation));
  return ask(HomeDocument, FRONT_PAGE);
}

/** Every work as a tile: one entry for every page that lists or picks from them. */
export async function readCatalogue() {
  'use cache';
  cacheTag(CATALOG);
  return ask(CatalogueDocument, {});
}

export async function readWork(slug: string) {
  'use cache';
  cacheTag(...workTags(slug));
  return ask(WorkDocument, { slug });
}

/** Every work and its story: a story added, changed or removed anywhere drops it. */
export async function readJournal() {
  'use cache';
  cacheTag(CATALOG, STORIES);
  return ask(JournalDocument, {});
}

/** The editor's collections, each work as its picture. */
export async function readCurations() {
  'use cache';
  cacheTag(CATALOG, CURATIONS);
  return ask(CurationsDocument, {});
}

/** One collection, its works as tiles. */
export async function readCuration(slug: string) {
  'use cache';
  cacheTag(CATALOG, curationTag(slug));
  return ask(CurationDocument, { slug });
}

export async function readSizing() {
  'use cache';
  cacheTag(CATALOG);
  return ask(SizingDocument, SIZING_EXAMPLES);
}
