import { Chip, PrintTile } from '@deckle/ui';
import { getCopy } from '../copy/server';
import type { PrintTileFragment } from '../gateway/generated';
import { tilesOf } from '../views/tiles';

/** Works as the items of a `PrintGrid`: picture, title, maker and date, and the price. */
export async function PrintTiles({ works }: { works: readonly PrintTileFragment[] }) {
  const copy = await getCopy();
  return tilesOf(works, copy).map((tile) => (
    <li key={tile.slug}>
      <PrintTile
        href={copy.path(`/prints/${tile.slug}`)}
        image={tile.image}
        title={tile.title}
        meta={tile.meta}
        price={
          <>
            {tile.price}
            {tile.only && <Chip tone="soft">{tile.only}</Chip>}
          </>
        }
      />
    </li>
  ));
}
