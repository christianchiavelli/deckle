import { Band, Record, SectionHead, Steps } from '@deckle/ui';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { requestTime } from '../../../../components/request-time';
import { copy } from '../../../../copy';
import { readDrop, readDropStocks } from '../../../../gateway/reads';
import { DropLive } from '../../../../live/drop-page';
import {
  headlineOf,
  openingOf,
  paragraphsOf,
  priceOf,
  recordOf,
  stocksBySlug,
} from '../../../../views/drops';
import { imageAt } from '../../../../views/images';

const { drop: text } = copy;

export async function generateMetadata({ params }: PageProps<'/drops/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const drop = await readDrop(slug);
  return drop
    ? { title: headlineOf(drop, copy), description: paragraphsOf(drop)[0] ?? undefined }
    : {};
}

/**
 * A drop's page, as approved: the edition and the way to a copy, the fifty
 * copies as they go, how a drop works and what the print is.
 */
export default function DropPage({ params }: PageProps<'/drops/[slug]'>) {
  return (
    <Suspense fallback={<Band tone="feature" aria-busy="true" />}>
      <Drop params={params} />
    </Suspense>
  );
}

async function Drop({ params }: Pick<PageProps<'/drops/[slug]'>, 'params'>) {
  const { slug } = await params;
  const drop = await readDrop(slug);
  if (!drop) {
    notFound();
  }
  // Whether it is open, and its copies, are read for this request; the rest is cached.
  const now = await requestTime();
  const stocks = stocksBySlug(await readDropStocks().catch(() => []));
  const image = drop.artwork?.image;

  return (
    <>
      <DropLive
        slug={drop.slug}
        editionSize={drop.editionSize}
        opensAt={drop.opensAt}
        headline={headlineOf(drop, copy)}
        paragraph={paragraphsOf(drop)[0] ?? null}
        price={priceOf(drop, copy)}
        opening={openingOf(drop, copy)}
        image={
          image
            ? {
                src: imageAt(image.url, 'page'),
                width: image.width,
                height: image.height,
                alt: [drop.artwork?.title, drop.artwork?.artist?.name].filter(Boolean).join(', '),
              }
            : null
        }
        stock={stocks.get(drop.slug) ?? null}
        now={now}
      />

      <Band tone="band" aria-labelledby="how-title">
        <SectionHead id="how-title" title={text.howTitle} />
        <Steps steps={text.steps} />
      </Band>

      <Band aria-labelledby="print-title">
        <SectionHead id="print-title" title={text.printTitle} />
        <Record missing={text.missing} entries={recordOf(drop, copy)} />
      </Band>
    </>
  );
}
