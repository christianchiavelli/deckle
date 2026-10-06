import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: "An amount in the currency's minor unit: 5500 USD is $55.00." })
export class Money {
  @Field(() => Int, { description: 'Minor units, e.g. cents.' })
  amount!: number;

  @Field(() => String, { description: 'ISO 4217 code, e.g. USD.' })
  currencyCode!: string;
}
