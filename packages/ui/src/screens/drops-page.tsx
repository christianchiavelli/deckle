import { Band } from '../sections/band.tsx';
import { DropRow } from '../sections/drop-row.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { Chrome } from './chrome.tsx';
import { imageOf, work } from './fixtures.ts';

/**
 * Every drop: the one open now on the copper dark, then the next to open.
 * Each is fifty numbered copies of one print.
 */
export function DropsPage() {
  return (
    <Chrome current="drops">
      <Band aria-labelledby="drops-title">
        <PageHead
          id="drops-title"
          title="Drops"
          lede="Fifty numbered copies of one print at a time, at a set hour: first come, first served, and one per person."
        />
      </Band>
      <DropRow
        id="melencolia-title"
        tone="feature"
        href="/drops/melencolia-i-numbered"
        image={imageOf(work('melencolia-i'))}
        state={{ label: 'Open now', tone: 'accent' }}
        title="Melencolia I, in fifty numbered copies"
        text="Each copy is A3, printed from The Met’s scan at 302 ppi and numbered in pencil, from 1/50 to 50/50."
        facts={[
          { term: 'Open', detail: '30 of 50' },
          { term: 'Price', detail: '$180' },
          { term: 'Limit', detail: 'One per person' },
        ]}
        action="Claim a copy"
      />
      <DropRow
        id="wave-title"
        tone="page"
        href="/drops/the-great-wave-numbered"
        image={imageOf(work('under-the-wave-off-kanagawa'))}
        state={{ label: 'Opens Thu 15 Oct', tone: 'soft' }}
        title="The Great Wave, in fifty numbered copies"
        text="Each copy is A3, printed from The Met’s scan at 278 ppi and numbered in pencil, from 1/50 to 50/50."
        facts={[
          { term: 'Opens', detail: 'Thu 15 Oct, 18:00 UTC' },
          { term: 'Price', detail: '$180' },
          { term: 'Limit', detail: 'One per person' },
        ]}
        action="See the drop"
      />
    </Chrome>
  );
}
