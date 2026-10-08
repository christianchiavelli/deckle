'use client';

import { Assurances, Note, Price, PriceRule, SizeOptions, TextLink } from '@deckle/ui';
import { type ReactNode, useState } from 'react';
import { copy } from '../copy';
import type { PaperOptionFragment } from '../gateway/generated';
import { AddToCart, type AddToCartProps } from '../live/add-to-cart';
import { moneyOf } from '../views/cart';
import { printedAt } from '../views/work';

export interface BuyOptionsProps {
  sizes: readonly PaperOptionFragment[];
  /** The size chosen when the page opens: A3 when it is sold. */
  initial: PaperOptionFragment['size'];
  /** Why the next size up is not printed, when the scan is what stops it. */
  note: string | null;
  /** The work as the cart's sheet shows it once added. */
  artwork: AddToCartProps['artwork'];
  /** The pointer to the work's numbered edition, when a drop prints it. */
  edition?: ReactNode;
}

const { work } = copy;

/**
 * The price, the sizes, "Add to cart" and what is true of the chosen one. The
 * price follows the size picked; the radios still work as a form field
 * before any script.
 */
export function BuyOptions({ sizes, initial, note, artwork, edition }: BuyOptionsProps) {
  const [chosen, setChosen] = useState<PaperOptionFragment['size']>(initial);
  const option = sizes.find((size) => size.size === chosen);
  const currency = sizes.find((size) => size.price !== null)?.price?.currencyCode ?? 'USD';

  return (
    <>
      <PriceRule>
        <Price
          amount={option?.price?.amount ?? null}
          currency={currency}
          locale={copy.locale}
          missing={work.missingPrice}
        >
          {work.unframed(chosen)}
        </Price>
      </PriceRule>
      <SizeOptions
        name="size"
        legend={work.size}
        options={sizes.map((size) => ({
          size: size.size,
          paper: size.paper,
          ppi: size.ppi,
          available: size.available,
          price: size.price?.amount ?? null,
        }))}
        value={chosen}
        onValueChange={(value) => {
          const next = sizes.find((size) => size.size === value);
          if (next) {
            setChosen(next.size);
          }
        }}
        currency={currency}
        locale={copy.locale}
        unavailable={work.unavailable}
        missingPrice={work.missingPrice}
        help={<TextLink href="/about/sizes">{copy.chrome.howWeSize}</TextLink>}
        note={note === null ? undefined : <Note>{note}</Note>}
      />
      {option?.available && (
        <AddToCart
          artwork={artwork}
          size={option.size}
          detail={copy.added.detail(option.size, moneyOf(option.price, copy))}
        />
      )}
      {edition}
      <Assurances
        items={[
          ...(option ? [{ icon: 'ppi' as const, text: printedAt(option, copy) }] : []),
          { icon: 'tube', text: work.paper },
          { icon: 'open', text: work.openAccess },
        ]}
      />
    </>
  );
}
