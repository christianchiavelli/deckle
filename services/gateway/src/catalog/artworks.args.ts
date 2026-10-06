import { ArgsType, Field, Int } from '@nestjs/graphql';
import { z } from 'zod';
import { DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from '../graphql/complexity.js';
import { decodeCursor } from './cursor.js';
import { ArtworkFilter } from './models/artwork-connection.model.js';

@ArgsType()
export class PageArgs {
  @Field(() => Int, {
    nullable: true,
    defaultValue: DEFAULT_PAGE_SIZE,
    description: `How many to return, from 1 to ${MAX_PAGE_SIZE}.`,
  })
  first?: number | null;

  @Field(() => String, { nullable: true, description: 'Read on after this cursor.' })
  after?: string | null;
}

@ArgsType()
export class ArtworksArgs extends PageArgs {
  @Field(() => ArtworkFilter, { nullable: true })
  filter?: ArtworkFilter | null;
}

const isCursor = (cursor: string) => {
  try {
    decodeCursor(cursor);
    return true;
  } catch {
    return false;
  }
};

const pageArgs = {
  first: z
    .int()
    .min(1, { error: 'first must be at least 1' })
    .max(MAX_PAGE_SIZE, { error: `first is at most ${MAX_PAGE_SIZE}` })
    .nullish(),
  after: z.string().refine(isCursor, { error: 'after is not a cursor this API issued' }).nullish(),
};

export const pageArgsSchema = z.object(pageArgs);

export const artworksArgsSchema = z.object({
  ...pageArgs,
  filter: z.object({ collection: z.string().nullish() }).nullish(),
});

/** Slugs are lowercase words joined by hyphens; anything else cannot name a work. */
export const slugSchema = z
  .string()
  .max(200)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { error: 'slug must be lowercase words joined by hyphens' });
