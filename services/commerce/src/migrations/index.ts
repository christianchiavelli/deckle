import type { MigrationInterface } from 'typeorm';
import { InitialSchema1791226592452 } from './1791226592452-initial-schema.js';
import { NumberedEditions1791387987437 } from './1791387987437-numbered-editions.js';

/**
 * Every migration, oldest first. Listed rather than globbed so a build that misses a
 * file fails to compile instead of migrating nothing; `migrations.spec.ts` checks the
 * list against the directory.
 */
export const migrations: (new () => MigrationInterface)[] = [
  InitialSchema1791226592452,
  NumberedEditions1791387987437,
];
