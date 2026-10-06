import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description: 'A group of works in the commerce catalogue, such as a department or a theme.',
})
export class Collection {
  @Field(() => ID)
  id!: string;

  @Field(() => String)
  slug!: string;

  @Field(() => String)
  name!: string;
}
