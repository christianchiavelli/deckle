import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Chip } from '../components/chip/chip.tsx';
import { TextLink } from '../components/text-link/text-link.tsx';
import { Band } from '../sections/band.tsx';
import { type FilterGroup, Filters } from '../sections/filters.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { PrintGrid, PrintTile } from '../sections/print-tile.tsx';
import { typeRole } from '../theme/type.ts';
import { Chrome } from './chrome.tsx';
import {
  allWorks,
  centuryOf,
  imageOf,
  largestOf,
  metaOf,
  priceLine,
  tally,
  techniqueOf,
  total,
  type Work,
} from './fixtures.ts';

const Result = styled.p`
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: ${t.space.gapXs} ${t.space.gapLg};
  margin-block: ${t.space.gap2xl} ${t.space.gapLg};
  padding-block-start: ${t.space.gapLg};
  border-block-start: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};

  strong {
    font-weight: ${t.type.label.weight};
    font-variant-numeric: tabular-nums;
  }
`;

const Aside = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};

  @media ${media.md} {
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
  }

  h2 {
    ${typeRole('heading2')}
    text-wrap: balance;
  }

  p {
    max-inline-size: 56ch;
    margin-block-start: ${t.space.gapSm};
    color: ${t.text.secondary};
  }
`;

const slug = (value: string) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

const SIZES = ['A3', 'A2'] as const;
type Size = (typeof SIZES)[number];
const CENTURIES = ['15th century', '16th century', '17th century', '18th century', '19th century'];

export interface PrintsPageProps {
  /** A technique chosen, such as "Etchings"; none for every print. */
  technique?: string;
  century?: string;
  /** Only the works printed at this size or larger. */
  size?: Size;
}

interface Choice {
  technique: string | undefined;
  century: string | undefined;
  size: Size | undefined;
}

const reaches = (entry: Work, size: Size) => {
  const largest = largestOf(entry);
  return largest === 'A2' || (size === 'A3' && largest === 'A3');
};

const matches = (entry: Work, { technique, century, size }: Choice) =>
  (technique === undefined || techniqueOf(entry) === technique) &&
  (century === undefined || centuryOf(entry) === century) &&
  (size === undefined || reaches(entry, size));

/** The address of a choice, as the store would write it. */
function hrefOf({ technique, century, size }: Choice): string {
  const query = new URLSearchParams();
  if (technique !== undefined) query.set('technique', slug(technique));
  if (century !== undefined) query.set('century', slug(century));
  if (size !== undefined) query.set('size', size.toLowerCase());
  const search = query.toString();
  return search === '' ? '/prints' : `/prints?${search}`;
}

/** Each group's options count the works the other groups' choices leave. */
function groupsOf(choice: Choice): FilterGroup[] {
  const techniques = tally(
    allWorks
      .filter((entry) => matches(entry, { ...choice, technique: undefined }))
      .map(techniqueOf),
  );
  const centuries = allWorks
    .filter((entry) => matches(entry, { ...choice, century: undefined }))
    .map(centuryOf);
  const sized = allWorks.filter((entry) => matches(entry, { ...choice, size: undefined }));

  return [
    {
      label: 'Technique',
      options: [
        {
          label: 'All',
          href: hrefOf({ ...choice, technique: undefined }),
          current: choice.technique === undefined,
        },
        ...techniques.map(({ value, count }) => ({
          label: value,
          href: hrefOf({ ...choice, technique: value }),
          count,
          current: choice.technique === value,
        })),
      ],
    },
    {
      label: 'Century',
      options: [
        {
          label: 'All',
          href: hrefOf({ ...choice, century: undefined }),
          current: choice.century === undefined,
        },
        ...CENTURIES.map((value) => ({
          label: value.replace(' century', ''),
          href: hrefOf({ ...choice, century: value }),
          count: centuries.filter((century) => century === value).length,
          current: choice.century === value,
        })).filter((option) => option.count > 0),
      ],
    },
    {
      label: 'Printed at',
      options: [
        {
          label: 'Any size',
          href: hrefOf({ ...choice, size: undefined }),
          current: choice.size === undefined,
        },
        ...SIZES.map((size) => ({
          label: `${size} and up`,
          href: hrefOf({ ...choice, size }),
          count: sized.filter((entry) => reaches(entry, size)).length,
          current: choice.size === size,
        })).filter((option) => option.count > 0 || option.current),
      ],
    },
  ];
}

/** Every print, narrowed by technique, century and the size a buyer wants. */
export function PrintsPage({ technique, century, size }: PrintsPageProps) {
  const choice = { technique, century, size };
  const shown = allWorks.filter((entry) => matches(entry, choice));
  const filtered = technique !== undefined || century !== undefined || size !== undefined;

  return (
    <Chrome current="prints">
      <Band aria-labelledby="prints-title">
        <PageHead
          id="prints-title"
          title="The prints"
          lede={`${String(total)} works from The Met’s Open Access collection, each printed on cotton rag at the sizes its scan can hold.`}
        >
          <Filters id="filter" label="Filter the prints" unit="prints" groups={groupsOf(choice)} />
        </PageHead>

        <Result aria-live="polite">
          <strong>
            {shown.length === 1 ? '1 print' : `${String(shown.length)} prints`}
            {filtered ? ` of ${String(total)}` : ''}, oldest first
          </strong>
          {filtered && <TextLink href="/prints">Clear the filters</TextLink>}
        </Result>

        <PrintGrid>
          {shown.map((entry) => {
            const price = priceLine(entry);
            return (
              <li key={entry.slug}>
                <PrintTile
                  href={`/prints/${entry.slug}`}
                  image={imageOf(entry)}
                  title={entry.shortTitle}
                  meta={metaOf(entry)}
                  price={
                    <>
                      {price.amount}
                      {price.only && <Chip tone="soft">{price.only}</Chip>}
                    </>
                  }
                />
              </li>
            );
          })}
        </PrintGrid>
      </Band>

      <Band tone="band" aria-labelledby="sizes-title">
        <Aside>
          <div>
            <h2 id="sizes-title">Why some prints stop at A4</h2>
            <p>
              Each size needs enough of the scan’s pixels for every inch of paper. Where The Met’s
              scan runs out, so do the sizes: we never print a work larger than its scan can hold.
            </p>
          </div>
          <TextLink href="/about/sizes" icon="arrow">
            How we size prints
          </TextLink>
        </Aside>
      </Band>
    </Chrome>
  );
}
