import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories" ADD COLUMN "detail_x" numeric;
  ALTER TABLE "stories" ADD COLUMN "detail_y" numeric;
  ALTER TABLE "stories" ADD COLUMN "detail_zoom" numeric;
  ALTER TABLE "_stories_v" ADD COLUMN "version_detail_x" numeric;
  ALTER TABLE "_stories_v" ADD COLUMN "version_detail_y" numeric;
  ALTER TABLE "_stories_v" ADD COLUMN "version_detail_zoom" numeric;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories" DROP COLUMN "detail_x";
  ALTER TABLE "stories" DROP COLUMN "detail_y";
  ALTER TABLE "stories" DROP COLUMN "detail_zoom";
  ALTER TABLE "_stories_v" DROP COLUMN "version_detail_x";
  ALTER TABLE "_stories_v" DROP COLUMN "version_detail_y";
  ALTER TABLE "_stories_v" DROP COLUMN "version_detail_zoom";`)
}
