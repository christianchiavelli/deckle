import type { PaperSize } from '@deckle/print-sizes';
import {
  Args,
  ArgsType,
  Context,
  Field,
  ID,
  Int,
  Mutation,
  Parent,
  Query,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';
import { z } from 'zod';
import { slugSchema } from '../catalog/artworks.args.js';
import { Artwork } from '../catalog/models/artwork.model.js';
import { PaperSizeEnum } from '../catalog/models/print-size.model.js';
import { ShopSessionClient } from '../commerce/shop-session.client.js';
import { ArgsSchemaPipe } from '../graphql/args-schema.pipe.js';
import { crossService, listOf } from '../graphql/complexity.js';
import type { GatewayContext } from '../graphql/gateway-context.js';
import { CartService, MAX_QUANTITY } from './cart.service.js';
import { CheckoutInput } from './checkout.input.js';
import { Cart, Country, OrderLine, PlacedOrder } from './order.model.js';
import { placedOrderOf } from './order-mapping.js';

@ArgsType()
class AddToCartArgs {
  @Field(() => String, { description: "The work's slug." })
  artwork!: string;

  @Field(() => PaperSizeEnum)
  size!: PaperSize;

  @Field(() => Int, { defaultValue: 1, description: `From 1 to ${MAX_QUANTITY}.` })
  quantity!: number;
}

const addToCartSchema = z.object({
  artwork: slugSchema,
  size: z.enum(PaperSizeEnum),
  quantity: z.int().min(1).max(MAX_QUANTITY),
});

@ArgsType()
class SetQuantityArgs {
  @Field(() => ID)
  line!: string;

  @Field(() => Int, { description: `From 0, which removes the line, to ${MAX_QUANTITY}.` })
  quantity!: number;
}

const setQuantitySchema = z.object({
  line: z.string().min(1).max(64),
  quantity: z.int().min(0).max(MAX_QUANTITY),
});

const orderCodeSchema = z.string().regex(/^[A-Z0-9]{1,32}$/, { error: 'not an order code' });

@Resolver(() => OrderLine)
export class CartResolver {
  constructor(
    private readonly carts: CartService,
    private readonly shop: ShopSessionClient,
  ) {}

  @Query(() => Cart, {
    description: "This browser's cart; empty until something is added.",
    complexity: crossService,
  })
  cart(@Context() context: GatewayContext): Promise<Cart> {
    return this.carts.cart(context.session);
  }

  @Query(() => PlacedOrder, {
    nullable: true,
    description:
      'An order this browser placed, for its confirmation; null when it is not this browser’s or not placed.',
    complexity: crossService,
  })
  async order(
    @Args('code', { type: () => String }, new ArgsSchemaPipe(orderCodeSchema)) code: string,
    @Context() context: GatewayContext,
  ): Promise<PlacedOrder | null> {
    const session = await context.session.current();
    for (const token of [session?.cartToken ?? null, session?.customerToken ?? null]) {
      if (token === null) continue;
      const placed = placedOrderOf(await this.shop.orderByCode(token, code));
      if (placed !== null) return placed;
    }
    return null;
  }

  @Query(() => [Country], {
    description: 'Where the shop ships, for the checkout form.',
    complexity: listOf(30),
  })
  countries(): Promise<readonly Country[]> {
    return this.shop.countries();
  }

  @Mutation(() => Cart, {
    description: 'Adds a print to the cart, starting the cart if there was none.',
  })
  addToCart(
    @Args(new ArgsSchemaPipe(addToCartSchema)) args: AddToCartArgs,
    @Context() context: GatewayContext,
  ): Promise<Cart> {
    return this.carts.add(context.session, args.artwork, args.size, args.quantity);
  }

  @Mutation(() => Cart, { description: 'Changes how many of a line the cart holds; 0 removes it.' })
  setCartLineQuantity(
    @Args(new ArgsSchemaPipe(setQuantitySchema)) args: SetQuantityArgs,
    @Context() context: GatewayContext,
  ): Promise<Cart> {
    return this.carts.setQuantity(context.session, args.line, args.quantity);
  }

  @Mutation(() => PlacedOrder, {
    description:
      'Places the cart as a guest order: contact, address, the flat rate, and the test payment, which settles at once.',
  })
  placeOrder(
    @Args('input', { type: () => CheckoutInput }) input: CheckoutInput,
    @Context() context: GatewayContext,
  ): Promise<PlacedOrder> {
    return this.carts.checkout(context.session, input);
  }

  @ResolveField(() => Artwork, {
    nullable: true,
    description: 'The work the line prints; null if commerce no longer sells it.',
  })
  artwork(@Parent() line: OrderLine, @Context() context: GatewayContext) {
    return context.loaders.artworkBySlug.load(line.artworkSlug);
  }
}
