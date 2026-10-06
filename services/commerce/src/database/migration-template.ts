/**
 * Brings TypeORM's template in line with the repository's rules: a type-only import
 * and no `any`. The SQL itself is left exactly as generated.
 */
export function tidyMigration(source: string): string {
  return source
    .replace(
      /^import \{\s*MigrationInterface,\s*QueryRunner\s*\} from "typeorm";/m,
      "import type { MigrationInterface, QueryRunner } from 'typeorm';",
    )
    .replaceAll('Promise<any>', 'Promise<void>');
}
