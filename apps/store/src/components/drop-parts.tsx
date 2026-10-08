import { EditionCallout } from '@deckle/ui';
import styled from 'styled-components';
import { getCopy } from '../copy/server';
import { readDropStocks } from '../gateway/reads';
import { calloutOf, type DropSummary, stocksBySlug } from '../views/drops';
import { EditionBand } from './edition-band';
import { requestTime } from './request-time';

/**
 * The parts of a page that say where a drop stands now: whether it is open,
 * and how many copies are. Each renders on request, in its own Suspense
 * boundary, so the page around it keeps its cached shell.
 */

/** The room the callout takes, kept while it is on its way so the buy box does not jump. */
export const CalloutSpace = styled.div`
  min-block-size: 4.25rem;
`;

/** The pointer from a work's buy box to its numbered edition. */
export async function DropCallout({ drop }: { drop: DropSummary }) {
  const copy = await getCopy();
  const now = await requestTime();
  return <EditionCallout href="#edition" {...calloutOf(drop, now, copy)} />;
}

/** The drop's band under a work, with its countdown or its copies. */
export async function DropBand({ drop }: { drop: DropSummary }) {
  const now = await requestTime();
  // Without its counts the band still says when the drop opens.
  const stocks = stocksBySlug(await readDropStocks().catch(() => []));
  return <EditionBand drop={drop} stock={stocks.get(drop.slug) ?? null} now={now} />;
}
