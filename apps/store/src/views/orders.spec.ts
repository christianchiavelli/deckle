import { describe, expect, it } from 'vitest';
import { copy } from '../copy';
import { placedOrder } from '../test/drops';
import { addressOf, firstNameOf, placedOf } from './orders';

describe('firstNameOf', () => {
  it('thanks the first name given, or nobody by name', () => {
    expect(firstNameOf('Ana Souza')).toBe('Ana');
    expect(firstNameOf('  Hokusai ')).toBe('Hokusai');
    expect(firstNameOf('   ')).toBeNull();
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf(undefined)).toBeNull();
  });
});

describe('addressOf', () => {
  it('writes the address on one line, with the country commerce names', () => {
    expect(addressOf(placedOrder.shipTo)).toBe(
      'Ana Souza, 1000 Fifth Avenue, New York 10028, United States of America',
    );
  });

  it('keeps the second line when there is one, and the country code without a name', () => {
    expect(
      addressOf({
        fullName: 'Ana Souza',
        streetLine1: '1000 Fifth Avenue',
        streetLine2: 'Apt 4',
        city: null,
        postalCode: '10028',
        countryCode: 'US',
        country: null,
      }),
    ).toBe('Ana Souza, 1000 Fifth Avenue, Apt 4, 10028, US');
  });

  it('says nothing for an address that is missing or empty', () => {
    expect(addressOf(null)).toBeNull();
    expect(
      addressOf({
        fullName: null,
        streetLine1: null,
        streetLine2: null,
        city: null,
        postalCode: null,
        countryCode: null,
        country: null,
      }),
    ).toBeNull();
  });
});

describe('placedOf', () => {
  it('thanks the buyer, names the order and where its receipt went, and when it was paid', () => {
    expect(placedOf(placedOrder, copy)).toEqual({
      title: 'Thank you, Ana',
      lede: 'Order DCK7X2Q is placed, and its receipt is on its way to ana@example.com.',
      paid: 'Test payment, settled on 7 Oct 2026',
      shipTo: 'Ana Souza, 1000 Fifth Avenue, New York 10028, United States of America',
    });
  });

  it('thanks nobody by name, and names no address, when the order has none', () => {
    expect(placedOf({ ...placedOrder, shipTo: null, email: null }, copy)).toMatchObject({
      title: 'Thank you',
      lede: 'Order DCK7X2Q is placed.',
      shipTo: null,
    });
  });
});
