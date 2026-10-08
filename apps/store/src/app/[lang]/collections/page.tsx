import { Band, CollectionRow, PageHead } from '@deckle/ui';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import { Suspense } from 'react';
import { copy } from '../../copy';
import { FRONT_PAGE, readCurations } from '../../gateway/reads';
import { listedCurations, picturesOf } from '../../views/collections';
import { imageAt } from '../../views/images';

const { collections: text } = copy;

export const metadata: Metadata = { title: text.title };

function Head() {
  return (
    <Band aria-labelledby="collections-title" tight>
      <PageHead id="collections-title" title={text.title} lede={text.lede} />
    </Band>
  );
}

/** Every collection the editor keeps, each a band of its own, as approved. */
export default function CollectionsPage() {
  return (
    <>
      <Head />
      <Suspense fallback={<Band aria-busy="true" />}>
        <Collections />
      </Suspense>
    </>
  );
}

async function Collections() {
  await connection();
  const { curations } = await readCurations();
  return listedCurations(curations, FRONT_PAGE.curation).map((curation, index) => (
    <CollectionRow
      key={curation.slug}
      id={`collection-${curation.slug}`}
      tone={index % 2 === 0 ? 'band' : 'page'}
      title={curation.title}
      intro={curation.intro}
      href={`/collections/${curation.slug}`}
      link={text.see(curation.artworks.length)}
      images={picturesOf(curation).map((image) => ({
        src: imageAt(image.url, 'card'),
        width: image.width,
        height: image.height,
      }))}
    />
  ));
}
