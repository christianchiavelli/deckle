import { availableSizes } from '@deckle/print-sizes';
import type { CollectionClient, SearchQuery } from '../api/collection-client.js';
import { MetNotFoundError } from '../api/errors.js';
import { normaliseObject } from '../api/normalise.js';

/** The command line's options, as `parseArgs` hands them over. */
export interface CandidateArgs {
  readonly q?: string;
  readonly department?: string;
  readonly medium?: string;
  readonly from?: string;
  readonly to?: string;
  readonly artist?: boolean;
  readonly title?: boolean;
  readonly offset?: string;
  readonly limit?: string;
}

/** A search for works with images, from the command line's options. */
export function searchQuery(args: CandidateArgs): SearchQuery {
  return {
    hasImages: true,
    offset: Number(args.offset ?? 0),
    limit: Number(args.limit ?? 25),
    ...(args.q !== undefined && { q: args.q }),
    ...(args.department !== undefined && { departmentId: Number(args.department) }),
    ...(args.medium !== undefined && { medium: args.medium.split('|') }),
    ...(args.from !== undefined &&
      args.to !== undefined && { dates: { begin: Number(args.from), end: Number(args.to) } }),
    ...(args.artist === true && { artistOrCulture: true }),
    ...(args.title === true && { title: true }),
  };
}

/**
 * One tab-separated line per candidate: id, the largest size its original
 * prints at, its pixels and weight, then what The Met says of it. Works that
 * are not public domain, or have no open-access image, are counted and left out.
 */
export async function describeCandidates(
  client: Pick<CollectionClient, 'object' | 'probeImage'>,
  objectIds: readonly number[],
  out: (line: string) => void,
) {
  let skipped = 0;
  for (const objectId of objectIds) {
    try {
      const raw = await client.object(objectId);
      if (!raw.isPublicDomain || raw.primaryImage === '') {
        skipped++;
        continue;
      }
      const work = normaliseObject(raw);
      const probe = await client.probeImage(raw.primaryImage);
      const largest = availableSizes(probe).at(-1)?.size ?? 'none';
      const attribution = [raw.artistPrefix, raw.artistRole].filter(Boolean).join(' ');
      out(
        [
          objectId,
          largest,
          `${probe.width}x${probe.height}`,
          `${((probe.bytes ?? 0) / 1e6).toFixed(1)}MB`,
          work.date.display ?? '-',
          `${work.artist?.name ?? '-'} (${attribution})`,
          work.classification ?? '-',
          work.medium ?? '-',
          work.title,
        ].join('\t'),
      );
    } catch (error) {
      if (!(error instanceof MetNotFoundError)) throw error;
      out(`${objectId}\t${error.reason}`);
    }
  }
  out(`# ${skipped} skipped: not public domain or no open-access image`);
}
