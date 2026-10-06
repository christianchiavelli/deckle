'use client';

import { Assurances, Note, Price, PriceRule, SizeOptions, TextLink } from '@deckle/ui';
import { useState } from 'react';
import { copy } from '../copy';
import type { PaperOptionFragment } from '../gateway/generated';
import { printedAt } from '../views/work';

export interface BuyOptionsProps {
  sizes: readonly PaperOptionFragment[];
  /** The size chosen when the page opens: A3 when it is sold. */
  initial: PaperOptionFragment['size'];
  /** Why the next size up is not printed, when the scan is what stops it. */
  note: string | null;
}

const { work } = copy;

/**
 * The price, the sizes and what is true of the chosen one. The price follows
 * the size picked; the radios still work as a form field before any script.
 */
export function BuyOptions({ sizes, initial, note }: BuyOptionsProps) {
  const [chosen, setChosen] = useState<string>(initial);
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
        onValueChange={setChosen}
        currency={currency}
        locale={copy.locale}
        unavailable={work.unavailable}
        missingPrice={work.missingPrice}
        help={<TextLink href="/about/sizes">{copy.chrome.howWeSize}</TextLink>}
        note={note === null ? undefined : <Note>{note}</Note>}
      />
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
