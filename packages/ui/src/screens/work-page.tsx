import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { Breadcrumbs } from '../components/breadcrumbs/breadcrumbs.tsx';
import { Button } from '../components/button/button.tsx';
import { Chip } from '../components/chip/chip.tsx';
import { Note } from '../components/note/note.tsx';
import { Price } from '../components/price/price.tsx';
import { SizeOptions } from '../components/size-options/size-options.tsx';
import { TextLink } from '../components/text-link/text-link.tsx';
import { Band, SectionHead } from '../sections/band.tsx';
import {
  Assurances,
  BuyBox,
  EditionCallout,
  PriceRule,
  WorkHeading,
} from '../sections/buy-box.tsx';
import { PrintGrid, PrintTile } from '../sections/print-tile.tsx';
import { Record } from '../sections/record.tsx';
import { Stage } from '../sections/stage.tsx';
import { Story } from '../sections/story.tsx';
import { Thumbnails } from '../sections/thumbnails.tsx';
import { Chrome } from './chrome.tsx';
import { EditionBand } from './edition-band.tsx';
import {
  CURRENCY,
  factsOf,
  imageOf,
  lifeOf,
  LOCALE,
  metaOf,
  pixels,
  priceLine,
  scanOf,
  sizesOf,
  work,
} from './fixtures.ts';

const Product = styled(Band)`
  padding-block-start: ${t.space.gapLg};
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

const Gallery = styled.div`
  display: grid;
  gap: ${t.space.gapSm};
`;

const more = [
  'the-rhinoceros',
  'knight-death-and-the-devil',
  'the-sleep-of-reason-produces-monsters',
  'under-the-wave-off-kanagawa',
];

/** A work's page, Melencolia I: the print and how to buy it, its edition, its story and record. */
export function WorkPage() {
  const melencolia = work('melencolia-i');
  const image = imageOf(melencolia);
  const scan = scanOf(melencolia);

  return (
    <Chrome current="prints">
      <Product aria-labelledby="work-title">
        <Breadcrumbs
          label="Breadcrumb"
          items={[
            { label: 'Prints', href: '/prints' },
            { label: 'Engravings', href: '/collections/engravings' },
            { label: melencolia.artist.name, href: '/artists/albrecht-durer' },
          ]}
        />
        <Grid>
          <Gallery>
            <Stage
              image={{
                ...image,
                alt: 'A winged woman sits brooding among tools of geometry and carpentry, a compass in her hand, beneath a bell, an hourglass and a magic square; a bat-like creature carries the title banner across the sky.',
              }}
              caption={`The Met’s scan · ${pixels(scan.width)} × ${pixels(scan.height)} px`}
              zoom="Inspect the detail"
            />
            <Thumbnails
              image={image}
              selected={0}
              items={[
                { label: 'The whole print' },
                { label: 'Detail: the magic square', detail: { x: 86, y: 21, zoom: 5 } },
                { label: 'Detail: the angel’s face', detail: { x: 72, y: 36, zoom: 4 } },
                { label: 'Detail: the title banner', detail: { x: 13, y: 18, zoom: 4 } },
              ]}
            />
          </Gallery>

          <BuyBox as="form" action="/cart" method="post">
            <WorkHeading
              id="work-title"
              artist={{
                name: melencolia.artist.name,
                href: '/artists/albrecht-durer',
                bio: lifeOf(melencolia),
              }}
              title={melencolia.shortTitle}
              facts={factsOf(melencolia)}
            />
            <PriceRule>
              <Price amount={9000} currency={CURRENCY} locale={LOCALE} missing="Price not set">
                A3, unframed
              </Price>
            </PriceRule>
            <SizeOptions
              name="size"
              legend="Size"
              options={sizesOf(melencolia)}
              defaultValue="A3"
              currency={CURRENCY}
              locale={LOCALE}
              unavailable="Scan too small"
              missingPrice="Price not set"
              help={<TextLink href="/about/sizes">How we size prints</TextLink>}
              note={
                <Note>
                  A2 would need 3,213 px across the image. The Met’s scan has 2,820, and we never
                  upscale.
                </Note>
              }
            />
            <Button type="submit" icon="bag">
              Add to cart
            </Button>
            <EditionCallout
              href="#edition"
              title="A numbered edition of 50"
              detail="Opens Thu 15 Oct, 18:00 UTC. One per person, with a passkey"
            />
            <Assurances
              items={[
                { icon: 'ppi', text: 'Printed at 302 ppi on A3, from the museum’s own scan' },
                { icon: 'tube', text: 'Pigment print on cotton rag, shipped rolled in a tube' },
                { icon: 'open', text: 'Public domain, from The Met’s Open Access collection' },
              ]}
            />
          </BuyBox>
        </Grid>
      </Product>

      <EditionBand />

      <Band aria-labelledby="story-title">
        <Story
          id="story-title"
          title="About the engraving"
          lede="Dürer cut Melencolia I into copper in 1514, a year after Knight, Death, and the Devil. With Saint Jerome in His Study, the three are known as his master engravings."
          paragraphs={[
            'A winged figure sits idle among the tools of measuring and making, a compass slack in her hand. Above her hang an hourglass, a scale and a bell, beside a magic square in which every row, column and diagonal adds up to 34. Its bottom row gives the year: 15 14.',
          ]}
          source={`Source: The Met, Melencolia I, ${melencolia.accessionNumber}`}
          figure={{
            ...image,
            alt: 'Detail of the magic square, with the bell and the hourglass above it.',
            detail: { x: 80, y: 18, zoom: 3 },
            caption: 'The magic square: every row, column and diagonal adds up to 34',
          }}
        />
      </Band>

      <Band tone="band" aria-labelledby="record-title">
        <SectionHead
          id="record-title"
          title="From the museum’s record"
          action={
            <TextLink href={melencolia.objectUrl} icon="out">
              metmuseum.org
            </TextLink>
          }
        />
        <Record
          missing="Not recorded"
          entries={[
            { term: 'Artist', detail: `${melencolia.artist.name}, ${melencolia.artist.bio}` },
            { term: 'Date', detail: melencolia.date.display },
            { term: 'Medium', detail: melencolia.medium },
            { term: 'Dimensions', detail: melencolia.dimensions[0] ?? null },
            { term: 'Culture', detail: melencolia.culture },
            { term: 'Period', detail: melencolia.period },
            { term: 'Credit line', detail: melencolia.creditLine },
            { term: 'Object number', detail: melencolia.accessionNumber },
            { term: 'Rights', detail: 'Public domain, Open Access (CC0)' },
            {
              term: 'Scan',
              detail: `${pixels(scan.width)} × ${pixels(scan.height)} px, read from the file`,
            },
          ]}
        />
      </Band>

      <Band aria-labelledby="more-title">
        <SectionHead
          id="more-title"
          title="More prints"
          action={
            <TextLink href="/prints" icon="arrow">
              See all 48 prints
            </TextLink>
          }
        />
        <PrintGrid>
          {more.map((slug) => {
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
    </Chrome>
  );
}
