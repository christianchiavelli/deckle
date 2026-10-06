import { revalidateTag } from 'next/cache';
import { isAuthorized, parseRevalidation, revalidateProfile } from '../../../cache/revalidation';
import { serverEnv } from '../../../server-env';

/**
 * The gateway's call when commerce or the CMS changed something: the pages
 * cached under these tags are dropped, or served stale while they rebuild
 * (ADR 0012). Caddy never routes it; only Docker's network reaches it.
 */
export async function POST(request: Request): Promise<Response> {
  if (!isAuthorized(request.headers.get('authorization'), serverEnv().STORE_REVALIDATE_SECRET)) {
    return new Response(null, { status: 401 });
  }
  const revalidation = parseRevalidation(await request.json().catch(() => undefined));
  if (revalidation === null) {
    return Response.json(
      { error: 'Expected { tags, profile }: tags from the vocabulary, profile expire or max' },
      { status: 400 },
    );
  }
  for (const tag of revalidation.tags) {
    revalidateTag(tag, revalidateProfile(revalidation.profile));
  }
  return new Response(null, { status: 204 });
}
