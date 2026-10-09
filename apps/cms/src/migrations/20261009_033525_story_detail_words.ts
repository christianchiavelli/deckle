import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_locales" ADD COLUMN "detail_alt" varchar;
  ALTER TABLE "stories_locales" ADD COLUMN "detail_caption" varchar;
  ALTER TABLE "_stories_v_locales" ADD COLUMN "version_detail_alt" varchar;
  ALTER TABLE "_stories_v_locales" ADD COLUMN "version_detail_caption" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "stories_locales" DROP COLUMN "detail_alt";
  ALTER TABLE "stories_locales" DROP COLUMN "detail_caption";
  ALTER TABLE "_stories_v_locales" DROP COLUMN "version_detail_alt";
  ALTER TABLE "_stories_v_locales" DROP COLUMN "version_detail_caption";`)
}
