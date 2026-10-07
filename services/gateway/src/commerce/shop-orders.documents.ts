/**
 * The Shop API operations that act for one visitor, inside the Vendure session
 * the gateway keeps for them: a guest's cart and checkout, and a signed-in
 * collector's order for a numbered copy. Every mutation selects the order on
 * success and the error result Vendure answers instead, so a refusal is read,
 * never mistaken for a broken contract; each names its answer `result`, so one
 * schema reads them all.
 */

const ORDER = /* GraphQL */ `
  fragment DeckleOrder on Order {
    id
    code
    state
    active
    orderPlacedAt
    currencyCode
    totalQuantity
    subTotalWithTax
    shippingWithTax
    totalWithTax
    customFields {
      copyNumber
      receiptEmail
    }
    customer {
      emailAddress
    }
    shippingAddress {
      fullName
      streetLine1
      streetLine2
      city
      postalCode
      countryCode
      country
    }
    shippingLines {
      priceWithTax
      shippingMethod {
        code
      }
    }
    lines {
      id
      quantity
      unitPriceWithTax
      linePriceWithTax
      productVariant {
        id
        sku
        customFields {
          paperSize
          editionSize
        }
        product {
          slug
        }
      }
    }
  }
`;

const REFUSAL = /* GraphQL */ `
  fragment Refusal on ErrorResult {
    errorCode
    message
  }
`;

/** An order, or the error result Vendure gave instead. */
const ORDER_OR_REFUSAL = /* GraphQL */ `
  __typename
  ...DeckleOrder
  ...Refusal
`;

/**
 * The same for the two changes that take stock, the only ones whose answer can be
 * a shortfall: a fragment on a type the field never returns fails the whole query.
 */
const ORDER_OR_SHORTFALL = /* GraphQL */ `
  ${ORDER_OR_REFUSAL}
  ... on InsufficientStockError {
    quantityAvailable
  }
`;

const withFragments = (operation: string) => `${operation}\n${ORDER}\n${REFUSAL}`;

export const ACTIVE_ORDER = /* GraphQL */ `
  query ActiveOrder {
    activeOrder {
      ...DeckleOrder
    }
  }
  ${ORDER}
`;

export const ORDER_BY_CODE = /* GraphQL */ `
  query OrderByCode($code: String!) {
    orderByCode(code: $code) {
      ...DeckleOrder
    }
  }
  ${ORDER}
`;

export const ADD_ITEM = withFragments(/* GraphQL */ `
  mutation AddItem($variantId: ID!, $quantity: Int!) {
    result: addItemToOrder(productVariantId: $variantId, quantity: $quantity) {
      ${ORDER_OR_SHORTFALL}
    }
  }
`);

export const ADJUST_LINE = withFragments(/* GraphQL */ `
  mutation AdjustLine($lineId: ID!, $quantity: Int!) {
    result: adjustOrderLine(orderLineId: $lineId, quantity: $quantity) {
      ${ORDER_OR_SHORTFALL}
    }
  }
`);

export const REMOVE_LINE = withFragments(/* GraphQL */ `
  mutation RemoveLine($lineId: ID!) {
    result: removeOrderLine(orderLineId: $lineId) {
      ${ORDER_OR_REFUSAL}
    }
  }
`);

export const SET_CUSTOMER = withFragments(/* GraphQL */ `
  mutation SetCustomer($input: CreateCustomerInput!) {
    result: setCustomerForOrder(input: $input) {
      ${ORDER_OR_REFUSAL}
    }
  }
`);

export const SET_SHIPPING_ADDRESS = withFragments(/* GraphQL */ `
  mutation SetShippingAddress($input: CreateAddressInput!) {
    result: setOrderShippingAddress(input: $input) {
      ${ORDER_OR_REFUSAL}
    }
  }
`);

export const SET_ORDER_FIELDS = withFragments(/* GraphQL */ `
  mutation SetOrderFields($input: UpdateOrderInput!) {
    result: setOrderCustomFields(input: $input) {
      ${ORDER_OR_REFUSAL}
    }
  }
`);

export const ELIGIBLE_SHIPPING = /* GraphQL */ `
  query EligibleShipping {
    eligibleShippingMethods {
      id
      code
    }
  }
`;

export const SET_SHIPPING_METHOD = withFragments(/* GraphQL */ `
  mutation SetShippingMethod($ids: [ID!]!) {
    result: setOrderShippingMethod(shippingMethodId: $ids) {
      ${ORDER_OR_REFUSAL}
    }
  }
`);

export const TRANSITION = withFragments(/* GraphQL */ `
  mutation Transition($state: String!) {
    result: transitionOrderToState(state: $state) {
      ${ORDER_OR_REFUSAL}
    }
  }
`);

export const ADD_PAYMENT = withFragments(/* GraphQL */ `
  mutation AddPayment($input: PaymentInput!) {
    result: addPaymentToOrder(input: $input) {
      ${ORDER_OR_REFUSAL}
    }
  }
`);

export const AUTHENTICATE = /* GraphQL */ `
  mutation Authenticate($token: String!) {
    authenticate(input: { deckle: { token: $token } }) {
      __typename
      ... on CurrentUser {
        id
      }
      ... on ErrorResult {
        errorCode
        message
      }
    }
  }
`;

export const LOG_OUT = /* GraphQL */ `
  mutation LogOut {
    logout {
      success
    }
  }
`;

export const AVAILABLE_COUNTRIES = /* GraphQL */ `
  query AvailableCountries {
    availableCountries {
      code
      name
    }
  }
`;
