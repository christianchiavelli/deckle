import * as migration_20261005_183308_initial from './20261005_183308_initial';
import * as migration_20261007_023206_story_detail from './20261007_023206_story_detail';
import * as migration_20261008_060500_localized_content from './20261008_060500_localized_content';

export const migrations = [
  {
    up: migration_20261005_183308_initial.up,
    down: migration_20261005_183308_initial.down,
    name: '20261005_183308_initial',
  },
  {
    up: migration_20261007_023206_story_detail.up,
    down: migration_20261007_023206_story_detail.down,
    name: '20261007_023206_story_detail',
  },
  {
    up: migration_20261008_060500_localized_content.up,
    down: migration_20261008_060500_localized_content.down,
    name: '20261008_060500_localized_content'
  },
];
