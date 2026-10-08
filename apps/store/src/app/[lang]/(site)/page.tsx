import {
  Band,
  ButtonLink,
  Icon,
  PrintGrid,
  PrintTile,
  SectionHead,
  SizeDiagram,
  Stage,
  StoryCard,
  StoryGrid,
  TextLink,
  typeRole,
} from '@deckle/ui';
import { formatPpi } from '@deckle/ui/format';
import { media, tokens as t } from '@deckle/tokens';
import { connection } from 'next/server';
import { Suspense } from 'react';
import styled from 'styled-components';
import { EditionBand } from '../../../components/edition-band';
import { PrintTiles } from '../../../components/print-tiles';
import { requestTime } from '../../../components/request-time';
import { getCopy } from '../../../copy/server';
import {
  FRONT_PAGE,
  readCatalogue,
  readCurations,
  readDrops,
  readDropStocks,
  readHome,
  readJournal,
} from '../../../gateway/reads';
import { listedCurations, picturesOf } from '../../../views/collections';
import { featuredDrop, stocksBySlug } from '../../../views/drops';
import { imageAt } from '../../../views/images';
import { journalOf, storyHref } from '../../../views/journal';
import { sizingOf } from '../../../views/sizing';
import { smallestFirst } from '../../../views/work';

const Hero = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};
  align-items: center;
  min-block-size: 24rem;

  @media ${media.md} {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: ${t.space.gap3xl};
  }
`;

const HeroCopy = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};

  h1 {
    ${typeRole('heading1')}
    text-wrap: balance;

    @media ${media.md} {
      ${typeRole('display')}
    }
  }

  p {
    max-inline-size: 46ch;
    color: ${t.text.secondary};
    font-size: 1.125rem;
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${t.space.gapLg};
`;

const Sizing = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};
  align-items: center;

  @media ${media.md} {
    grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
    gap: ${t.space.gap3xl};
  }
`;

const SizingCopy = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};

  h2 {
    ${typeRole('heading2')}
    text-wrap: balance;
  }

  > p {
    max-inline-size: 52ch;
    color: ${t.text.secondary};
  }
`;

const Sizes = styled.ul`
  display: grid;
  gap: ${t.space.gapXs};
  inline-size: 100%;
  max-inline-size: 26rem;

  li {
    display: grid;
    grid-template-columns: 1.25rem 2.5rem minmax(0, 1fr) auto;
    align-items: center;
    gap: ${t.space.gapSm};
    padding-block: ${t.space.gapXs};
    border-block-end: ${t.strokeWidth.hairline} solid ${t.stroke.subtle};
    font-variant-numeric: tabular-nums;
  }

  strong {
    font-weight: ${t.type.label.weight};
  }

  .off {
    color: ${t.text.secondary};
  }

  svg {
    color: ${t.icon.accent};
  }
`;

// Doubled to outrank the grid's own columns, whose styles can stream in after these.
const Three = styled(PrintGrid)`
  @media ${media.md} {
    && {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }
`;

/** The front page, as approved: what Deckle is, the next drop, the prints, and how sizes are set. */
export default function HomePage() {
  return (
    <Suspense fallback={<Opening />}>
      <Home />
    </Suspense>
  );
}

/** What the page says before the gateway has answered: the same words, without the numbers. */
async function Opening() {
  const { home } = await getCopy();
  return (
    <Band aria-labelledby="home-title" aria-busy="true">
      <Hero>
        <HeroCopy>
          <h1 id="home-title">{home.title}</h1>
        </HeroCopy>
      </Hero>
    </Band>
  );
}

