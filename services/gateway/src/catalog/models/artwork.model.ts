import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { listOf } from '../../graphql/complexity.js';
import { Money } from './money.model.js';
import { PrintSize } from './print-size.model.js';

@ObjectType({ description: 'Who made the work, as The Met records it.' })
export class Artist {
  @Field(() => String)
  name!: string;

  @Field(() => String, {
    nullable: true,
    description: 'As The Met words it, e.g. "German, Nuremberg 1471–1528 Nuremberg".',
  })
  bio!: string | null;

  @Field(() => String, { nullable: true })
  nationality!: string | null;

  @Field(() => Int, { nullable: true })
  beginYear!: number | null;

  @Field(() => Int, { nullable: true })
  endYear!: number | null;
}

@ObjectType({ description: 'The picture the shop shows, and the size of the scan it prints from.' })
export class ArtworkImage {
  @Field(() => String, { description: 'The full-size master, served through /assets.' })
  url!: string;

  @Field(() => Int)
  width!: number;

  @Field(() => Int)
  height!: number;

  @Field(() => Int, { description: "The original scan's width in pixels." })
  scanWidth!: number;

  @Field(() => Int, { description: "The original scan's height in pixels." })
  scanHeight!: number;
}

@ObjectType({ description: 'A work from The Met, sold as open-edition prints.' })
export class Artwork {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String, { description: 'The title as the shop shows it.' })
  title!: string;

  @Field(() => String, { description: "The Met's title, verbatim." })
  fullTitle!: string;

  @Field(() => Artist, { nullable: true, description: 'Null when the maker is unknown.' })
  artist!: Artist | null;

  @Field(() => String, { nullable: true, description: 'As The Met dates it, e.g. "ca. 1830–32".' })
  date!: string | null;

  @Field(() => Int, {
    nullable: true,
    description:
      'The year the work was begun, to order and group by; null when The Met gives none.',
  })
  year!: number | null;

  @Field(() => String, {
    nullable: true,
    description:
      'The family of process commerce files the work under, e.g. "Etchings"; null when none.',
  })
  technique!: string | null;

  @Field(() => String, { nullable: true })
  medium!: string | null;

  @Field(() => [String], {
    description: 'One line per measurement: plate, sheet and so on.',
    complexity: listOf(4),
  })
  dimensions!: string[];

  @Field(() => String, { nullable: true })
  classification!: string | null;

  @Field(() => String, { nullable: true })
  department!: string | null;

  @Field(() => String, { nullable: true })
  culture!: string | null;

  @Field(() => String, { nullable: true })
  period!: string | null;

  @Field(() => String, { nullable: true })
  creditLine!: string | null;

  @Field(() => String, { nullable: true })
  accessionNumber!: string | null;

  @Field(() => String, { description: "The work's page on metmuseum.org." })
  museumUrl!: string;

  @Field(() => ArtworkImage, { nullable: true })
  image!: ArtworkImage | null;

  @Field(() => [PrintSize], { complexity: listOf(4) })
  sizes!: PrintSize[];

  @Field(() => Money, {
    nullable: true,
    description: 'The cheapest size for sale; null when none is.',
  })
  priceFrom!: Money | null;
}
