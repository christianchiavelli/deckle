import type { INestApplicationContext } from '@nestjs/common';
import type { CreateAddressInput } from '@vendure/common/lib/generated-types';
import {
  Address,
  Customer,
  CustomerHistoryEntry,
  CustomerService,
  Fulfillment,
  isGraphQlErrorResult,
  Logger,
  manualFulfillmentHandler,
  Order,
  OrderHistoryEntry,
  OrderLine,
  OrderService,
  Payment,
  ProductVariant,
  Refund,
  ShippingMethod,
  TransactionalConnection,
  type ID,
  type RequestContext,
} from '@vendure/core';
import { In, IsNull, Not } from 'typeorm';
import {
  demoPlan,
  momentOf,
  type DemoCustomer,
  type DemoOptions,
  type DemoOrder,
  type SellableVariant,
} from './demo-plan.js';
import { PAYMENT_METHOD, SHIPPING_METHOD } from './shop-setup.js';
import { superadminContext } from './superadmin.js';

const loggerCtx = 'Seed';

/**
 * A small print shop's two months. The favourites are The Met object ids of the
 * works that sell most: the Great Wave, Red Fuji, Melencolia I, the Rhinoceros and
 * Hiroshige's Sudden Shower.
 */
export const DEMO_TRADE: Omit<DemoOptions, 'now'> = {
  customers: 40,
  orders: 150,
  days: 60,
  favourites: ['45434', '57007', '336228', '356497', '37094'],
};

export interface DemoSeedReport {
  customersCreated: number;
  ordersPlaced: number;
  /** Planned orders a customer had already placed in an earlier run. */
  ordersKept: number;
}

/** The shape every one of Vendure's error results shares. */
interface ErrorResult {
  readonly errorCode: unknown;
  readonly message: string;
}

/** A service's result, or the error it returned instead, thrown with what was being done. */
function succeeded<T>(result: T, what: string): Exclude<T, ErrorResult> {
  if (isGraphQlErrorResult(result)) {
    throw new Error(`The demo could not ${what}: ${(result as ErrorResult).message}`);
  }
  return result as Exclude<T, ErrorResult>;
}

/**
 * Places the demo trade through Vendure's services, as a checkout would: guest
 * customers with an address, carts, shipping, the test payment, then parcels shipped
 * and delivered, or a cancellation and its refund. Vendure dates every step with the
 * moment it ran, so each order's dates are moved back to the plan's afterwards; the
 * dashboard's charts and lists read them like any other order's.
 *
 * Safe to run again. The plan is the same on any day, moved by whole days, so a
 * customer found by email address already holds their first planned orders, and is
 * given only those beyond them: the ones planned for later on the day of the first run.
 */
export async function seedDemo(
  app: INestApplicationContext,
  now: Date = new Date(),
  trade: Omit<DemoOptions, 'now'> = DEMO_TRADE,
): Promise<DemoSeedReport> {
  const ctx = await superadminContext(app);
  const connection = app.get(TransactionalConnection);
  const db = connection.rawConnection;
  const orderService = app.get(OrderService);

  const variants = await db.getRepository(ProductVariant).find({
    where: { enabled: true, deletedAt: IsNull(), product: { enabled: true, deletedAt: IsNull() } },
    relations: { product: true },
  });
  const sellable = variants.flatMap((variant): SellableVariant[] => {
    // A drop's numbered copies are sold through the drop, one per person, never by the demo.
    if (variant.customFields.editionSize !== null) {
      return [];
    }
    const size = variant.customFields.paperSize;
    const work = variant.product.customFields.metObjectId ?? variant.productId;
    return size === null ? [] : [{ sku: variant.sku, work: String(work), size }];
  });
  const variantIds = new Map(variants.map((variant) => [variant.sku, variant.id]));
  const shipping = await db
    .getRepository(ShippingMethod)
    .findOneOrFail({ where: { code: SHIPPING_METHOD.code, deletedAt: IsNull() } });

  const plan = demoPlan(sellable, { ...trade, now });
  const report: DemoSeedReport = { customersCreated: 0, ordersPlaced: 0, ordersKept: 0 };

  const customers = new Map<number, Customer>();
  const toSkip = new Map<number, number>();
  for (const [index, planned] of plan.customers.entries()) {
    const existing = await db
      .getRepository(Customer)
      .findOne({ where: { emailAddress: planned.emailAddress, deletedAt: IsNull() } });
    if (existing) {
      customers.set(index, existing);
      toSkip.set(
        index,
        await db.getRepository(Order).count({
          where: { customer: { id: existing.id }, orderPlacedAt: Not(IsNull()) },
        }),
      );
    }
  }

  /** The customers this run creates, each with the order that brought them in. */
  const newcomers = new Map<ID, DemoOrder>();
  for (const planned of plan.orders) {
    const skip = toSkip.get(planned.customer) ?? 0;
    if (skip > 0) {
      toSkip.set(planned.customer, skip - 1);
      report.ordersKept += 1;
      continue;
    }
    const person = plan.customers[planned.customer];
    if (!person) {
      throw new Error(`The demo plan names customer ${String(planned.customer)}, who is missing`);
    }
    let customer = customers.get(planned.customer);
    if (!customer) {
      // A guest becomes a customer at their first checkout, not before.
      customer = await connection.withTransaction(ctx, (tx) => createCustomer(app, tx, person));
      customers.set(planned.customer, customer);
      newcomers.set(customer.id, planned);
      report.customersCreated += 1;
    }
    // One order, one transaction: Vendure takes a payment only inside one, and a run
    // that stops halfway leaves no order half placed. Its dates move once it is committed.
    const placed = await connection.withTransaction(ctx, (tx) =>
      placeOrder(tx, orderService, {
        planned,
        customer,
        person,
        variantIds,
        shippingMethodId: shipping.id,
      }),
    );
    await backdateOrder(app, placed, planned);
    report.ordersPlaced += 1;
    if (report.ordersPlaced % 25 === 0) {
      Logger.info(`Demo: ${String(report.ordersPlaced)} orders placed`, loggerCtx);
    }
  }

  await backdateCustomers(app, newcomers);
  return report;
}

