import type { PaperSize } from '@deckle/print-sizes';
import { Field, Float, ID, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { Money } from './money.model.js';

export const PaperSizeEnum = {
  A4: 'A4',
  A3: 'A3',
  A2: 'A2',
  A1: 'A1',
} as const satisfies Record<PaperSize, PaperSize>;

registerEnumType(PaperSizeEnum, {
  name: 'PaperSize',
  description: 'ISO A paper sizes the shop prints on.',
});

export const UnavailableReason = {
  RESOLUTION_TOO_LOW: 'RESOLUTION_TOO_LOW',
  NOT_OFFERED: 'NOT_OFFERED',
} as const;

export type UnavailableReason = keyof typeof UnavailableReason;

registerEnumType(UnavailableReason, {
  name: 'PrintSizeUnavailableReason',
  description: 'Why a size is not for sale.',
  valuesMap: {
    RESOLUTION_TOO_LOW: {
      description: 'The scan has too few pixels to print this sheet at the minimum resolution.',
    },
    NOT_OFFERED: { description: 'The scan could print it, but commerce does not sell it.' },
  },
});

@ObjectType({ description: 'A width and a height, in centimetres.' })
export class Centimetres {
  @Field(() => Float)
  width!: number;

  @Field(() => Float)
  height!: number;
}

@ObjectType({
  description:
    'One paper size for an artwork. Every size is listed, sold or not, so the store can say why one is missing.',
})
export class PrintSize {
  @Field(() => PaperSizeEnum)
  size!: PaperSize;

  @Field(() => Centimetres, { description: "The sheet, turned to the image's orientation." })
  paper!: Centimetres;

  @Field(() => Centimetres, { description: 'The printed image inside its white border.' })
  image!: Centimetres;

  @Field(() => Int, { description: 'Pixels per inch the scan gives at this size, rounded down.' })
  ppi!: number;

  @Field(() => Boolean, { description: 'Whether this size can be bought.' })
  available!: boolean;

  @Field(() => UnavailableReason, { nullable: true, description: 'Null when available.' })
  unavailableReason!: UnavailableReason | null;

  @Field(() => Int, {
    nullable: true,
    description:
      'Pixels the scan would need along its limiting side to reach the minimum resolution; null when it has them.',
  })
  requiredPixels!: number | null;

  @Field(() => ID, { nullable: true, description: 'The commerce variant to add to a cart.' })
  variantId!: string | null;

  @Field(() => String, { nullable: true })
  sku!: string | null;

  @Field(() => Money, { nullable: true, description: 'Taxes included.' })
  price!: Money | null;
}
