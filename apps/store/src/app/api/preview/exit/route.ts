import type { Route } from 'next';
import { draftMode } from 'next/headers';
import { redirect } from 'next/navigation';
import { returnPath } from '../../../../preview/link';

/** Leaves preview: the page that was open shows again what is published. */
export async function GET(request: Request): Promise<Response> {
  (await draftMode()).disable();
  // A path on the store's own origin, which returnPath checks; typed routes cannot see that far.
  redirect(returnPath(new URL(request.url).searchParams.get('path')) as Route);
}
