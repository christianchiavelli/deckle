import {
  Band,
  ButtonLink,
  Icon,
  PrintGrid,
  SectionHead,
  SizeDiagram,
  Stage,
  TextLink,
  typeRole,
} from '@deckle/ui';
import { formatPpi } from '@deckle/ui/format';
import { media, tokens as t } from '@deckle/tokens';
import { connection } from 'next/server';
import { Suspense } from 'react';
import styled from 'styled-components';
import { PrintTiles } from '../components/print-tiles';
import { copy } from '../copy';
import { readCatalogue, readHome } from '../gateway/reads';
import { imageAt } from '../views/images';
import { sizingOf } from '../views/sizing';
import { smallestFirst } from '../views/work';

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

const { home, locale } = copy;

/** The front page, as approved: what Deckle is, the prints, and how sizes are set. */
export default function HomePage() {
  return (
    <Suspense fallback={<Opening />}>
      <Home />
    </Suspense>
  );
}

/** What the page says before the gateway has answered: the same words, without the numbers. */
function Opening() {
  return (
    <Band aria-labelledby="home-title">
      <Hero>
        <HeroCopy>
          <h1 id="home-title">{home.title}</h1>
        </HeroCopy>
      </Hero>
    </Band>
  );
}

async function Home() {
  // The gateway is not there when the image is built: this page renders on
  // request, and its reads come from the cache the gateway keeps honest.
  await connection();
  const [{ curation, hero, sizing }, { artworks }] = await Promise.all([
    readHome(),
    readCatalogue(),
  ]);
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
              <ButtonLink href="/prints" icon="arrow">
                {home.browse}
              </ButtonLink>
              <TextLink href="/about/sizes">{home.howWeSize}</TextLink>
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

      <Band aria-labelledby="prints-title">
        <SectionHead
          id="prints-title"
          title={home.prints}
          action={
            <TextLink href="/prints" icon="arrow">
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
              <TextLink href="/about/sizes" icon="arrow">
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
    </>
  );
}