async function Home() {
  const copy = await getCopy();
  const { home, locale } = copy;
  // The gateway is not there when the image is built: this page renders on
  // request, and its reads come from the cache the gateway keeps honest.
  await connection();
  const [{ curation, hero, sizing }, { artworks }, { curations }, journal, drops, stocks] =
    await Promise.all([
      readHome(copy.lang),
      readCatalogue(),
      readCurations(copy.lang),
      readJournal(copy.lang),
      readDrops(copy.lang),
      // Without its counts the band still says when the drop opens.
      readDropStocks().catch(() => []),
    ]);
  const now = await requestTime();
  const counted = stocksBySlug(stocks);
  const drop = featuredDrop(drops, counted, now);
  const collections = listedCurations(curations, FRONT_PAGE.curation).slice(0, 3);
  const stories = journalOf(journal.artworks.edges.map((edge) => edge.node)).slice(0, 3);
  const total = new Intl.NumberFormat(locale).format(artworks.totalCount);
  // The editor's selection; the catalogue's first works if it was unpublished.
  const featured = curation?.artworks ?? artworks.edges.slice(0, 8).map((edge) => edge.node);
  const explained = sizing && sizingOf(sizing, copy);

  return (
    <>
      <Band aria-labelledby="home-title">
        <Hero>
          <HeroCopy>
            <h1 id="home-title">{home.title}</h1>
            <p>{home.intro(total)}</p>
            <Actions>
              <ButtonLink href={copy.path('/prints')} icon="arrow">
                {home.browse}
              </ButtonLink>
              <TextLink href={copy.path('/about/sizes')}>{home.howWeSize}</TextLink>
            </Actions>
          </HeroCopy>
          {hero?.image && (
            <Stage
              image={{
                src: imageAt(hero.image.url, 'page'),
                width: hero.image.width,
                height: hero.image.height,
                alt: [hero.title, hero.artist?.name].filter(Boolean).join(', '),
              }}
              caption={[hero.artist?.name, hero.date].filter(Boolean).join(' · ')}
            />
          )}
        </Hero>
      </Band>

      {drop && <EditionBand drop={drop} stock={counted.get(drop.slug) ?? null} now={now} />}

      <Band aria-labelledby="prints-title">
        <SectionHead
          id="prints-title"
          title={home.prints}
          action={
            <TextLink href={copy.path('/prints')} icon="arrow">
              {home.seeAll(total)}
            </TextLink>
          }
        />
        <PrintGrid>
          <PrintTiles works={featured} />
        </PrintGrid>
      </Band>

      {sizing?.image && explained && (
        <Band tone="band" aria-labelledby="sizing-title">
          <Sizing>
            <SizingCopy>
              <h2 id="sizing-title">{home.sizingTitle}</h2>
              <p>{explained}</p>
              <Sizes>
                {smallestFirst(sizing.sizes).map((option) => (
                  <li key={option.size} className={option.available ? undefined : 'off'}>
                    {option.available ? (
                      <Icon name="check" size="small" />
                    ) : (
                      <span aria-hidden="true">–</span>
                    )}
                    <strong>{option.size}</strong>
                    <span>{formatPpi(option.ppi, locale)}</span>
                    <span>{option.available ? home.printed : home.tooFewPixels}</span>
                  </li>
                ))}
              </Sizes>
              <TextLink href={copy.path('/about/sizes')} icon="arrow">
                {home.howWeSize}
              </TextLink>
            </SizingCopy>
            <SizeDiagram
              sizes={smallestFirst(sizing.sizes)}
              src={imageAt(sizing.image.url, 'card')}
              locale={locale}
            />
          </Sizing>
        </Band>
      )}

      {collections.length > 0 && (
        <Band aria-labelledby="collections-title">
          <SectionHead
            id="collections-title"
            title={home.collections}
            action={
              <TextLink href={copy.path('/collections')} icon="arrow">
                {home.everyCollection}
              </TextLink>
            }
          />
          <Three>
            {collections.map((collection) => {
              const [cover] = picturesOf(collection);
              return cover ? (
                <li key={collection.slug}>
                  <PrintTile
                    href={copy.path(`/collections/${collection.slug}`)}
                    image={{
                      src: imageAt(cover.url, 'card'),
                      width: cover.width,
                      height: cover.height,
                    }}
                    title={collection.title}
                    meta={copy.collections.prints(collection.artworks.length)}
                  />
                </li>
              ) : null;
            })}
          </Three>
        </Band>
      )}

      {stories.length > 0 && (
        <Band tone="band" aria-labelledby="journal-title">
          <SectionHead
            id="journal-title"
            title={home.journal}
            action={
              <TextLink href={copy.path('/journal')} icon="arrow">
                {home.everyStory}
              </TextLink>
            }
          />
          <StoryGrid>
            {stories.map((story) => (
              <li key={story.slug}>
                <StoryCard
                  href={copy.path(storyHref(story.slug))}
                  kicker={story.kicker}
                  title={story.title}
                  lede={story.lede}
                  image={story.image}
                />
              </li>
            ))}
          </StoryGrid>
        </Band>
      )}
    </>
  );
}
