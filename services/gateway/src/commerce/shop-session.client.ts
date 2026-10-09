import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { Env } from '../config/env.js';
import { GraphQLClient, type GraphQLOperation } from '../upstream/graphql-client.js';
import {
  ACTIVE_ORDER,
  ADD_ITEM,
  ADD_PAYMENT,
  ADJUST_LINE,
  AUTHENTICATE,
  AVAILABLE_COUNTRIES,
  ELIGIBLE_SHIPPING,
  LOG_OUT,
  ORDER_BY_CODE,
  REMOVE_LINE,
  SET_CUSTOMER,
  SET_ORDER_FIELDS,
  SET_SHIPPING_ADDRESS,
  SET_SHIPPING_METHOD,
  TRANSITION,
} from './shop-orders.documents.js';
import {
  activeOrderSchema,
  authenticationSchema,
  countriesSchema,
  eligibleShippingSchema,
  logOutSchema,
  orderByCodeSchema,
  orderOrRefusal,
  type ShopOrder,
} from './shop-orders.responses.js';

/** The header Vendure answers a new session's token in, and reads it back from as a bearer. */
export const COMMERCE_SESSION_HEADER = 'vendure-auth-token';

const SHOP_API_TIMEOUT_MS = 5000;

/** A Shop API answer, and the session token commerce gave with it, if it gave one. */
export interface InSession<T> {
  readonly value: T;
  /**
   * A new session's token: on the first call that needed one, after a sign-in, or
   * when the token sent had lapsed. Null when the session sent is still the one.
   */
  readonly token: string | null;
}

/** Commerce refused a change and said why, in one of its error codes. */
export class CommerceRefusal extends Error {
  override readonly name = 'CommerceRefusal';

  constructor(
    /** Vendure's `ErrorCode`, e.g. `INSUFFICIENT_STOCK_ERROR`. */
    readonly code: string,
    message: string,
    readonly quantityAvailable: number | null = null,
  ) {
    super(`${code}: ${message}`);
  }
}

/**
 * What the gateway marks an order with: the language its receipt is written in,
 * and for a numbered copy, the copy's number and where its receipt goes.
 */
export interface OrderFields {
  readonly receiptLanguage: 'en' | 'pt-BR';
  readonly copyNumber?: number;
  readonly receiptEmail?: string;
}

export interface CustomerDetails {
  readonly emailAddress: string;
  readonly firstName: string;
  readonly lastName: string;
}

export interface ShippingAddress {
  readonly fullName: string;
  readonly streetLine1: string;
  readonly streetLine2: string | null;
  readonly city: string;
  readonly postalCode: string;
  readonly countryCode: string;
}

const changed = z.object({ result: orderOrRefusal.nullable() });

/**
 * The Shop API on behalf of one visitor: their cart as a guest, or their order
 * for a numbered copy once signed in. Commerce knows a visitor by the session
 * token the gateway keeps for them and sends as a bearer; the browser never
 * holds it. Writes are never retried, as with every upstream.
 */
@Injectable()
export class ShopSessionClient {
  private readonly graphql: GraphQLClient;

  constructor(config: ConfigService<Env, true>) {
    this.graphql = new GraphQLClient({
      service: 'commerce',
      url: config.get('COMMERCE_SHOP_API_URL', { infer: true }),
      timeoutMs: SHOP_API_TIMEOUT_MS,
    });
  }

  async activeOrder(token: string): Promise<InSession<ShopOrder | null>> {
    const answer = await this.send(token, true, {
      operationName: 'ActiveOrder',
      document: ACTIVE_ORDER,
      data: activeOrderSchema,
    });
    return { value: answer.value.activeOrder, token: answer.token };
  }

  async orderByCode(token: string, code: string): Promise<ShopOrder | null> {
    const answer = await this.send(token, true, {
      operationName: 'OrderByCode',
      document: ORDER_BY_CODE,
      variables: { code },
      data: orderByCodeSchema,
    });
    return answer.value.orderByCode;
  }

  addItem(token: string | null, variantId: string, quantity: number) {
    return this.change(token, 'AddItem', ADD_ITEM, { variantId, quantity });
  }

