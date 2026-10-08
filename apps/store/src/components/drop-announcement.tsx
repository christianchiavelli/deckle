import { Announcement } from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { copy } from '../copy';
import { readDrops, readDropStocks } from '../gateway/reads';
import { announcementOf, featuredDrop, stocksBySlug } from '../views/drops';
import { requestTime } from './request-time';

/**
 * The bar's own height and colour, kept while its words are on their way. On
 * a phone its words and its link take a line each.
 */
export const AnnouncementSpace = styled.div`
  min-block-size: calc(2lh + ${t.space.gap2xs} + 2 * ${t.space.gapXs});
  background: ${t.component.announce.surface};
  font-size: 0.875rem;

  @media ${media.sm} {
    min-block-size: 2.5rem;
  }
`;

/**
 * The line above the header about the drop worth knowing today: the one open
 * with copies left, else the next to open. Nothing when every drop has run out.
 */
export async function DropAnnouncement() {
  const now = await requestTime();
  const [drops, stocks] = await Promise.all([
    readDrops().catch(() => []),
    readDropStocks().catch(() => []),
  ]);
  const drop = featuredDrop(drops, stocksBySlug(stocks), now);
  if (drop === null) {
    return null;
  }
  const { text, link } = announcementOf(drop, now, copy);
  return (
    <Announcement href={`/drops/${drop.slug}`} link={link}>
      {text}
    </Announcement>
  );
}
