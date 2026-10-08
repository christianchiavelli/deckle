import { MIN_PPI } from '@deckle/print-sizes';
import {
  Band,
  ButtonLink,
  Chip,
  PageHead,
  SectionHead,
  SizeDiagram,
  SizeTable,
  typeRole,
} from '@deckle/ui';
import { media, tokens as t } from '@deckle/tokens';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import styled from 'styled-components';
import { copy } from '../../../../copy';
import { readCatalogue, readSizing } from '../../../../gateway/reads';
import { imageAt } from '../../../../views/images';
import { noneAt, sizeRulesOf, verdictOf } from '../../../../views/size-rules';
import { smallestFirst, tooSmallNote } from '../../../../views/work';

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
  margin-block-start: ${t.space.gap3xl};
`;

const Note = styled.p`
  max-inline-size: 60ch;
  margin-block-start: ${t.space.gapLg};
  color: ${t.text.secondary};
  font-size: 0.875rem;
`;

const { sizes: text, locale } = copy;
const ppi = String(MIN_PPI);

export const metadata: Metadata = { title: text.title };

/** How sizes are set, with the shop's own scans as the examples, as approved. */
export default function SizesPage() {
  return (
    <>
      <Band aria-labelledby="sizes-title">
        <PageHead id="sizes-title" title={text.title} lede={text.lede(ppi)} />
      </Band>

      {/* The rules come in with the scans, so nothing under them moves when they do. */}
      <Suspense fallback={<Band aria-busy="true" />}>
        <Scans />
        <Rules />
      </Suspense>
    </>
  );
}

function Rules() {
  return (
    <Band tone="band" aria-labelledby="rules-title">
      <SectionHead id="rules-title" title={text.rules} />
      <Columns>
        <div>
          <h3>{text.density(ppi)}</h3>
          <p>{text.densityText}</p>
        </div>
        <div>
          <h3>{text.upscaled}</h3>
          <p>{text.upscaledText}</p>
        </div>
        <div>
          <h3>{text.file}</h3>
          <p>{text.fileText}</p>
        </div>
      </Columns>
      <Closing>
        <ButtonLink href="/prints" icon="arrow">
          {text.browse}
        </ButtonLink>
      </Closing>
    </Band>
  );
}

/** The three scans and the table: what the shop's own data says. */
async function Scans() {
  await connection();
  const [examples, { artworks }] = await Promise.all([readSizing(), readCatalogue()]);
  const rules = sizeRulesOf(
    artworks.edges.map((edge) => edge.node),
    copy,
  );
  const missing = noneAt(rules);
  const pixels = new Intl.NumberFormat(locale);
  const scans = [examples.first, examples.second, examples.third].flatMap((work) =>
    work?.image
      ? [
          {
            work,
            image: work.image,
            verdict: verdictOf(work.sizes, copy),
            note: tooSmallNote(work, copy, text.limit),
          },
        ]
      : [],
  );

  return (
    <>
      <Band tone="band" aria-labelledby="examples-title">
        <SectionHead id="examples-title" title={text.examples} />
        <Examples>
          {scans.map(({ work, image, verdict, note }) => (
            <li key={work.slug}>
              <Verdict>
                {verdict && <Chip tone="soft">{verdict}</Chip>}
                <h3>{work.title}</h3>
                <p>
                  {[
                    text.example(
                      [work.artist?.name, work.date].filter(Boolean).join(', '),
                      pixels.format(image.scanWidth),
                      pixels.format(image.scanHeight),
                    ),
                    note,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                </p>
              </Verdict>
              <SizeDiagram
                sizes={smallestFirst(work.sizes)}
                src={imageAt(image.url, 'card')}
                locale={locale}
              />
            </li>
          ))}
        </Examples>
      </Band>

      <Band aria-labelledby="table-title">
        <SectionHead id="table-title" title={text.table} />
        <SizeTable
          caption={text.caption(ppi)}
          headers={{
            size: text.headers.size,
            area: text.headers.area,
            pixels: text.headers.pixels(ppi),
            works: text.headers.works,
          }}
          rows={rules}
        />
        <Note>
          {text.note}
          {missing && ` ${text.noneAt(missing)}`}
        </Note>
      </Band>
    </>
  );
}
