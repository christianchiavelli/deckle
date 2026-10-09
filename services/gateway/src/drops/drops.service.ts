import { Injectable, Logger } from '@nestjs/common';
import type { CmsLanguage } from '../cms/cms.client.js';
import type { Edition } from '../commerce/shop-api.client.js';
import { ShopApiClient } from '../commerce/shop-api.client.js';
import type { ShopOrder } from '../commerce/shop-orders.responses.js';
import { CommerceRefusal, ShopSessionClient } from '../commerce/shop-session.client.js';
import {
  checkoutDetails,
  type CheckoutDetails,
  type CheckoutInput,
} from '../checkout/checkout.input.js';
import { payForOrder, SHIPPING } from '../checkout/checkout-steps.js';
import { asShopper } from '../checkout/commerce-refusals.js';
import type { PlacedOrder } from '../checkout/order.model.js';
import { placedOrderOf } from '../checkout/order-mapping.js';
import { refusal } from '../graphql/refusal.js';
import { CommerceTokenSigner } from '../identity/commerce-token.signer.js';
import type { RequestSession } from '../sessions/sessions.service.js';
import { signedInAccount } from '../sessions/signed-in.js';
import { copyStateOf, type DropCopy } from './drop.model.js';
import { DropStore, type OwnedCopy } from './drop-store.js';

/** Ten minutes: long enough to type an address, short enough that a copy left alone comes back. */
export const HOLD_MINUTES = 10;

export const dropCopyOf = (copy: OwnedCopy): DropCopy => ({
  drop: copy.drop,
  number: copy.number,
  state: copyStateOf(copy.status),
  heldUntil: copy.heldUntil,
  secondsLeft: copy.secondsLeft,
  orderCode: copy.orderCode,
});

/**
 * Claiming, giving back and paying for a drop's numbered copies. The database
 * decides who gets which copy; commerce sells it to the customer behind the
 * account, signed in on the gateway's word, and its stock is the second barrier.
 */
@Injectable()
export class DropsService {
  private readonly logger = new Logger(DropsService.name);

  constructor(
    private readonly store: DropStore,
    private readonly catalogue: ShopApiClient,
    private readonly shop: ShopSessionClient,
    private readonly signer: CommerceTokenSigner,
  ) {}

  async claim(session: RequestSession, slug: string): Promise<DropCopy> {
    const userId = await signedInAccount(session);
    const outcome = await this.store.claim(slug, userId, HOLD_MINUTES);
    switch (outcome.kind) {
      case 'held':
        return dropCopyOf(outcome.copy);
      case 'no-drop':
        throw refusal('NO_SUCH_DROP', `There is no drop called ${slug}`);
      case 'not-open':
        throw refusal('DROP_NOT_OPEN', 'The drop has not opened yet');
      case 'no-copy':
        throw refusal('NO_COPY_OPEN', 'Every copy is held or sold; a held one may come back');
      case 'already-has':
        throw refusal('ALREADY_HAS_COPY', 'One copy per person, and this account has one');
      case 'holding-another':
        throw refusal('HOLDING_ANOTHER', 'Pay for the copy you hold, or let it go, first');
    }
  }

  async release(session: RequestSession, slug: string): Promise<boolean> {
    return this.store.release(slug, await signedInAccount(session));
  }

  async copiesOf(userId: string): Promise<DropCopy[]> {
    return (await this.store.copiesOf(userId)).map(dropCopyOf);
  }

  /**
   * Pays for the copy this account holds, as the customer commerce knows it by.
   * The copy stays locked in the database until commerce has taken the payment,
   * and is recorded as sold with commerce's order code.
   */
  async pay(
    session: RequestSession,
    slug: string,
    input: CheckoutInput,
    language: CmsLanguage,
  ): Promise<PlacedOrder> {
    const userId = await signedInAccount(session);
    const details = checkoutDetails(input);
    const [edition] = await this.catalogue.editions([slug]);
    if (edition === undefined)
      throw refusal('NO_SUCH_DROP', `Commerce sells no edition of ${slug}`);

    const result: { paid?: ShopOrder } = {};
    const outcome = await this.store.sell(slug, userId, async (copy) => {
      result.paid = await asShopper(() =>
        this.payInCommerce(session, userId, edition, copy, details, language),
      );
      return result.paid.code;
    });
    switch (outcome.kind) {
      case 'no-hold':
        throw refusal(
          'NO_HOLD',
          'This account holds no copy of the drop, or its ten minutes ran out',
        );
      case 'in-progress':
        throw refusal('PAYMENT_IN_PROGRESS', 'A payment for this copy is already under way');
      case 'sold': {
        const placed = placedOrderOf(result.paid ?? null);
        if (placed === null)
          throw new Error(`Copy ${outcome.copy.number} of ${slug} sold without an order`);
        return placed;
      }
    }
  }

  private async payInCommerce(
    session: RequestSession,
    userId: string,
    edition: Edition,
    copy: OwnedCopy,
    details: CheckoutDetails,
    language: CmsLanguage,
  ): Promise<ShopOrder> {
    const { token, active } = await this.customerOrder(session, userId);
    const order = await this.copyAlone(token, active, edition);
    return payForOrder(this.shop, token, order, {
      language,
      copy: { copyNumber: copy.number, receiptEmail: details.email },
      address: details.address,
      shippingMethod: SHIPPING.numberedCopy,
    });
  }

  /**
   * The customer's commerce session and its open order. Opened on the gateway's
   * signed word the first time the account pays, and again if commerce has let
   * it lapse, which it shows by answering with a fresh session of its own.
   */
  private async customerOrder(session: RequestSession, userId: string) {
    const current = await session.current();
    const kept = current?.customerToken ?? null;
    if (kept !== null) {
      const answer = await this.shop.activeOrder(kept);
      if (answer.token === null) return { token: kept, active: answer.value };
    }
    const token = await this.shop.authenticate(await this.signer.sign({ id: userId }));
    await session.update({ customerToken: token });
    return { token, active: (await this.shop.activeOrder(token)).value };
  }

  /** The customer's order, holding this copy and nothing else, ready to change. */
  private async copyAlone(
    token: string,
    active: ShopOrder | null,
    edition: Edition,
  ): Promise<ShopOrder> {
    let order = active;
    if (order?.state === 'ArrangingPayment') {
      order = (await this.shop.transition(token, 'AddingItems')).value;
    }
    for (const line of order?.lines ?? []) {
      if (line.productVariant.id !== edition.variantId) {
        order = (await this.shop.removeLine(token, line.id)).value;
      }
    }
    const line = order?.lines.find((each) => each.productVariant.id === edition.variantId);
    if (order !== null && line !== undefined) {
      return line.quantity === 1 ? order : (await this.shop.adjustLine(token, line.id, 1)).value;
    }
    try {
      return (await this.shop.addItem(token, edition.variantId, 1)).value;
    } catch (error) {
      if (error instanceof CommerceRefusal && error.code === 'INSUFFICIENT_STOCK_ERROR') {
        // The gateway's lock let a copy through that commerce's stock did not: the
        // second barrier held, which should never be needed.
        this.logger.error(
          `Commerce has no stock of ${edition.slug} for a copy the gateway held: ${error.message}`,
        );
      }
      throw error;
    }
  }
}
