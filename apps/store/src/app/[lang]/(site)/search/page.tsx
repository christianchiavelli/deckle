import { Band, ButtonLink, PageHead, PrintGrid, TextLink } from '@deckle/ui';
import { tokens as t } from '@deckle/tokens';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import styled from 'styled-components';
import { PrintTiles } from '../../../components/print-tiles';
import { SearchAgain } from '../../../components/search-again';
import { copy } from '../../../copy';
import { readCatalogue } from '../../../gateway/reads';
import { queryFrom, searchWorks } from '../../../views/search';

const Field = styled.div`
  inline-size: 100%;
  max-inline-size: 36rem;
`;

const Result = styled.p`
  margin-block: ${t.space.gap2xl} ${t.space.gapLg};
  padding-block-start: ${t.space.gapLg};
  border-block-start: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
  font-weight: ${t.type.label.weight};
  font-variant-numeric: tabular-nums;
`;

const Empty = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};
  margin-block-start: ${t.space.gap2xl};
  padding-block-start: ${t.space.gapLg};
  border-block-start: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};

  p {
    max-inline-size: 52ch;
    color: ${t.text.secondary};
  }
`;

const Suggestions = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: ${t.space.gapSm} ${t.space.gapLg};
`;

const { search: text, locale } = copy;

export async function generateMetadata({ searchParams }: PageProps<'/search'>): Promise<Metadata> {
  const query = queryFrom(await searchParams);
  return { title: query === '' ? text.title : text.results(query) };
}

/** What a search found, with the field to search again, as approved. */
export default function SearchPage({ searchParams }: PageProps<'/search'>) {
  return (
    <Suspense
      fallback={
        <Band aria-labelledby="search-title" aria-busy="true">
          <PageHead id="search-title" title={text.title} />
        </Band>
      }
    >
      <Search searchParams={searchParams} />
    </Suspense>
  );
}

async function Search({ searchParams }: Pick<PageProps<'/search'>, 'searchParams'>) {
  // The query first: at build time it never comes, so the page reads nothing then.
  const params = await searchParams;
  const { artworks } = await readCatalogue();
  const query = queryFrom(params);
  const found = searchWorks(
    artworks.edges.map((edge) => edge.node),
    query,
    locale,
  );
  const title =
    query === '' ? text.title : found.length > 0 ? text.results(query) : text.none(query);

  return (
    <Band aria-labelledby="search-title">
      <PageHead id="search-title" title={title}>
        <Field>
          <SearchAgain
            query={query}
            label={copy.chrome.search}
            landmark={text.again}
            placeholder={copy.chrome.searchPlaceholder}
            suggestions={text.suggest.label}
          />
        </Field>
      </PageHead>

      {found.length > 0 ? (
        <>
          <Result>{text.count(found.length)}</Result>
          <PrintGrid>
            <PrintTiles works={found} />
          </PrintGrid>
        </>
      ) : (
        <Empty>
          <p>
            {query === ''
              ? text.ask
              : text.nothing(new Intl.NumberFormat(locale).format(artworks.totalCount))}
          </p>
          <Suggestions>
            {text.suggestions.map((suggestion) => (
              <li key={suggestion}>
                <TextLink href={`/search?q=${encodeURIComponent(suggestion)}`}>
                  {suggestion}
                </TextLink>
              </li>
            ))}
          </Suggestions>
          <ButtonLink href="/prints" icon="arrow">
            {text.browse}
          </ButtonLink>
        </Empty>
      )}
    </Band>
  );
}
