import { isCacheTag, type RevalidationProfile } from '@deckle/cache-tags';
import { z } from 'zod';
import { sameSecret } from '../secret';

/**
 * What the gateway sends when commerce or the CMS reports a change: the tags
 * to drop and how (see `@deckle/cache-tags`). It arrives on Docker's network
 * with a bearer secret; Caddy never routes it from outside.
 */

const revalidationSchema = z.object({
  tags: z.array(z.string().refine(isCacheTag, 'is not a cache tag')).min(1).max(64),
  profile: z.enum(['expire', 'max']),
});

export interface Revalidation {
  readonly tags: readonly string[];
  readonly profile: RevalidationProfile;
}

/** Whether `authorization` is `Bearer <secret>`, compared in constant time. */
export function isAuthorized(authorization: string | null, secret: string): boolean {
  const prefix = 'Bearer ';
  return (
    authorization?.startsWith(prefix) === true &&
    sameSecret(authorization.slice(prefix.length), secret)
  );
}

/** The request's body as a revalidation, or null when it is not one. */
export function parseRevalidation(body: unknown): Revalidation | null {
  const result = revalidationSchema.safeParse(body);
  return result.success ? result.data : null;
}

/** What Next's `revalidateTag` takes for each profile: drop now, or serve stale while rebuilding. */
export function revalidateProfile(profile: RevalidationProfile): { expire: 0 } | 'max' {
  return profile === 'expire' ? { expire: 0 } : 'max';
}
