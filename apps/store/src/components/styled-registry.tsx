'use client';

import { useServerInsertedHTML } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { ServerStyleSheet, StyleSheetManager, stylisPluginRSC } from 'styled-components';

/**
 * The plugins every styled component is written with, on the server and in
 * the browser alike, so a component's class is the same wherever it renders.
 * `stylisPluginRSC` keeps `:first-child` and its kin from counting the
 * `<style>` tags a Server Component leaves beside its elements.
 */
export const STYLIS_PLUGINS = [stylisPluginRSC];

/**
 * Collects the CSS of the Client Components while the server renders them,
 * and hands it to the document's head, so they arrive styled. Server
 * Components need none of this: their styles travel with their markup.
 */
export function StyledRegistry({ children }: { children: ReactNode }) {
  const [sheet] = useState(() => new ServerStyleSheet());

  useServerInsertedHTML(() => {
    const styles = sheet.getStyleElement();
    sheet.instance.clearTag();
    return <>{styles}</>;
  });

  if (typeof window !== 'undefined') {
    return <StyleSheetManager stylisPlugins={STYLIS_PLUGINS}>{children}</StyleSheetManager>;
  }
  return (
    <StyleSheetManager sheet={sheet.instance} stylisPlugins={STYLIS_PLUGINS}>
      {children}
    </StyleSheetManager>
  );
}