async function createCustomer(
  app: INestApplicationContext,
  ctx: RequestContext,
  planned: DemoCustomer,
): Promise<Customer> {
  const customerService = app.get(CustomerService);
  const customer = succeeded(
    await customerService.createOrUpdate(ctx, {
      emailAddress: planned.emailAddress,
      firstName: planned.firstName,
      lastName: planned.lastName,
    }),
    `create ${planned.emailAddress}`,
  );
  await customerService.createAddress(ctx, customer.id, {
    ...addressOf(planned),
    defaultShippingAddress: true,
    defaultBillingAddress: true,
  });
  return customer;
}

function addressOf(person: DemoCustomer): CreateAddressInput {
  const { province, ...address } = person.address;
  return {
    fullName: `${person.firstName} ${person.lastName}`,
    ...address,
    ...(province === null ? {} : { province }),
  };
}

interface Placement {
  readonly planned: DemoOrder;
  readonly customer: Customer;
  readonly person: DemoCustomer;
  readonly variantIds: ReadonlyMap<string, ID>;
  readonly shippingMethodId: ID;
}

/** The records an order's dates live on, besides its own and its lines'. */
interface Placed {
  readonly id: ID;
  readonly fulfillments: readonly ID[];
  readonly refunds: readonly ID[];
}

