import { MIN_PPI, PAPER_SIZE_ORDER, PAPER_SIZES } from '@deckle/print-sizes';
import { media, tokens as t } from '@deckle/tokens';
import styled from 'styled-components';
import { ButtonLink } from '../components/button/button.tsx';
import { Chip } from '../components/chip/chip.tsx';
import { formatCentimetres } from '../format.ts';
import { Band, SectionHead } from '../sections/band.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { SizeDiagram } from '../sections/size-diagram.tsx';
import { type SizeRow, SizeTable } from '../sections/size-table.tsx';
import { typeRole } from '../theme/type.ts';
import { Chrome } from './chrome.tsx';
import {
  allWorks,
  imageOf,
  LOCALE,
  optionsOf,
  pixels,
  scanOf,
  work,
  type Work,
} from './fixtures.ts';

const Examples = styled.ol`
  display: grid;
  gap: ${t.space.gap2xl};

  > li {
    display: grid;
    gap: ${t.space.gapMd};
    padding-block-start: ${t.space.gapLg};
    border-block-start: ${t.strokeWidth.hairline} solid ${t.stroke.default};

    @media ${media.md} {
      grid-template-columns: minmax(0, 4fr) minmax(0, 8fr);
      gap: ${t.space.gap3xl};
      align-items: end;
    }
  }

  h3 {
    ${typeRole('heading3')}
  }

  p {
    color: ${t.text.secondary};
    font-size: 0.9375rem;
  }
`;

const Verdict = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapXs};
`;

const Columns = styled.div`
  display: grid;
  gap: ${t.space.gap2xl};

  @media ${media.md} {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: ${t.space.gapXl};
  }

  h3 {
    ${typeRole('heading3')}
    margin-block-end: ${t.space.gapSm};
  }

  p {
    color: ${t.text.secondary};
  }
`;

const Closing = styled.div`
  display: grid;
  justify-items: start;
  gap: ${t.space.gapLg};
  margin-block-start: ${t.space.gap3xl};
`;

const Note = styled.p`
  max-inline-size: 60ch;
  margin-block-start: ${t.space.gapLg};
  color: ${t.text.secondary};
  font-size: 0.875rem;
`;

const CM_PER_INCH = 2.54;

/** What each size takes, read from the same table the shop sells by. */
const rows: SizeRow[] = PAPER_SIZE_ORDER.map((size) => {
  const { short, long, margin } = PAPER_SIZES[size];
  const area = { width: short - 2 * margin, height: long - 2 * margin };
  const need = (cm: number) => pixels(Math.ceil((cm / CM_PER_INCH) * MIN_PPI));
  return {
    size,
    sheet: formatCentimetres({ width: short, height: long }, LOCALE),
    area: formatCentimetres(area, LOCALE),
    pixels: `${need(area.width)} × ${need(area.height)} px`,
    works: allWorks.filter((entry) =>
      optionsOf(entry).some((option) => option.size === size && option.available),
    ).length,
  };
});

/** Three scans, three limits: the largest size of each, and why it stops there. */
const examples = [
  { slug: 'knight-death-and-the-devil', verdict: 'A4 only' },
  { slug: 'melencolia-i', verdict: 'Up to A3' },
  { slug: 'mill-river-scenery', verdict: 'Up to A2' },
].map(({ slug, verdict }) => ({ entry: work(slug), verdict }));

function why(entry: Work): string {
  const options = optionsOf(entry);
  const next = options.find((option) => !option.available);
  const scan = scanOf(entry);
  const side = next?.limitingSide === 'height' ? scan.height : scan.width;
  const across = next?.limitingSide === 'height' ? 'down' : 'across';
  return next?.requiredPixels
    ? `${next.size} would need ${pixels(next.requiredPixels)} px ${across} the image; the scan has ${pixels(side)}.`
    : 'Every size we print.';
}

/** How sizes are set, with the shop's own scans as the examples. */
export function SizesPage() {
  return (
    <Chrome>
      <Band aria-labelledby="sizes-title">
        <PageHead
          id="sizes-title"
          title="How we size prints"
          lede={`A print is only as sharp as the scan behind it. We offer each work at the sizes its scan can fill at ${String(MIN_PPI)} pixels for every inch of paper, and none larger.`}
        />
      </Band>

      <Band tone="band" aria-labelledby="examples-title">
        <SectionHead id="examples-title" title="Three scans, three limits" />
        <Examples>
          {examples.map(({ entry, verdict }) => {
            const scan = scanOf(entry);
            return (
              <li key={entry.slug}>
                <Verdict>
                  <Chip tone="soft">{verdict}</Chip>
                  <h3>{entry.shortTitle}</h3>
                  <p>
                    {entry.artist.name}, {entry.date.display}. The Met’s scan is{' '}
                    {pixels(scan.width)} × {pixels(scan.height)} px. {why(entry)}
                  </p>
                </Verdict>
                <SizeDiagram sizes={optionsOf(entry)} src={imageOf(entry).src} locale={LOCALE} />
              </li>
            );
          })}
        </Examples>
      </Band>

      <Band aria-labelledby="table-title">
        <SectionHead id="table-title" title="What each size takes" />
        <SizeTable
          caption={`Each sheet keeps a white border; the print sits inside it, at ${String(MIN_PPI)} ppi or more.`}
          headers={{
            size: 'Size',
            area: 'Printed area',
            pixels: `At ${String(MIN_PPI)} ppi`,
            works: 'Works that reach it',
          }}
          rows={rows}
        />
        <Note>
          A print keeps its proportions, so it meets the border across or down, and needs the pixels
          along that side. None of the scans The Met serves for these works is large enough for A1.
        </Note>
      </Band>

      <Band tone="band" aria-labelledby="rules-title">
        <SectionHead id="rules-title" title="The rules behind it" />
        <Columns>
          <div>
            <h3>{MIN_PPI} pixels an inch</h3>
            <p>
              At that density, lines engraved a hair apart stay apart at arm’s length. Below it, the
              finest work starts to soften.
            </p>
          </div>
          <div>
            <h3>Never upscaled</h3>
            <p>
              Enlarging a scan invents the pixels it lacks, and invented pixels print as soft edges.
              Where a scan runs out, we stop at the size before.
            </p>
          </div>
          <div>
            <h3>Read from the file</h3>
            <p>
              The Met’s API does not say how large an image is, so we read each scan’s own header.
              The numbers on a print’s page are the file’s, not an estimate.
            </p>
          </div>
        </Columns>
        <Closing>
          <ButtonLink href="/prints" icon="arrow">
            Browse the prints
          </ButtonLink>
        </Closing>
      </Band>
    </Chrome>
  );
}
