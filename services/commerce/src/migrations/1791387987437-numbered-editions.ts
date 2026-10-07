import type { MigrationInterface, QueryRunner } from 'typeorm';

export class NumberedEditions1791387987437 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "order" ADD "customFieldsCopynumber" integer`, undefined);
    await queryRunner.query(
      `ALTER TABLE "order" ADD "customFieldsReceiptemail" character varying(255)`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "product_variant" ADD "customFieldsEditionsize" integer`,
      undefined,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "product_variant" DROP COLUMN "customFieldsEditionsize"`,
      undefined,
    );
    await queryRunner.query(
      `ALTER TABLE "order" DROP COLUMN "customFieldsReceiptemail"`,
      undefined,
    );
    await queryRunner.query(`ALTER TABLE "order" DROP COLUMN "customFieldsCopynumber"`, undefined);
  }
}