async function placeOrder(
  ctx: RequestContext,
  orders: OrderService,
  { planned, customer, person, variantIds, shippingMethodId }: Placement,
): Promise<Placed> {
  const { id } = await orders.create(ctx);
  await orders.addCustomerToOrder(ctx, id, customer);
  for (const line of planned.lines) {
    const variantId = variantIds.get(line.sku);
    if (variantId === undefined) {
      throw new Error(`The demo plan sells ${line.sku}, which the shop does not have`);
    }
    succeeded(
      await orders.addItemToOrder(ctx, id, variantId, line.quantity),
      `add ${line.sku} to a cart`,
    );
  }
  await orders.setShippingAddress(ctx, id, addressOf(person));
  await orders.setBillingAddress(ctx, id, addressOf(person));
  succeeded(await orders.setShippingMethod(ctx, id, [shippingMethodId]), 'choose shipping');
  succeeded(await orders.transitionToState(ctx, id, 'ArrangingPayment'), 'go to payment');
  const order = succeeded(
    await orders.addPaymentToOrder(ctx, id, { method: PAYMENT_METHOD.code, metadata: {} }),
    'pay',
  );

  const fulfillments: ID[] = [];
  const refunds: ID[] = [];
  if (planned.fate === 'cancelled') {
    succeeded(
      await orders.cancelOrder(ctx, {
        orderId: id,
        reason: 'The customer asked to cancel before it shipped',
        cancelShipping: true,
      }),
      `cancel ${order.code}`,
    );
    for (const payment of await orders.getOrderPayments(ctx, id)) {
      const refund = succeeded(
        await orders.refundOrder(ctx, {
          paymentId: payment.id,
          amount: payment.amount,
          // Deprecated in favour of `amount`, but their columns still refuse a null.
          shipping: 0,
          adjustment: 0,
          reason: 'Cancelled before it shipped',
        }),
        `refund ${order.code}`,
      );
      // The test payment has no refund of its own; a person settles it, as here.
      await orders.settleRefund(ctx, { id: refund.id, transactionId: `refund-${order.code}` });
      refunds.push(refund.id);
    }
  } else if (planned.fate === 'shipped' || planned.fate === 'delivered') {
    const paid = await orders.findOne(ctx, id, ['lines']);
    if (!paid) {
      throw new Error(`Order ${order.code} vanished before it could be packed`);
    }
    const fulfillment = succeeded(
      await orders.createFulfillment(ctx, {
        lines: paid.lines.map((line) => ({ orderLineId: line.id, quantity: line.quantity })),
        handler: {
          code: manualFulfillmentHandler.code,
          arguments: [
            { name: 'method', value: 'Tracked post' },
            { name: 'trackingCode', value: `DK${order.code}` },
          ],
        },
      }),
      `pack ${order.code}`,
    );
    fulfillments.push(fulfillment.id);
    succeeded(await orders.transitionFulfillmentToState(ctx, fulfillment.id, 'Shipped'), 'ship');
    if (planned.fate === 'delivered') {
      succeeded(
        await orders.transitionFulfillmentToState(ctx, fulfillment.id, 'Delivered'),
        'deliver',
      );
    }
  }

  return { id, fulfillments, refunds };
}

async function backdateOrder(
  app: INestApplicationContext,
  { id: orderId, fulfillments, refunds }: Placed,
  planned: DemoOrder,
): Promise<void> {
  const db = app.get(TransactionalConnection).rawConnection;
  const started = momentOf(planned, { type: 'ORDER_STATE_TRANSITION', to: 'AddingItems' });
  const finished = planned.deliveredAt ?? planned.shippedAt ?? planned.cancelledAt;
  await db.getRepository(Order).update(orderId, {
    createdAt: started,
    orderPlacedAt: planned.placedAt,
    updatedAt: finished ?? planned.placedAt,
  });
  await db
    .getRepository(OrderLine)
    .update({ order: { id: orderId } }, { createdAt: started, updatedAt: planned.placedAt });
  await db
    .getRepository(Payment)
    .update(
      { order: { id: orderId } },
      { createdAt: planned.placedAt, updatedAt: planned.cancelledAt ?? planned.placedAt },
    );
  if (fulfillments.length > 0) {
    const packed = momentOf(planned, { type: 'ORDER_FULFILLMENT' });
    await db
      .getRepository(Fulfillment)
      .update({ id: In([...fulfillments]) }, { createdAt: packed, updatedAt: finished ?? packed });
  }
  if (refunds.length > 0) {
    const refunded = momentOf(planned, { type: 'ORDER_REFUND_TRANSITION' });
    await db
      .getRepository(Refund)
      .update({ id: In([...refunds]) }, { createdAt: refunded, updatedAt: refunded });
  }
  const history = await db
    .getRepository(OrderHistoryEntry)
    .find({ where: { order: { id: orderId } }, order: { id: 'ASC' } });
  for (const entry of history) {
    const moment = momentOf(planned, { type: entry.type, to: stateOf(entry.data) });
    await db
      .getRepository(OrderHistoryEntry)
      .update(entry.id, { createdAt: moment, updatedAt: moment });
  }
}

/** The state a history entry records a move to, if it records one. */
function stateOf(data: unknown): unknown {
  return typeof data === 'object' && data !== null && 'to' in data ? data.to : undefined;
}

/** Each new customer dates from their first checkout, minutes before they paid. */
async function backdateCustomers(
  app: INestApplicationContext,
  newcomers: ReadonlyMap<ID, DemoOrder>,
): Promise<void> {
  const db = app.get(TransactionalConnection).rawConnection;
  for (const [id, first] of newcomers) {
    const since = momentOf(first, { type: 'ORDER_STATE_TRANSITION', to: 'ArrangingPayment' });
    await db.getRepository(Customer).update(id, { createdAt: since, updatedAt: since });
    await db
      .getRepository(Address)
      .update({ customer: { id } }, { createdAt: since, updatedAt: since });
    await db
      .getRepository(CustomerHistoryEntry)
      .update({ customer: { id } }, { createdAt: since, updatedAt: since });
  }
}
