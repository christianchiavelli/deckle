import { tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { ButtonLink } from '../components/button/button.tsx';
import { Chip } from '../components/chip/chip.tsx';
import { SearchField } from '../components/search-field/search-field.tsx';
import { TextLink } from '../components/text-link/text-link.tsx';
import { Band } from '../sections/band.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { PrintGrid, PrintTile } from '../sections/print-tile.tsx';
import { Chrome } from './chrome.tsx';
import { allWorks, imageOf, metaOf, priceLine, techniqueOf } from './fixtures.ts';
import { suggestFromDataSet } from './suggest.ts';

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

/** Accents and case set aside, so "durer" finds Dürer. */
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Works whose title, maker, medium or technique hold every word searched for. */
function find(query: string) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  return allWorks.filter((entry) => {
    const text = fold(
      [entry.title, entry.artist.name, entry.medium, techniqueOf(entry), entry.culture].join(' '),
    );
    return words.every((word) => text.includes(word));
  });
}

const SUGGESTIONS = ['Hokusai', 'Melencolia', 'etching', 'Rembrandt'];

export interface SearchPageProps {
  query: string;
}

/** What a search found, with the field to search again; or, when nothing, where to look instead. */
export function SearchPage({ query }: SearchPageProps) {
  const found = find(query);

  return (
    <Chrome>
      <Band aria-labelledby="search-title">
        <PageHead
          id="search-title"
          title={found.length > 0 ? `Prints for “${query}”` : `No prints for “${query}”`}
        >
          <Field>
            <SearchField
              action="/search"
              label="Search"
              landmark="Search again"
              placeholder="Search prints, artists and techniques"
              defaultValue={query}
              suggest={{ source: suggestFromDataSet, label: 'Suggestions' }}
            />
          </Field>
        </PageHead>

        {found.length > 0 ? (
          <>
            <Result>{found.length === 1 ? '1 print' : `${String(found.length)} prints`}</Result>
            <PrintGrid>
              {found.map((entry) => {
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
          </>
        ) : (
          <Empty>
            <p>
              The shop has {allWorks.length} works, and none of their titles, makers or techniques
              hold those words. Try a maker, a title or a technique:
            </p>
            <Suggestions>
              {SUGGESTIONS.map((suggestion) => (
                <li key={suggestion}>
                  <TextLink href={`/search?q=${encodeURIComponent(suggestion)}`}>
                    {suggestion}
                  </TextLink>
                </li>
              ))}
            </Suggestions>
            <ButtonLink href="/prints" icon="arrow">
              Browse the prints
            </ButtonLink>
          </Empty>
        )}
      </Band>
    </Chrome>
  );
}
