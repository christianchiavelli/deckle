import { describe, expect, it } from 'vitest';
import { en as copy } from '../copy/en';
import { placedOrder } from '../test/drops';
import { addressOf, countryNameOf, firstNameOf, placedOf } from './orders';

describe('firstNameOf', () => {
  it('thanks the first name given, or nobody by name', () => {
    expect(firstNameOf('Ana Souza')).toBe('Ana');
    expect(firstNameOf('  Hokusai ')).toBe('Hokusai');
    expect(firstNameOf('   ')).toBeNull();
    expect(firstNameOf(null)).toBeNull();
    expect(firstNameOf(undefined)).toBeNull();
  });
});

describe('countryNameOf', () => {
  it("names a country by its code, in the edition's language", () => {
    expect(countryNameOf('BR', 'pt-BR')).toBe('Brasil');
    expect(countryNameOf('BR', 'en-US')).toBe('Brazil');
  });

  it('names nothing for a code no country has, or one that is no code at all', () => {
    expect(countryNameOf('XX', 'en-US')).toBeNull();
    expect(countryNameOf('U', 'en-US')).toBeNull();
  });
});

describe('addressOf', () => {
  it("writes the address on one line, with the country in the edition's words", () => {
    expect(addressOf(placedOrder.shipTo, 'en-US')).toBe(
      'Ana Souza, 1000 Fifth Avenue, New York 10028, United States',
    );
    expect(addressOf(placedOrder.shipTo, 'pt-BR')).toBe(
      'Ana Souza, 1000 Fifth Avenue, New York 10028, Estados Unidos',
    );
  });

  it("keeps the second line when there is one, and commerce's name or the code where Intl has none", () => {
    const address = {
      fullName: 'Ana Souza',
      streetLine1: '1000 Fifth Avenue',
      streetLine2: 'Apt 4',
      city: null,
      postalCode: '10028',
      countryCode: 'XX',
      country: null,
    };
    expect(addressOf(address, 'en-US')).toBe('Ana Souza, 1000 Fifth Avenue, Apt 4, 10028, XX');
    expect(addressOf({ ...address, country: 'Nowhere' }, 'en-US')).toBe(
      'Ana Souza, 1000 Fifth Avenue, Apt 4, 10028, Nowhere',
    );
  });

  it('says nothing for an address that is missing or empty', () => {
    expect(addressOf(null, 'en-US')).toBeNull();
    expect(
      addressOf(
        {
          fullName: null,
          streetLine1: null,
          streetLine2: null,
          city: null,
          postalCode: null,
          countryCode: null,
          country: null,
        },
        'en-US',
      ),
    ).toBeNull();
  });
});

describe('placedOf', () => {
  it('thanks the buyer, names the order and where its receipt went, and when it was paid', () => {
    expect(placedOf(placedOrder, copy)).toEqual({
      title: 'Thank you, Ana',
      lede: 'Order DCK7X2Q is placed, and its receipt is on its way to ana@example.com.',
      paid: 'Test payment, settled on 7 Oct 2026',
      shipTo: 'Ana Souza, 1000 Fifth Avenue, New York 10028, United States',
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
