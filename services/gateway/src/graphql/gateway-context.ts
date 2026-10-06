import type DataLoader from 'dataloader';
import type { Artwork } from '../catalog/models/artwork.model.js';
import type { Story } from '../stories/story.model.js';

/**
 * Loaders that batch what one operation reads from the upstreams: however many
 * artworks a page shows, their stories cost one CMS request, and the artworks of
 * every curation on it one commerce request.
 */
export interface RequestLoaders {
  readonly artworkBySlug: DataLoader<string, Artwork | null>;
  readonly storyByArtworkSlug: DataLoader<string, Story | null>;
}

/** What every resolver receives as its GraphQL context. */
export interface GatewayContext {
  readonly loaders: RequestLoaders;
}
