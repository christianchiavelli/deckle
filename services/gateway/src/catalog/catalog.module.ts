import { Module } from '@nestjs/common';
import { CommerceModule } from '../commerce/commerce.module.js';
import { ArtworksResolver } from './artworks.resolver.js';
import { ArtworksService } from './artworks.service.js';
import { CollectionsResolver } from './collections.resolver.js';
import { CollectionsService } from './collections.service.js';

@Module({
  imports: [CommerceModule],
  providers: [ArtworksService, CollectionsService, ArtworksResolver, CollectionsResolver],
  exports: [ArtworksService],
})
export class CatalogModule {}
