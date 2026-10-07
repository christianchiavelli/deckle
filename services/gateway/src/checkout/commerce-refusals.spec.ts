import { GraphQLError } from 'graphql';
import { describe, expect, it } from 'vitest';
import { CommerceRefusal } from '../commerce/shop-session.client.js';
import { asShopper, explainRefusal } from './commerce-refusals.js';

const codeOf = (error: unknown) =>
  error instanceof GraphQLError ? error.extensions['code'] : 'not a GraphQL error';

describe('explainRefusal', () => {
  it.each([
    ['NO_ACTIVE_ORDER_ERROR', 'CART_EMPTY'],
    ['NEGATIVE_QUANTITY_ERROR', 'BAD_USER_INPUT'],
    ['ORDER_LIMIT_ERROR', 'BAD_USER_INPUT'],
    ['EMAIL_ADDRESS_CONFLICT_ERROR', 'INVALID_DETAILS'],
    ['GUEST_CHECKOUT_ERROR', 'INVALID_DETAILS'],
    ['ORDER_STATE_TRANSITION_ERROR', 'INVALID_DETAILS'],
    ['INELIGIBLE_SHIPPING_METHOD_ERROR', 'INVALID_DETAILS'],
    ['PAYMENT_DECLINED_ERROR', 'PAYMENT_FAILED'],
    ['PAYMENT_FAILED_ERROR', 'PAYMENT_FAILED'],
  ])("tells commerce's %s as %s", (code, told) => {
    expect(codeOf(explainRefusal(new CommerceRefusal(code, 'no')))).toBe(told);
  });

  it('keeps what the gateway asked wrongly as an error to log, and anything else as it was', () => {
    const odd = new CommerceRefusal('ORDER_MODIFICATION_ERROR', 'not in AddingItems');
    expect(explainRefusal(odd)).toBe(odd);
    const crash = new Error('boom');
    expect(explainRefusal(crash)).toBe(crash);
  });
});

describe('asShopper', () => {
  it('passes a step’s value through, and tells its refusal', async () => {
    expect(await asShopper(() => Promise.resolve(7))).toBe(7);
    await expect(
      asShopper(() => Promise.reject(new CommerceRefusal('PAYMENT_DECLINED_ERROR', 'no'))),
    ).rejects.toMatchObject({ extensions: { code: 'PAYMENT_FAILED' } });
  });
});
