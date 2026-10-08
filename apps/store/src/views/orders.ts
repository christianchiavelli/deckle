import type { Copy } from '../copy';
import type { AddressFragment, PlacedOrderViewFragment } from '../live/generated';
import { dateOf } from './time';

/** "Ana", from "Ana Souza": the order's thanks are to the first name given. */
export function firstNameOf(fullName: string | null | undefined): string | null {
  const [first] = (fullName ?? '').trim().split(/\s+/);
  return first === undefined || first === '' ? null : first;
}

/**
 * A country's name in the edition's language, from its code: "Brasil" for BR
 * in Portuguese. Commerce names each country in English only.
 */
export function countryNameOf(code: string, locale: string): string | null {
  try {
    return new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' }).of(code) ?? null;
  } catch {
    // Not shaped like a region code at all.
    return null;
  }
}

/** "Ana Souza, 1000 Fifth Avenue, New York 10028, United States", in the edition's `locale`. */
export function addressOf(
  address: Omit<AddressFragment, '__typename'> | null,
  locale: string,
): string | null {
  if (address === null) {
    return null;
  }
  const place = [address.city, address.postalCode].filter(Boolean).join(' ');
  const country =
    (address.countryCode === null ? null : countryNameOf(address.countryCode, locale)) ??
    address.country ??
    address.countryCode;
  const parts = [address.fullName, address.streetLine1, address.streetLine2, place, country].filter(
    (part): part is string => typeof part === 'string' && part !== '',
  );
  return parts.length === 0 ? null : parts.join(', ');
}

/** The head of an order's page: whom it thanks, and where its receipt went. */
export function placedOf(order: PlacedOrderViewFragment, copy: Copy) {
  return {
    title: copy.order.thanks(firstNameOf(order.shipTo?.fullName)),
    lede: copy.order.lede(order.code, order.email),
    paid: copy.order.paidOn(dateOf(order.placedAt, copy)),
    shipTo: addressOf(order.shipTo, copy.locale),
  };
}
