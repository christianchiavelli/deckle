import { Field, GraphQLISODateTime, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import type { StoryBlockRecord } from '../cms/lexical/lexical-to-blocks.js';
import { listOf } from '../graphql/complexity.js';
import { StoryBlock } from '../stories/story.model.js';
import type { CopyStatus } from './drop-store.js';

export const CopyState = { OPEN: 'OPEN', HELD: 'HELD', SOLD: 'SOLD' } as const;
export type CopyState = keyof typeof CopyState;

registerEnumType(CopyState, {
  name: 'CopyState',
  description: 'Where one numbered copy stands.',
  valuesMap: {
    OPEN: { description: 'The next claim may take it.' },
    HELD: { description: 'Held for someone for ten minutes while they pay.' },
    SOLD: { description: 'Paid for: it is printed, numbered and posted.' },
  },
});

export const copyStateOf = (status: CopyStatus): CopyState =>
  status === 'open' ? 'OPEN' : status === 'held' ? 'HELD' : 'SOLD';

/** An edition is fifty copies; the estimate allows for some more. */
const COPIES = 60;

@ObjectType({ description: "Where a drop's copies stand, by the database's clock." })
export class DropStock {
  @Field(() => Int)
  open!: number;

  @Field(() => Int)
  held!: number;

  @Field(() => Int)
  sold!: number;

  @Field(() => [CopyState], { description: 'Each copy, copy 1 first.', complexity: listOf(COPIES) })
  copies!: CopyState[];
}

@ObjectType({ description: 'A numbered copy that belongs to the signed-in account.' })
export class DropCopy {
  @Field(() => String, { description: "The drop's slug." })
  drop!: string;

  @Field(() => Int, { description: 'The number pencilled on it, out of the edition.' })
  number!: number;

  @Field(() => CopyState, { description: 'HELD while it waits for payment, SOLD once paid.' })
  state!: CopyState;

  @Field(() => GraphQLISODateTime, { nullable: true, description: 'When a hold runs out.' })
  heldUntil!: Date | null;

  @Field(() => Int, {
    nullable: true,
    description:
      "Whole seconds left on a hold, by the database's clock: count down from this, not from the browser's clock.",
  })
  secondsLeft!: number | null;

  @Field(() => String, { nullable: true, description: "Commerce's order, once paid." })
  orderCode!: string | null;
}

@ObjectType({ description: "The words on a drop's page, from the CMS." })
export class DropPage {
  @Field(() => String)
  headline!: string;

  @Field(() => [StoryBlock], { complexity: listOf(10) })
  blocks!: StoryBlockRecord[];
}

@ObjectType({
  description:
    'Fifty numbered copies of one print, released at a set hour: first come, first served, one per person.',
})
export class Drop {
  @Field(() => String)
  slug!: string;

  @Field(() => String, { description: "The work's slug; its `artwork` is resolved from it." })
  artworkSlug!: string;

  @Field(() => Int, { description: 'How many numbered copies there are.' })
  editionSize!: number;

  @Field(() => GraphQLISODateTime, { description: 'When the first claim may be made.' })
  opensAt!: Date;
}
