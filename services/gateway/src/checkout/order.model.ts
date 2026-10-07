import type { PaperSize } from '@deckle/print-sizes';
import { Field, GraphQLISODateTime, ID, Int, ObjectType } from '@nestjs/graphql';
import { listOf } from '../graphql/complexity.js';
import { Money } from '../catalog/models/money.model.js';
import { PaperSizeEnum } from '../catalog/models/print-size.model.js';

/** A cart rarely holds more than a few lines; the complexity estimate assumes ten. */
const LINES = 10;

@ObjectType({ description: 'One line of a cart or an order: a work at one size, so many times.' })
export class OrderLine {
  @Field(() => ID)
  id!: string;

  @Field(() => String, { description: "The work's slug; its `artwork` is resolved from it." })
  artworkSlug!: string;

  @Field(() => String, {
    nullable: true,
    description: "The drop's slug when the line is a numbered copy; null for an open edition.",
  })
  drop!: string | null;

  @Field(() => PaperSizeEnum, { nullable: true })
  size!: PaperSize | null;

  @Field(() => Int)
  quantity!: number;

  @Field(() => Money, { description: 'One print, taxes included.' })
  unitPrice!: Money;

  @Field(() => Money, { description: 'The line, taxes included.' })
  price!: Money;

  @Field(() => Int, {
    nullable: true,
    description: 'The number pencilled on a numbered copy; null for an open edition.',
  })
  copyNumber!: number | null;

  @Field(() => Int, {
    nullable: true,
    description: "How many copies the line's edition has; null for an open edition.",
  })
  editionSize!: number | null;
}

@ObjectType({
  description:
    "This browser's cart: open-edition prints, with the flat rate for shipping once there is something to ship.",
})
export class Cart {
  @Field(() => [OrderLine], { complexity: listOf(LINES) })
  lines!: OrderLine[];

  @Field(() => Int, { description: 'How many prints, every copy counted.' })
  quantity!: number;

  @Field(() => Money, { nullable: true, description: 'Null while the cart is empty.' })
  subtotal!: Money | null;

  @Field(() => Money, { nullable: true, description: 'Null while the cart is empty.' })
  shipping!: Money | null;

  @Field(() => Money, { nullable: true, description: 'Null while the cart is empty.' })
  total!: Money | null;
}

@ObjectType({ description: 'Where an order is going.' })
export class ShippingAddress {
  @Field(() => String, { nullable: true })
  fullName!: string | null;

  @Field(() => String, { nullable: true })
  streetLine1!: string | null;

  @Field(() => String, { nullable: true })
  streetLine2!: string | null;

  @Field(() => String, { nullable: true })
  city!: string | null;

  @Field(() => String, { nullable: true })
  postalCode!: string | null;

  @Field(() => String, { nullable: true, description: 'The country as commerce names it.' })
  country!: string | null;

  @Field(() => String, { nullable: true, description: 'ISO 3166-1 alpha-2.' })
  countryCode!: string | null;
}

@ObjectType({ description: 'An order once paid: what its confirmation shows.' })
export class PlacedOrder {
  @Field(() => String, { description: "Commerce's order code, quoted in the receipt." })
  code!: string;

  @Field(() => GraphQLISODateTime)
  placedAt!: Date;

  @Field(() => String, { nullable: true, description: 'Where the receipt went.' })
  email!: string | null;

  @Field(() => [OrderLine], { complexity: listOf(LINES) })
  lines!: OrderLine[];

  @Field(() => Money)
  subtotal!: Money;

  @Field(() => Money)
  shipping!: Money;

  @Field(() => Money)
  total!: Money;

  @Field(() => ShippingAddress, { nullable: true })
  shipTo!: ShippingAddress | null;
}

@ObjectType({ description: 'A country the shop ships to.' })
export class Country {
  @Field(() => String, { description: 'ISO 3166-1 alpha-2.' })
  code!: string;

  @Field(() => String)
  name!: string;
}
