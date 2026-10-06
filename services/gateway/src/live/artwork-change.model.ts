import { Field, GraphQLISODateTime, ObjectType, registerEnumType } from '@nestjs/graphql';

export const ArtworkChangeKind = {
  PRODUCT: 'PRODUCT',
  VARIANT: 'VARIANT',
  PRICE: 'PRICE',
  STOCK: 'STOCK',
} as const;
export type ArtworkChangeKind = keyof typeof ArtworkChangeKind;

registerEnumType(ArtworkChangeKind, {
  name: 'ArtworkChangeKind',
  description: 'What changed in commerce: the work, one of its sizes, a price, or stock.',
});

export const ChangeAction = { CREATED: 'CREATED', UPDATED: 'UPDATED', DELETED: 'DELETED' } as const;
export type ChangeAction = keyof typeof ChangeAction;

registerEnumType(ChangeAction, { name: 'ChangeAction' });

@ObjectType({
  description: 'Commerce changed something about an artwork; read it again to see what.',
})
export class ArtworkChange {
  @Field(() => String)
  slug!: string;

  @Field(() => ArtworkChangeKind)
  kind!: ArtworkChangeKind;

  @Field(() => ChangeAction)
  action!: ChangeAction;

  @Field(() => GraphQLISODateTime, { description: 'When commerce made the change.' })
  occurredAt!: Date;
}
