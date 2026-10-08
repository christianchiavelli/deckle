import type { Route } from 'next';
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { previewPage } from '../../../preview/link';
import { sameSecret } from '../../../secret';
import { serverEnv } from '../../../server-env';

/**
 * Where the CMS's Preview button lands. With the right secret, draft mode goes
 * on for this browser and the page opens with the CMS's newest drafts; the
 * secret stays behind in this one request, never in the address bar.
 */
export async function GET(request: Request): Promise<Response> {
  const link = new URL(request.url).searchParams;
  if (!sameSecret(link.get('secret') ?? '', serverEnv().PREVIEW_SECRET)) {
    return new Response('This preview link is not valid.', { status: 401 });
  }
  const page = previewPage(link.get('type'), link.get('slug'), link.get('locale'));
  if (page === null) {
    return new Response('This preview link names no page of the store.', { status: 404 });
  }
  (await draftMode()).enable();
  // A path the store routes, as previewPage builds it; typed routes cannot see that far.
  redirect(page as Route);
}
