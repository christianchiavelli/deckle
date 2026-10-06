import { Band } from '../sections/band.tsx';
import { CollectionRow } from '../sections/collection-row.tsx';
import { PageHead } from '../sections/page-head.tsx';
import { Chrome } from './chrome.tsx';
import { curations, imageOf } from './fixtures.ts';

/** Every collection the editor keeps, each a band of its own, page and band in turn. */
export function CollectionsPage() {
  return (
    <Chrome current="collections">
      <Band aria-labelledby="collections-title" tight>
        <PageHead
          id="collections-title"
          title="Collections"
          lede="Prints the editor put together, a few at a time, with a line on why they belong side by side."
        />
      </Band>
      {curations.map((curation, index) => (
        <CollectionRow
          key={curation.slug}
          id={`collection-${curation.slug}`}
          tone={index % 2 === 0 ? 'band' : 'page'}
          title={curation.title}
          intro={curation.intro}
          href={`/collections/${curation.slug}`}
          link={`See the ${String(curation.works.length)} prints`}
          images={curation.works.map(imageOf)}
        />
      ))}
    </Chrome>
  );
}
