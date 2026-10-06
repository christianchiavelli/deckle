import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Breadcrumbs } from '../components/breadcrumbs/breadcrumbs.tsx';
import { Chip } from '../components/chip/chip.tsx';
import { TextLink } from '../components/text-link/text-link.tsx';
import { Band, SectionHead } from '../sections/band.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { PrintGrid, PrintTile } from '../sections/print-tile.tsx';
import { Chrome } from './chrome.tsx';
import { curations, imageOf, metaOf, priceLine } from './fixtures.ts';

const Works = styled(PrintGrid)`
  margin-block-start: ${t.space.gap2xl};
`;

const Three = styled(PrintGrid)`
  @media ${media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

export interface CollectionPageProps {
  slug: string;
}

/** One collection: why its prints belong together, the prints, and the other collections. */
export function CollectionPage({ slug }: CollectionPageProps) {
  const curation = curations.find((entry) => entry.slug === slug);
  if (!curation) {
    throw new Error(`No collection ${slug} in the fixtures`);
  }
  const others = curations.filter((entry) => entry.slug !== slug);

  return (
    <Chrome current="collections">
      <Band aria-labelledby="collection-title">
        <PageHead
          id="collection-title"
          crumbs={
            <Breadcrumbs
              label="Breadcrumb"
              items={[{ label: 'Collections', href: '/collections' }]}
            />
          }
          title={curation.title}
          lede={curation.intro}
        >
          <Chip>{`${String(curation.works.length)} prints`}</Chip>
        </PageHead>
        <Works>
          {curation.works.map((entry) => {
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
        </Works>
      </Band>

      <Band tone="band" aria-labelledby="more-title">
        <SectionHead
          id="more-title"
          title="More collections"
          action={
            <TextLink href="/collections" icon="arrow">
              Every collection
            </TextLink>
          }
        />
        <Three>
          {others.map((other) => {
            const cover = other.works[0];
            return cover ? (
              <li key={other.slug}>
                <PrintTile
                  href={`/collections/${other.slug}`}
                  image={imageOf(cover)}
                  title={other.title}
                  meta={`${String(other.works.length)} prints`}
                />
              </li>
            ) : null;
          })}
        </Three>
      </Band>
    </Chrome>
  );
}
