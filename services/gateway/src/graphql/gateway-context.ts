import type DataLoader from 'dataloader';
import type { Artwork } from '../catalog/models/artwork.model.js';
import type { Edition } from '../commerce/shop-api.client.js';
import type { DropPage } from '../drops/drop.model.js';
import type { RequestSession } from '../sessions/sessions.service.js';
import type { Story } from '../stories/story.model.js';

/**
 * Loaders that batch what one operation reads from the upstreams: however many
 * artworks a page shows, their stories cost one CMS request, and the artworks of
 * every curation on it one commerce request; the drops page reads its words and
 * its prices once each.
 */
export interface RequestLoaders {
  readonly artworkBySlug: DataLoader<string, Artwork | null>;
  readonly storyByArtworkSlug: DataLoader<string, Story | null>;
  /** The words on each drop's page, from the CMS. */
  readonly dropPageBySlug: DataLoader<string, DropPage | null>;
  /** Each drop's edition as commerce sells it, for its price. */
  readonly editionByDrop: DataLoader<string, Edition | null>;
}

/** What every resolver receives as its GraphQL context. */
export interface GatewayContext {
  readonly loaders: RequestLoaders;
  /**
   * Whether this operation reads the CMS's newest drafts instead of what is
   * published: the store's, in preview, and never a browser's (see drafts.ts).
   */
  readonly drafts: boolean;
  /** This browser's session, read from its cookie the first time a resolver asks. */
  readonly session: RequestSession;
}
