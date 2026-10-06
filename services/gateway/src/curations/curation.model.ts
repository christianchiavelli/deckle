import { Field, GraphQLISODateTime, ObjectType } from '@nestjs/graphql';

@ObjectType({ description: 'Works an editor grouped in the CMS, in the order they chose.' })
export class Curation {
  @Field(() => String)
  slug!: string;

  @Field(() => String)
  title!: string;

  @Field(() => String, {
    nullable: true,
    description: 'A few plain sentences that open the curation.',
  })
  intro!: string | null;

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;

  /** The works' slugs, which `artworks` resolves through commerce. Not part of the schema. */
  artworkSlugs!: string[];
}
