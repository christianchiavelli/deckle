import { Field, InputType, Int, ObjectType } from '@nestjs/graphql';
import { Artwork } from './artwork.model.js';

@ObjectType({ description: 'Where a page sits in the whole list (Relay cursor connections).' })
export class PageInfo {
  @Field(() => Boolean)
  hasNextPage!: boolean;

  @Field(() => Boolean)
  hasPreviousPage!: boolean;

  @Field(() => String, { nullable: true })
  startCursor!: string | null;

  @Field(() => String, { nullable: true })
  endCursor!: string | null;
}

@ObjectType()
export class ArtworkEdge {
  @Field(() => String, { description: 'Opaque; pass it as `after` to read on from here.' })
  cursor!: string;

  @Field(() => Artwork)
  node!: Artwork;
}

@ObjectType({ description: 'A page of artworks.' })
export class ArtworkConnection {
  @Field(() => [ArtworkEdge])
  edges!: ArtworkEdge[];

  @Field(() => PageInfo)
  pageInfo!: PageInfo;

  @Field(() => Int, { description: 'Artworks in the whole list, not just this page.' })
  totalCount!: number;
}

@InputType({ description: 'Narrows the artworks listed.' })
export class ArtworkFilter {
  @Field(() => String, { nullable: true, description: 'A collection slug.' })
  collection?: string | null;
}
