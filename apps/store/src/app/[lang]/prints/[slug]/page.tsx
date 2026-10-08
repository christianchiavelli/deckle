import {
  Band,
  Breadcrumbs,
  BuyBox,
  PrintGrid,
  Record,
  SectionHead,
  Stage,
  Story,
  TextLink,
  WorkHeading,
} from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import styled from 'styled-components';
import { BuyOptions } from '../../../../components/buy-options';
import { CalloutSpace, DropBand, DropCallout } from '../../../../components/drop-parts';
import { PrintTiles } from '../../../../components/print-tiles';
import { ScrollToFragment } from '../../../../components/scroll-to-fragment';
import { StoryBody } from '../../../../components/story-body';
import { getCopy } from '../../../../copy/server';
import { readCatalogue, readDrops, readWork } from '../../../../gateway/reads';
import { imageAt } from '../../../../views/images';
import { hrefOf, NO_CHOICE } from '../../../../views/listing';
import { morePrints } from '../../../../views/more';
import { defaultSize, factsOf, lifeOf, recordOf, tooSmallNote } from '../../../../views/work';

/*
 * Doubled to outrank the band's own padding: a server component's styles stream
 * in where it renders, so the band's can land after these and win.
 */
const Product = styled(Band)`
  && {
    padding-block-start: ${t.space.gapLg};
  }
`;

const Grid = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};
  margin-block-start: ${t.space.gapLg};

  @media ${media.md} {
    grid-template-columns: minmax(0, 7fr) minmax(0, 5fr);
    gap: ${t.space.gap3xl};
    align-items: start;
  }
`;

export async function generateMetadata({
  params,
}: PageProps<'/[lang]/prints/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const { lang } = await getCopy();
  const { artwork } = await readWork(slug, lang);
  return artwork
    ? {
        title: artwork.title,
        description: [artwork.artist?.name, artwork.date, artwork.medium]
          .filter(Boolean)
          .join(', '),
      }
    : {};
}

/**
 * A work's own page, as approved: the print and how to buy it, its numbered
 * edition when a drop prints it, its story and its record.
 */
export default function WorkPage({ params }: PageProps<'/[lang]/prints/[slug]'>) {
  return (
    <Suspense fallback={<Product aria-busy="true" />}>
      <Work params={params} />
    </Suspense>
  );
}

async function Work({ params }: Pick<PageProps<'/[lang]/prints/[slug]'>, 'params'>) {
  const copy = await getCopy();
  const { work: text } = copy;
  const { slug } = await params;
  const [{ artwork }, { artworks }, drops] = await Promise.all([
    readWork(slug, copy.lang),
    readCatalogue(),
    // A work sells without its drop: the page stands if drops cannot be read.
    readDrops(copy.lang).catch(() => []),
  ]);
  if (!artwork) {
    notFound();
  }
  const drop = drops.find((each) => each.artworkSlug === artwork.slug) ?? null;
  const pixels = new Intl.NumberFormat(copy.locale);
  const initial = defaultSize(artwork.sizes);
  const more = morePrints(
    artwork,
    artworks.edges.map((edge) => edge.node),
  );
  const { story } = artwork;

  return (
    <>
      <Product aria-labelledby="work-title">
        <Breadcrumbs
          label={text.crumbs}
          items={[
            { label: text.prints, href: copy.path('/prints') },
            ...(artwork.technique === null
              ? []
              : [
                  {
                    label: copy.prints.named(artwork.technique),
                    href: copy.path(hrefOf({ ...NO_CHOICE, technique: artwork.technique })),
                  },
                ]),
          ]}
        />
        <Grid>
          {artwork.image && (
            <Stage
              image={{
                src: imageAt(artwork.image.url, 'page'),
                width: artwork.image.width,
                height: artwork.image.height,
                alt: [artwork.title, artwork.artist?.name].filter(Boolean).join(', '),
              }}
              caption={text.caption(
                pixels.format(artwork.image.scanWidth),
                pixels.format(artwork.image.scanHeight),
              )}
            />
          )}
          <BuyBox>
            <WorkHeading
              id="work-title"
              artist={{
                name: artwork.artist?.name ?? text.unknownArtist,
                href: artwork.artist
                  ? copy.path(`/search?q=${encodeURIComponent(artwork.artist.name)}`)
                  : undefined,
                bio: lifeOf(artwork.artist),
              }}
              title={artwork.title}
              facts={factsOf(artwork)}
            />
            {initial ? (
              <BuyOptions
                sizes={artwork.sizes}
                initial={initial.size}
                note={tooSmallNote(artwork, copy)}
                artwork={{
                  slug: artwork.slug,
                  title: artwork.title,
                  image: artwork.image && {
                    src: imageAt(artwork.image.url, 'thumb'),
                    width: artwork.image.width,
                    height: artwork.image.height,
                  },
                }}
                edition={
                  drop && (
                    <Suspense fallback={<CalloutSpace />}>
                      <DropCallout drop={drop} />
                    </Suspense>
                  )
                }
              />
            ) : (
              <p>{text.notForSale}</p>
            )}
          </BuyBox>
        </Grid>
      </Product>

      {drop && (
        <Suspense fallback={null}>
          <DropBand drop={drop} />
        </Suspense>
      )}

      {story && (
        <Band id="story" aria-labelledby="story-title">
          <Story
            id="story-title"
            title={story.title}
            lede={story.lede}
            source={
              <>
                {text.source}:{' '}
                {story.sources.map((source, index) => (
                  <span key={source.label}>
                    {index > 0 && '; '}
                    {source.url === null ? (
                      source.label
                    ) : (
                      <TextLink href={source.url}>{source.label}</TextLink>
                    )}
                  </span>
                ))}
              </>
            }
          >
            <StoryBody blocks={story.blocks} />
          </Story>
        </Band>
      )}

      <Band tone="band" aria-labelledby="record-title">
        <SectionHead
          id="record-title"
          title={text.recordTitle}
          action={
            <TextLink href={artwork.museumUrl} icon="out">
              {text.museum}
            </TextLink>
          }
        />
        <Record missing={text.missing} entries={recordOf(artwork, copy)} />
      </Band>

      {more.length > 0 && (
        <Band aria-labelledby="more-title">
          <SectionHead
            id="more-title"
            title={text.more}
            action={
              <TextLink href={copy.path('/prints')} icon="arrow">
                {copy.home.seeAll(new Intl.NumberFormat(copy.locale).format(artworks.totalCount))}
              </TextLink>
            }
          />
          <PrintGrid>
            <PrintTiles works={more} />
          </PrintGrid>
        </Band>
      )}

      {/* The journal links to #story, in this streamed part. */}
      <ScrollToFragment />
    </>
  );
}
