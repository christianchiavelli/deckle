import { Band, DropRow, PageHead } from '@deckle/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { requestTime } from '../../../../components/request-time';
import { getCopy } from '../../../../copy/server';
import { readDrops, readDropStocks } from '../../../../gateway/reads';
import {
  chipOf,
  factsOf,
  headlineOf,
  paragraphsOf,
  phaseOf,
  stocksBySlug,
} from '../../../../views/drops';
import { imageAt } from '../../../../views/images';

export async function generateMetadata(): Promise<Metadata> {
  const { drops: text } = await getCopy();
  return { title: text.title, description: text.lede };
}

/** Every drop: the one open now on the copper dark, then the ones still to open. */
export default async function DropsPage() {
  const { drops: text } = await getCopy();
  return (
    <>
      <Band aria-labelledby="drops-title">
        <PageHead id="drops-title" title={text.title} lede={text.lede} />
      </Band>
      <Suspense fallback={<Band aria-busy="true" />}>
        <Drops />
      </Suspense>
    </>
  );
}

async function Drops() {
  const copy = await getCopy();
  const { drops: text } = copy;
  // Which drop is open, and how many of its copies, are a matter of the moment.
  const now = await requestTime();
  const [drops, stocks] = await Promise.all([
    readDrops(copy.lang),
    readDropStocks().catch(() => []),
  ]);
  const counted = stocksBySlug(stocks);

  return drops.map((drop) => {
    const stock = counted.get(drop.slug) ?? null;
    const open = phaseOf(drop, now) === 'open';
    const image = drop.artwork?.image;
    const [paragraph = ''] = paragraphsOf(drop);
    return image ? (
      <DropRow
        key={drop.slug}
        id={`${drop.slug}-title`}
        tone={open ? 'feature' : 'page'}
        href={copy.path(`/drops/${drop.slug}`)}
        image={{ src: imageAt(image.url, 'card'), width: image.width, height: image.height }}
        state={chipOf(drop, stock, now, copy)}
        title={headlineOf(drop, copy)}
        text={paragraph}
        facts={factsOf(drop, stock, now, copy)}
        action={open ? text.claim : text.see}
      />
    ) : null;
  });
}
