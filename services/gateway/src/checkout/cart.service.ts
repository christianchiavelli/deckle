import type { PaperSize } from '@deckle/print-sizes';
import { Injectable } from '@nestjs/common';
import { ArtworksService } from '../catalog/artworks.service.js';
import type { CmsLanguage } from '../cms/cms.client.js';
import type { ShopOrder } from '../commerce/shop-orders.responses.js';
import {
  CommerceRefusal,
  type InSession,
  ShopSessionClient,
} from '../commerce/shop-session.client.js';
import { refusal } from '../graphql/refusal.js';
import type { RequestSession } from '../sessions/sessions.service.js';
import { checkoutDetails, customerOf, type CheckoutInput } from './checkout.input.js';
import { payForOrder, SHIPPING, shipBy } from './checkout-steps.js';
import { asShopper } from './commerce-refusals.js';
import type { Cart, PlacedOrder } from './order.model.js';
import { cartOf, EMPTY_CART, placedOrderOf } from './order-mapping.js';

/** As many of one print as one line takes; the cart's control stops there too. */
export const MAX_QUANTITY = 10;

/**
 * Commerce's guest session behind one browser's cart. Commerce opens it on the
 * first print added and may replace a lapsed one with a fresh, empty one; the
 * token it answers with is kept in the browser's session each time.
 */
class GuestOrder {
  constructor(
    private token: string | null,
    private readonly session: RequestSession,
  ) {}

  get current(): string | null {
    return this.token;
  }

  async run<T>(call: (token: string | null) => Promise<InSession<T>>): Promise<T> {
    const answer = await call(this.token);
    if (answer.token !== null && answer.token !== this.token) {
      this.token = answer.token;
      await this.session.update({ cartToken: answer.token });
    }
    return answer.value;
  }
}

/** The cart and its checkout: open editions only, as a guest, no account needed. */
@Injectable()
export class CartService {
  constructor(
    private readonly shop: ShopSessionClient,
    private readonly artworks: ArtworksService,
  ) {}

  async cart(session: RequestSession): Promise<Cart> {
    const order = await this.startedCart(session);
    if (order === null) return EMPTY_CART;
    return cartOf(await order.run((token) => this.shop.activeOrder(required(token))));
  }

  async add(
    session: RequestSession,
    artworkSlug: string,
    size: PaperSize,
    quantity: number,
  ): Promise<Cart> {
    const variantId = await this.openEditionVariant(artworkSlug, size);
    const order = new GuestOrder((await session.ensure()).cartToken, session);
    return asShopper(async () => {
      const added = await this.editing(order, (token) =>
        this.shop.addItem(token, variantId, quantity),
      );
      // The first print brings the flat rate along, so the cart's total is what checkout charges.
      const shipped =
        added.shippingLines.length > 0
          ? added
          : await order.run(async (token) => shipBy(this.shop, required(token), SHIPPING.standard));
      return cartOf(shipped);
    });
  }

  /** Sets how many of a line the cart holds; none removes it. */
  async setQuantity(session: RequestSession, lineId: string, quantity: number): Promise<Cart> {
    const order = await this.startedCart(session);
    if (order === null) throw noSuchLine();
    const active = await order.run((token) => this.shop.activeOrder(required(token)));
    if (!active?.lines.some((line) => line.id === lineId)) throw noSuchLine();
    return asShopper(async () =>
      cartOf(
        await this.editing(order, (token) =>
          quantity === 0
            ? this.shop.removeLine(required(token), lineId)
            : this.shop.adjustLine(required(token), lineId, quantity),
        ),
      ),
    );
  }

  /** Pays for the cart as a guest. The order it places is what the confirmation shows. */
  async checkout(
    session: RequestSession,
    input: CheckoutInput,
    language: CmsLanguage,
  ): Promise<PlacedOrder> {
    const details = checkoutDetails(input);
    const order = await this.startedCart(session);
    if (order === null) throw refusal('CART_EMPTY', 'The cart is empty');
    const active = await order.run((token) => this.shop.activeOrder(required(token)));
    if (active === null || active.lines.length === 0) {
      throw refusal('CART_EMPTY', 'The cart is empty');
    }
    const paid = await asShopper(() =>
      payForOrder(this.shop, required(order.current), active, {
        language,
        customer: customerOf(details),
        address: details.address,
        shippingMethod: SHIPPING.standard,
      }),
    );
    const placed = placedOrderOf(paid);
    if (placed === null) throw new Error(`Order ${paid.code} was paid but not placed`);
    return placed;
  }

  /** The guest order behind the cart, if anything was ever added. */
  private async startedCart(session: RequestSession): Promise<GuestOrder | null> {
    const token = (await session.current())?.cartToken ?? null;
    return token === null ? null : new GuestOrder(token, session);
  }

  /**
   * A change to the cart. An order a failed checkout left waiting for payment
   * refuses changes until it is brought back to the cart, which is done once.
   */
  private async editing(
    order: GuestOrder,
    change: (token: string | null) => Promise<InSession<ShopOrder>>,
  ): Promise<ShopOrder> {
    try {
      return await order.run(change);
    } catch (error) {
      if (!(error instanceof CommerceRefusal) || error.code !== 'ORDER_MODIFICATION_ERROR') {
        throw error;
      }
      await order.run((token) => this.shop.transition(required(token), 'AddingItems'));
      return order.run(change);
    }
  }

  private async openEditionVariant(artworkSlug: string, size: PaperSize): Promise<string> {
    const [artwork] = await this.artworks.bySlugs([artworkSlug]);
    const offered = artwork?.sizes.find((each) => each.size === size);
    if (!offered?.available || offered.variantId === null) {
      throw refusal('NOT_FOR_SALE', `${artworkSlug} is not sold at ${size}`);
    }
    return offered.variantId;
  }
}

const noSuchLine = () => refusal('NO_SUCH_LINE', 'That line is no longer in the cart');

/** The guest session exists by the time a step needs it: the first add opened it. */
function required(token: string | null): string {
  if (token === null) throw refusal('CART_EMPTY', 'The cart is empty');
  return token;
}
