import { describe, expect, it } from 'vitest';
import { tidyMigration } from './migration-template.js';

describe('tidyMigration', () => {
  it("makes TypeORM's template import types only and return void, and leaves the SQL alone", () => {
    const generated = [
      'import { MigrationInterface, QueryRunner } from "typeorm";',
      '',
      'export class AddPaperStock1791300000000 implements MigrationInterface {',
      '  public async up(queryRunner: QueryRunner): Promise<any> {',
      '    await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsStock" text`, undefined);',
      '  }',
      '  public async down(queryRunner: QueryRunner): Promise<any> {}',
      '}',
    ].join('\n');
    expect(tidyMigration(generated)).toBe(
      [
        "import type { MigrationInterface, QueryRunner } from 'typeorm';",
        '',
        'export class AddPaperStock1791300000000 implements MigrationInterface {',
        '  public async up(queryRunner: QueryRunner): Promise<void> {',
        '    await queryRunner.query(`ALTER TABLE "product" ADD "customFieldsStock" text`, undefined);',
        '  }',
        '  public async down(queryRunner: QueryRunner): Promise<void> {}',
        '}',
      ].join('\n'),
    );
  });
});
