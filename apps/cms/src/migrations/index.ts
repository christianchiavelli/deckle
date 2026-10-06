import * as migration_20261005_183308_initial from './20261005_183308_initial';

export const migrations = [
  {
    up: migration_20261005_183308_initial.up,
    down: migration_20261005_183308_initial.down,
    name: '20261005_183308_initial'
  },
];
