import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { ButtonLink } from '../components/button/button.tsx';
import { Chip } from '../components/chip/chip.tsx';
import { Icon } from '../components/icon/icon.tsx';
import { TextLink } from '../components/text-link/text-link.tsx';
import { formatPpi } from '../format.ts';
import { Band, SectionHead } from '../sections/band.tsx';
import { PrintGrid, PrintTile } from '../sections/print-tile.tsx';
import { SizeDiagram } from '../sections/size-diagram.tsx';
import { Stage } from '../sections/stage.tsx';
import { StoryCard, StoryGrid } from '../sections/story-card.tsx';
import { typeRole } from '../theme/type.ts';
import { Chrome } from './chrome.tsx';
import { EditionBand } from './edition-band.tsx';
import {
  curations,
  imageOf,
  LOCALE,
  metaOf,
  optionsOf,
  pixels,
  priceLine,
  scanOf,
  total,
  work,
} from './fixtures.ts';

const Hero = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};
  align-items: center;

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

const Three = styled(PrintGrid)`
  @media ${media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
`;

const featured = [
  'the-rhinoceros',
  'the-three-trees',
  'south-wind-clear-sky',
  'the-drawbridge',
  'evening-snow-at-kanbara',
  'the-sleep-of-reason-produces-monsters',
  'black-lion-wharf',
  'two-young-women-on-a-verandah',
];

/** The front page: what Deckle is, the next drop, the prints, how sizes are set, collections and stories. */
export function HomePage() {
  const wave = work('under-the-wave-off-kanagawa');
  const melencolia = work('melencolia-i');
  const rhinoceros = work('the-rhinoceros');
  const sizes = optionsOf(melencolia);
  const scan = scanOf(melencolia);

  return (
    <Chrome>
      <Band aria-labelledby="home-title">
        <Hero>
          <HeroCopy>
            <h1 id="home-title">Prints from The Met, at the sizes their scans can hold</h1>
            <p>
              {total} works from the museum’s Open Access collection, from Dürer to Hiroshige,
              printed on cotton rag from The Met’s own scans. Never upscaled, so a line engraved in
              1514 stays a line.
            </p>
            <Actions>
              <ButtonLink href="/prints" icon="arrow">
                Browse the prints
              </ButtonLink>
              <TextLink href="/about/sizes">How we size prints</TextLink>
            </Actions>
          </HeroCopy>
          <Stage
            image={{
              ...imageOf(wave),
              alt: 'A great wave curls over three boats, its crest breaking into claws of foam; Mount Fuji sits small in the distance.',
            }}
            caption={`${wave.artist.name} · ${wave.date.display}`}
          />
        </Hero>
      </Band>

      <EditionBand />

      <Band aria-labelledby="prints-title">
        <SectionHead
          id="prints-title"
          title="The prints"
          action={
            <TextLink href="/prints" icon="arrow">
              See all {total} prints
            </TextLink>
          }
        />
        <PrintGrid>
          {featured.map((slug) => {
            const entry = work(slug);
            const price = priceLine(entry);
            return (
              <li key={slug}>
                <PrintTile
                  href={`/prints/${slug}`}
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

      <Band tone="band" aria-labelledby="sizing-title">
        <Sizing>
          <SizingCopy>
            <h2 id="sizing-title">How large can a print be?</h2>
            <p>
              Every inch of paper needs 240 of the scan’s pixels, or fine lines start to soften at
              arm’s length. The Met’s scan of Melencolia I is {pixels(scan.width)} pixels across:
              enough for A3 at 302 ppi. A2 would need 3,213, so we print it up to A3 and no larger.
            </p>
            <Sizes>
              {sizes.map((option) => (
                <li key={option.size} className={option.available ? undefined : 'off'}>
                  {option.available ? (
                    <Icon name="check" size="small" />
                  ) : (
                    <span aria-hidden="true">–</span>
                  )}
                  <strong>{option.size}</strong>
                  <span>{formatPpi(option.ppi, LOCALE)}</span>
                  <span>{option.available ? 'Printed' : 'Too few pixels'}</span>
                </li>
              ))}
            </Sizes>
            <TextLink href="/about/sizes" icon="arrow">
              How we size prints
            </TextLink>
          </SizingCopy>
          <SizeDiagram sizes={sizes} src={imageOf(melencolia).src} locale={LOCALE} />
        </Sizing>
      </Band>

      <Band aria-labelledby="collections-title">
        <SectionHead
          id="collections-title"
          title="Collections"
          action={
            <TextLink href="/collections" icon="arrow">
              Every collection
            </TextLink>
          }
        />
        <Three>
          {curations.slice(0, 3).map((curation) => {
            const cover = curation.works[0];
            return cover ? (
              <li key={curation.slug}>
                <PrintTile
                  href={`/collections/${curation.slug}`}
                  image={imageOf(cover)}
                  title={curation.title}
                  meta={`${String(curation.works.length)} prints`}
                />
              </li>
            ) : null;
          })}
        </Three>
      </Band>

      <Band tone="band" aria-labelledby="journal-title">
        <SectionHead
          id="journal-title"
          title="From the journal"
          action={
            <TextLink href="/journal" icon="arrow">
              Every story
            </TextLink>
          }
        />
        <StoryGrid>
          <li>
            <StoryCard
              href="/prints/melencolia-i#story"
              kicker="About the engraving"
              title={melencolia.shortTitle}
              lede="Dürer cut Melencolia I into copper in 1514, a year after Knight, Death, and the Devil. With Saint Jerome in His Study, the three are known as his master engravings."
              image={{ ...imageOf(melencolia), detail: { x: 80, y: 18, zoom: 3 } }}
            />
          </li>
          <li>
            <StoryCard
              href="/prints/the-rhinoceros#story"
              kicker="About the woodcut"
              title={rhinoceros.shortTitle}
              lede="Dürer never saw the animal he drew. An Indian rhinoceros reached Lisbon in 1515, the first living one seen in Europe since Roman times, and he worked from a written description and a sketch sent on to Nuremberg."
              image={{ ...imageOf(rhinoceros), detail: { x: 84, y: 52, zoom: 2.2 } }}
            />
          </li>
          <li>
            <StoryCard
              href="/prints/under-the-wave-off-kanagawa#story"
              kicker="About the print"
              title={wave.shortTitle}
              lede="Hokusai made the Great Wave around 1830–32 for his series Thirty-six Views of Mount Fuji. The mountain sits small in the distance, framed by the trough of the wave."
              image={{ ...imageOf(wave), detail: { x: 30, y: 30, zoom: 1.6 } }}
            />
          </li>
        </StoryGrid>
      </Band>
    </Chrome>
  );
}
