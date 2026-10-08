import {
  Band,
  Breadcrumbs,
  Chip,
  PageHead,
  PrintGrid,
  PrintTile,
  SectionHead,
  TextLink,
} from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import styled from 'styled-components';
import { PrintTiles } from '../../../components/print-tiles';
import { copy } from '../../../copy';
import { FRONT_PAGE, readCuration, readCurations } from '../../../gateway/reads';
import { listedCurations, picturesOf } from '../../../views/collections';
import { imageAt } from '../../../views/images';

const Works = styled(PrintGrid)`
  margin-block-start: ${t.space.gap2xl};
`;

// Doubled to outrank the grid's own columns, whose styles can stream in after these.
const Three = styled(PrintGrid)`
  @media ${media.md} {
    && {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
`;

const { collections: text } = copy;

/** The collection at this address, with its works as tiles, and every listed collection. */
async function curationAt(slug: string) {
  const [{ curations }, { curation }] = await Promise.all([readCurations(), readCuration(slug)]);
  const listed = listedCurations(curations, FRONT_PAGE.curation);
  // The front page's own selection has no page: only a listed collection does.
  const shown = listed.some((entry) => entry.slug === slug) ? curation : null;
  return { curation: shown, listed };
}

export async function generateMetadata({
  params,
}: PageProps<'/collections/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const { curation } = await curationAt(slug);
  if (!curation) {
    return {};
  }
  return curation.intro === null
    ? { title: curation.title }
    : { title: curation.title, description: curation.intro };
}

/** One collection: why its prints belong together, the prints, and the other collections. */
export default function CollectionPage({ params }: PageProps<'/collections/[slug]'>) {
  return (
    <Suspense fallback={<Band aria-busy="true" />}>
      <Collection params={params} />
    </Suspense>
  );
}

async function Collection({ params }: Pick<PageProps<'/collections/[slug]'>, 'params'>) {
  const { slug } = await params;
  const { curation, listed } = await curationAt(slug);
  if (!curation) {
    notFound();
  }
  const others = listed.filter((entry) => entry.slug !== slug);

  return (
    <>
      <Band aria-labelledby="collection-title">
        <PageHead
          id="collection-title"
          crumbs={
            <Breadcrumbs
              label={text.crumbs}
              items={[{ label: text.title, href: '/collections' }]}
            />
          }
          title={curation.title}
          lede={curation.intro}
        >
          <Chip>{text.prints(curation.artworks.length)}</Chip>
        </PageHead>
        <Works>
          <PrintTiles works={curation.artworks} />
        </Works>
      </Band>

      {others.length > 0 && (
        <Band tone="band" aria-labelledby="more-title">
          <SectionHead
            id="more-title"
            title={text.more}
            action={
              <TextLink href="/collections" icon="arrow">
                {text.every}
              </TextLink>
            }
          />
          <Three>
            {others.map((other) => {
              const [cover] = picturesOf(other);
              return cover ? (
                <li key={other.slug}>
                  <PrintTile
                    href={`/collections/${other.slug}`}
                    image={{
                      src: imageAt(cover.url, 'card'),
                      width: cover.width,
                      height: cover.height,
                    }}
                    title={other.title}
                    meta={text.prints(other.artworks.length)}
                  />
                </li>
              ) : null;
            })}
          </Three>
        </Band>
      )}
    </>
  );
}
