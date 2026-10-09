import {
  createUnionType,
  Field,
  Float,
  GraphQLISODateTime,
  Int,
  ObjectType,
} from '@nestjs/graphql';
import type { StoryBlockRecord } from '../cms/lexical/lexical-to-blocks.js';
import { listOf } from '../graphql/complexity.js';

@ObjectType({ description: 'A stretch of text with one formatting.' })
export class TextRun {
  @Field(() => String)
  text!: string;

  @Field(() => Boolean)
  bold!: boolean;

  @Field(() => Boolean)
  italic!: boolean;

  @Field(() => String, {
    nullable: true,
    description: 'Where the run links to; null when it is not a link.',
  })
  href!: string | null;
}

const runs = { complexity: listOf(6) };

@ObjectType()
export class ParagraphBlock {
  @Field(() => [TextRun], runs)
  text!: TextRun[];
}

@ObjectType()
export class HeadingBlock {
  @Field(() => Int, { description: '2 or 3: the levels under the story title.' })
  level!: number;

  @Field(() => [TextRun], runs)
  text!: TextRun[];
}

@ObjectType()
export class QuoteBlock {
  @Field(() => [TextRun], runs)
  text!: TextRun[];
}

export const StoryBlock = createUnionType({
  name: 'StoryBlock',
  description: 'One block of a story, in reading order.',
  types: () => [ParagraphBlock, HeadingBlock, QuoteBlock] as const,
  resolveType(block: StoryBlockRecord) {
    switch (block.kind) {
      case 'paragraph':
        return ParagraphBlock;
      case 'heading':
        return HeadingBlock;
      case 'quote':
        return QuoteBlock;
    }
  },
});

@ObjectType({ description: 'Where the story got a fact.' })
export class Source {
  @Field(() => String, { description: 'How the story names the source, such as a book or a page.' })
  label!: string;

  @Field(() => String, { nullable: true })
  url!: string | null;
}

@ObjectType({
  description:
    "A point of the print and how close to look at it: on the story's card, and beside the story on the work's page.",
})
export class StoryDetail {
  @Field(() => Float, { description: "Across, in percent of the print's width." })
  x!: number;

  @Field(() => Float, { description: "Down, in percent of the print's height." })
  y!: number;

  @Field(() => Float, {
    description: '1 fills the frame with the whole print; 3 is three times closer.',
  })
  zoom!: number;

  @Field(() => String, {
    nullable: true,
    description:
      'The detail in a sentence, for whoever cannot see it. Null until an editor writes it, and the work’s page shows no detail without it.',
  })
  alt!: string | null;

  @Field(() => String, {
    nullable: true,
    description: 'The line under the detail beside the story; null until an editor writes it.',
  })
  caption!: string | null;
}

@ObjectType({ description: 'What the CMS tells about a work.' })
export class Story {
  @Field(() => String)
  title!: string;

  @Field(() => String, { nullable: true })
  lede!: string | null;

  @Field(() => StoryDetail, {
    nullable: true,
    description:
      'Null when the editor chose none: the card then shows the whole print, and the story stands alone.',
  })
  detail!: StoryDetail | null;

  @Field(() => [StoryBlock], { complexity: listOf(20) })
  blocks!: StoryBlockRecord[];

  @Field(() => [Source], { complexity: listOf(5) })
  sources!: Source[];

  @Field(() => GraphQLISODateTime)
  updatedAt!: Date;
}
