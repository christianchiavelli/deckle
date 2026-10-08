import { draftMode } from 'next/headers';
import { serverEnv } from '../server-env';
import { PreviewRefresh } from './preview-refresh';
import { ProofFrame } from './proof-frame';

/**
 * What a page adds in draft mode, which the CMS's preview links turn on: the
 * trial proof's frame, and in the CMS's live preview, a fresh render on each
 * save. Prerendering reads draft mode as off, so the static shell carries none
 * of it; a request in draft mode renders the whole page afresh, and gets it.
 */
export async function DraftPreview() {
  const { isEnabled } = await draftMode();
  if (!isEnabled) {
    return null;
  }
  return (
    <>
      <ProofFrame />
      <PreviewRefresh cms={serverEnv().CMS_PUBLIC_URL} />
    </>
  );
}
