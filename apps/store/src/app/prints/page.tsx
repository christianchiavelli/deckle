import { Band, Filters, PageHead, PrintGrid, TextLink, typeRole } from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import styled from 'styled-components';
import { PrintTiles } from '../../components/print-tiles';
import { copy } from '../../copy';
import { readCatalogue } from '../../gateway/reads';
import { choiceFrom, filterGroupsOf, isChosen, shownOf } from '../../views/listing';

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

const { prints: text, locale } = copy;

export const metadata: Metadata = { title: text.title };

/** Every print, narrowed by technique, century and size, as approved. */
export default function PrintsPage({ searchParams }: PageProps<'/prints'>) {
  return (
    // The note on sizes comes in with the prints, so nothing under them moves when they do.
    <Suspense
      fallback={
        <Band aria-labelledby="prints-title" aria-busy="true">
          <PageHead id="prints-title" title={text.title} />
        </Band>
      }
    >
      <Prints searchParams={searchParams} />
      <SizesNote />
    </Suspense>
  );
}

function SizesNote() {
  return (
    <Band tone="band" aria-labelledby="sizes-title">
      <Aside>
        <div>
          <h2 id="sizes-title">{text.asideTitle}</h2>
          <p>{text.aside}</p>
        </div>
        <TextLink href="/about/sizes" icon="arrow">
          {text.howWeSize}
        </TextLink>
      </Aside>
    </Band>
  );
}

async function Prints({ searchParams }: Pick<PageProps<'/prints'>, 'searchParams'>) {
  // The query first: at build time it never comes, so the page reads nothing then.
  const params = await searchParams;
  const { artworks } = await readCatalogue();
  const works = artworks.edges.map((edge) => edge.node);
  const choice = choiceFrom(params, works);
  const shown = shownOf(works, choice, locale);
  const chosen = isChosen(choice);

  return (
    <Band aria-labelledby="prints-title">
      <PageHead
        id="prints-title"
        title={text.title}
        lede={text.lede(new Intl.NumberFormat(locale).format(artworks.totalCount))}
      >
        <Filters
          id="filter"
          label={text.filters}
          unit={text.unit}
          groups={filterGroupsOf(works, choice, copy)}
        />
      </PageHead>
      <Result>
        <strong>{text.count(shown.length, chosen ? artworks.totalCount : null)}</strong>
        {chosen && <TextLink href="/prints">{text.clear}</TextLink>}
      </Result>
      <PrintGrid>
        <PrintTiles works={shown} />
      </PrintGrid>
    </Band>
  );
}
