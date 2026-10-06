import { Chip, PrintTile } from '@deckle/ui';
import { copy } from '../copy';
import type { PrintTileFragment } from '../gateway/generated';
import { tilesOf } from '../views/tiles';

/** Works as the items of a `PrintGrid`: picture, title, maker and date, and the price. */
export function PrintTiles({ works }: { works: readonly PrintTileFragment[] }) {
  return tilesOf(works, copy).map((tile) => (
    <li key={tile.slug}>
      <PrintTile
        href={`/prints/${tile.slug}`}
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