  adjustLine(token: string, lineId: string, quantity: number) {
    return this.change(token, 'AdjustLine', ADJUST_LINE, { lineId, quantity });
  }

  removeLine(token: string, lineId: string) {
    return this.change(token, 'RemoveLine', REMOVE_LINE, { lineId });
  }

  setCustomer(token: string, input: CustomerDetails) {
    return this.change(token, 'SetCustomer', SET_CUSTOMER, { input });
  }

  setShippingAddress(token: string, input: ShippingAddress) {
    return this.change(token, 'SetShippingAddress', SET_SHIPPING_ADDRESS, {
      input: { ...input, streetLine2: input.streetLine2 ?? '' },
    });
  }

  setOrderFields(token: string, customFields: OrderFields) {
    return this.change(token, 'SetOrderFields', SET_ORDER_FIELDS, { input: { customFields } });
  }

  /** The shipping methods the active order may use, by code. */
  async shippingMethods(token: string): Promise<ReadonlyMap<string, string>> {
    const answer = await this.send(token, true, {
      operationName: 'EligibleShipping',
      document: ELIGIBLE_SHIPPING,
      data: eligibleShippingSchema,
    });
    return new Map(answer.value.eligibleShippingMethods.map(({ code, id }) => [code, id]));
  }

  setShippingMethod(token: string, shippingMethodId: string) {
    return this.change(token, 'SetShippingMethod', SET_SHIPPING_METHOD, {
      ids: [shippingMethodId],
    });
  }

  transition(token: string, state: 'AddingItems' | 'ArrangingPayment') {
    return this.change(token, 'Transition', TRANSITION, { state });
  }

  /** The test payment, which settles at once: the order is placed when this returns. */
  pay(token: string, method: string) {
    return this.change(token, 'AddPayment', ADD_PAYMENT, { input: { method, metadata: {} } });
  }

  /**
   * Opens a session for the customer behind a Deckle user, on the token the
   * gateway signed for them. Sent without a guest's token, so no guest order is
   * merged into theirs.
   */
  async authenticate(deckleToken: string): Promise<string> {
    const answer = await this.send(null, false, {
      operationName: 'Authenticate',
      document: AUTHENTICATE,
      variables: { token: deckleToken },
      data: authenticationSchema,
    });
    const result = answer.value.authenticate;
    if ('errorCode' in result) throw new CommerceRefusal(result.errorCode, result.message);
    if (answer.token === null) {
      throw new CommerceRefusal(
        'NO_SESSION_TOKEN',
        'Commerce signed the customer in without a session token',
      );
    }
    return answer.token;
  }

  async logOut(token: string): Promise<void> {
    await this.send(token, false, {
      operationName: 'LogOut',
      document: LOG_OUT,
      data: logOutSchema,
    });
  }

  async countries(): Promise<readonly { code: string; name: string }[]> {
    const { availableCountries } = await this.graphql.query({
      operationName: 'AvailableCountries',
      document: AVAILABLE_COUNTRIES,
      data: countriesSchema,
    });
    return availableCountries;
  }

  private async change(
    token: string | null,
    operationName: string,
    document: string,
    variables: Record<string, unknown>,
  ): Promise<InSession<ShopOrder>> {
    const answer = await this.send(token, false, {
      operationName,
      document,
      variables,
      data: changed,
    });
    const result = answer.value.result;
    if (result === null) {
      throw new CommerceRefusal('NO_ACTIVE_ORDER_ERROR', 'There is no active order');
    }
    if ('errorCode' in result) {
      throw new CommerceRefusal(result.errorCode, result.message, result.quantityAvailable ?? null);
    }
    return { value: result, token: answer.token };
  }

  private async send<T>(
    token: string | null,
    idempotent: boolean,
    operation: GraphQLOperation<T>,
  ): Promise<InSession<T>> {
    const { data, headers } = await this.graphql.exchange(operation, {
      idempotent,
      headers: token === null ? {} : { authorization: `Bearer ${token}` },
    });
    return { value: data, token: headers.get(COMMERCE_SESSION_HEADER) };
  }
}
