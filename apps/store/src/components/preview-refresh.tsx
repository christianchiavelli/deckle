'use client';

import { RefreshRouteOnSave } from '@payloadcms/live-preview-react';
import { useRouter } from 'next/navigation';
import { useCallback, useSyncExternalStore } from 'react';

const unchanging = () => () => undefined;

/**
 * In the CMS's live preview, the page sits in a frame of the admin: each time
 * the editor's draft is saved, the admin says so, and the page renders again
 * from the newest draft. Outside a frame there is no one to listen to.
 */
export function PreviewRefresh({ cms }: { cms: string }) {
  const router = useRouter();
  const framed = useSyncExternalStore(
    unchanging,
    () => window.top !== window.self,
    () => false,
  );
  const refresh = useCallback(() => {
    router.refresh();
  }, [router]);
  return framed ? <RefreshRouteOnSave serverURL={cms} refresh={refresh} /> : null;
}
