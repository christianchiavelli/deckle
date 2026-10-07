import { Field, GraphQLISODateTime, ID, ObjectType } from '@nestjs/graphql';

@ObjectType({
  description:
    'The account signed in on this browser: a passkey and nothing else, no name, no password.',
})
export class Viewer {
  @Field(() => ID)
  id!: string;

  @Field(() => GraphQLISODateTime, {
    description: 'When the account and its first passkey were made.',
  })
  since!: Date;
}
