import { Module } from '@nestjs/common';
import { CatalogModule } from '../catalog/catalog.module.js';
import { CommerceModule } from '../commerce/commerce.module.js';
import { CartResolver } from './cart.resolver.js';
import { CartService } from './cart.service.js';

@Module({
  imports: [CommerceModule, CatalogModule],
  providers: [CartService, CartResolver],
})
export class CheckoutModule {}
