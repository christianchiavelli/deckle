'use client';

import { useEffect } from 'react';

/**
 * Scrolls to the address's fragment, such as `#story`, once the streamed part
 * of the page that holds it is shown. React reveals streamed parts in batches,
 * after the document has loaded, too late for the browser's own scroll: the page
 * would open at the top. A reader who has already scrolled is left where they are.
 */
export function ScrollToFragment() {
  useEffect(() => {
    const id = decodeURIComponent(window.location.hash.slice(1));
    if (id !== '' && window.scrollY === 0) {
      document.getElementById(id)?.scrollIntoView();
    }
  }, []);
  return null;
}
