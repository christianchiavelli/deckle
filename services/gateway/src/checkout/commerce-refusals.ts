import { ApolloServerErrorCode } from '@apollo/server/errors';
import { GraphQLError } from 'graphql';
import { CommerceRefusal } from '../commerce/shop-session.client.js';
import { refusal } from '../graphql/refusal.js';

/**
 * What commerce's refusals mean to a shopper. The ones a request can cause are
 * told as such; anything else is the gateway asking wrongly, and stays an error
 * to log, with commerce's own words.
 */
export function explainRefusal(error: unknown): unknown {
  if (!(error instanceof CommerceRefusal)) return error;
  switch (error.code) {
    case 'NO_ACTIVE_ORDER_ERROR':
      return refusal('CART_EMPTY', 'The cart is empty');
    case 'NEGATIVE_QUANTITY_ERROR':
    case 'ORDER_LIMIT_ERROR':
      return new GraphQLError('That quantity is not allowed', {
        extensions: { code: ApolloServerErrorCode.BAD_USER_INPUT },
      });
    case 'EMAIL_ADDRESS_CONFLICT_ERROR':
    case 'GUEST_CHECKOUT_ERROR':
    case 'ORDER_STATE_TRANSITION_ERROR':
    case 'INELIGIBLE_SHIPPING_METHOD_ERROR':
      return refusal('INVALID_DETAILS', `Commerce could not take these details: ${error.message}`);
    case 'PAYMENT_DECLINED_ERROR':
    case 'PAYMENT_FAILED_ERROR':
      return refusal('PAYMENT_FAILED', 'The test payment did not go through; nothing was charged');
    default:
      return error;
  }
}

/** Runs a step against commerce, telling its refusals the way the shopper should hear them. */
export async function asShopper<T>(step: () => Promise<T>): Promise<T> {
  try {
    return await step();
  } catch (error) {
    throw explainRefusal(error);
  }
}
