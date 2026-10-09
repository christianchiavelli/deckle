import type { MigrationInterface, QueryRunner } from 'typeorm';

export class ReceiptLanguage1791520250549 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" ADD "customFieldsReceiptlanguage" character varying(255)`,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN "customFieldsReceiptlanguage"`,
      undefined,
    );
  }
}
