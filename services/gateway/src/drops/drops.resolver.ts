import {
  Args,
  Context,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
  Subscription,
} from '@nestjs/graphql';
import { slugSchema } from '../catalog/artworks.args.js';
import { Artwork } from '../catalog/models/artwork.model.js';
import { Money } from '../catalog/models/money.model.js';
import { CheckoutInput } from '../checkout/checkout.input.js';
import { PlacedOrder } from '../checkout/order.model.js';
import { ArgsSchemaPipe } from '../graphql/args-schema.pipe.js';
import { crossService, listOf } from '../graphql/complexity.js';
import type { GatewayContext } from '../graphql/gateway-context.js';
import { Drop, DropCopy, DropPage, DropStock, copyStateOf } from './drop.model.js';
import { DropStockFeed } from './drop-stock-feed.js';
import { type DropStock as Stock, DropStore } from './drop-store.js';
import { DropsService } from './drops.service.js';

const dropArg = () => new ArgsSchemaPipe(slugSchema);

const stockOf = (stock: Stock): DropStock => ({
  open: stock.open,
  held: stock.held,
  sold: stock.sold,
  copies: stock.copies.map(copyStateOf),
});

@Resolver(() => Drop)
export class DropsResolver {
  constructor(
    private readonly service: DropsService,
    private readonly store: DropStore,
    private readonly feed: DropStockFeed,
  ) {}

  @Query(() => [Drop], {
    description: 'Every drop, the soonest to open first.',
    complexity: listOf(4),
  })
  drops(): Promise<readonly Drop[]> {
    return this.store.drops();
  }

  @Query(() => Drop, { nullable: true, description: 'Null when no drop has this slug.' })
  drop(@Args('slug', { type: () => String }, dropArg()) slug: string): Promise<Drop | null> {
    return this.store.drop(slug);
  }

  @Mutation(() => DropCopy, {
    description:
      'Claims the lowest open copy, held for this account for ten minutes. One per person; a signed-in account only.',
  })
  claimCopy(
    @Args('drop', { type: () => String }, dropArg()) drop: string,
    @Context() context: GatewayContext,
  ): Promise<DropCopy> {
    return this.service.claim(context.session, drop);
  }

  @Mutation(() => Boolean, {
    description:
      'Gives back the copy this account holds, for the next person. False when it held none.',
  })
  releaseCopy(
    @Args('drop', { type: () => String }, dropArg()) drop: string,
    @Context() context: GatewayContext,
  ): Promise<boolean> {
    return this.service.release(context.session, drop);
  }

  @Mutation(() => PlacedOrder, {
    description:
      'Pays for the copy this account holds: its shipping is included, and the test payment settles at once.',
  })
  payForCopy(
    @Args('drop', { type: () => String }, dropArg()) drop: string,
    @Args('input', { type: () => CheckoutInput }) input: CheckoutInput,
    @Context() context: GatewayContext,
  ): Promise<PlacedOrder> {
    return this.service.pay(context.session, drop, input);
  }

  @Subscription(() => DropStock, {
    description:
      "A drop's stock each time a copy is claimed, given back, sold or let go; the stock as it stands is the `drop` query's.",
    resolve: (stock: Stock) => stockOf(stock),
  })
  dropStockChanged(@Args('drop', { type: () => String }, dropArg()) drop: string) {
    return this.feed.watch(drop);
  }

  @ResolveField(() => Artwork, { nullable: true, description: 'The work the drop prints.' })
  artwork(@Parent() drop: Drop, @Context() context: GatewayContext) {
    return context.loaders.artworkBySlug.load(drop.artworkSlug);
  }

  @ResolveField(() => DropPage, {
    nullable: true,
    description: "The words on the drop's page; null until an editor publishes them.",
    complexity: crossService,
  })
  page(@Parent() drop: Drop, @Context() context: GatewayContext) {
    return context.loaders.dropPageBySlug.load(drop.slug);
  }

  @ResolveField(() => Money, {
    nullable: true,
    description: "A copy's price, shipping included; null when commerce sells no edition of it.",
    complexity: crossService,
  })
  async price(@Parent() drop: Drop, @Context() context: GatewayContext): Promise<Money | null> {
    const edition = await context.loaders.editionByDrop.load(drop.slug);
    return edition === null ? null : { amount: edition.price, currencyCode: edition.currencyCode };
  }

  @ResolveField(() => DropStock, {
    description:
      'Where its copies stand now. Never cached: read it fresh, then follow `dropStockChanged`.',
  })
  async stock(@Parent() drop: Drop): Promise<DropStock> {
    const stock = (await this.store.stock([drop.slug])).get(drop.slug);
    if (stock === undefined) throw new Error(`The drop ${drop.slug} has no copies`);
    return stockOf(stock);
  }

  @ResolveField(() => DropCopy, {
    nullable: true,
    description:
      "The signed-in account's copy of this drop, held or bought; null for a guest or none.",
  })
  async viewerCopy(
    @Parent() drop: Drop,
    @Context() context: GatewayContext,
  ): Promise<DropCopy | null> {
    const userId = (await context.session.current())?.userId ?? null;
    if (userId === null) return null;
    const copies = await this.service.copiesOf(userId);
    return copies.find((copy) => copy.drop === drop.slug) ?? null;
  }
}
