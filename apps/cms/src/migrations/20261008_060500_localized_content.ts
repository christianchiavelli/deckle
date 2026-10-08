import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."_locales" AS ENUM('en', 'pt');
  CREATE TYPE "public"."enum__stories_v_published_locale" AS ENUM('en', 'pt');
  CREATE TYPE "public"."enum__curations_v_published_locale" AS ENUM('en', 'pt');
  CREATE TYPE "public"."enum__drop_pages_v_published_locale" AS ENUM('en', 'pt');
  CREATE TABLE "stories_locales" (
  	"title" varchar,
  	"lede" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_stories_v_locales" (
  	"version_title" varchar,
  	"version_lede" varchar,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "curations_locales" (
  	"title" varchar,
  	"intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_curations_v_locales" (
  	"version_title" varchar,
  	"version_intro" varchar,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "drop_pages_locales" (
  	"headline" varchar,
  	"body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  CREATE TABLE "_drop_pages_v_locales" (
  	"version_headline" varchar,
  	"version_body" jsonb,
  	"id" serial PRIMARY KEY NOT NULL,
  	"_locale" "_locales" NOT NULL,
  	"_parent_id" integer NOT NULL
  );
  
  ALTER TABLE "_stories_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_stories_v" ADD COLUMN "published_locale" "enum__stories_v_published_locale";
  ALTER TABLE "_curations_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_curations_v" ADD COLUMN "published_locale" "enum__curations_v_published_locale";
  ALTER TABLE "_drop_pages_v" ADD COLUMN "snapshot" boolean;
  ALTER TABLE "_drop_pages_v" ADD COLUMN "published_locale" "enum__drop_pages_v_published_locale";
  ALTER TABLE "stories_locales" ADD CONSTRAINT "stories_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_locales" ADD CONSTRAINT "_stories_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "curations_locales" ADD CONSTRAINT "curations_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."curations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_curations_v_locales" ADD CONSTRAINT "_curations_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_curations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "drop_pages_locales" ADD CONSTRAINT "drop_pages_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."drop_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_drop_pages_v_locales" ADD CONSTRAINT "_drop_pages_v_locales_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_drop_pages_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "stories_locales_locale_parent_id_unique" ON "stories_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_stories_v_locales_locale_parent_id_unique" ON "_stories_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "curations_locales_locale_parent_id_unique" ON "curations_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_curations_v_locales_locale_parent_id_unique" ON "_curations_v_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "drop_pages_locales_locale_parent_id_unique" ON "drop_pages_locales" USING btree ("_locale","_parent_id");
  CREATE UNIQUE INDEX "_drop_pages_v_locales_locale_parent_id_unique" ON "_drop_pages_v_locales" USING btree ("_locale","_parent_id");
  CREATE INDEX "_stories_v_snapshot_idx" ON "_stories_v" USING btree ("snapshot");
  CREATE INDEX "_stories_v_published_locale_idx" ON "_stories_v" USING btree ("published_locale");
  CREATE INDEX "_curations_v_snapshot_idx" ON "_curations_v" USING btree ("snapshot");
  CREATE INDEX "_curations_v_published_locale_idx" ON "_curations_v" USING btree ("published_locale");
  CREATE INDEX "_drop_pages_v_snapshot_idx" ON "_drop_pages_v" USING btree ("snapshot");
  CREATE INDEX "_drop_pages_v_published_locale_idx" ON "_drop_pages_v" USING btree ("published_locale");
  -- Everything written before there were locales is English, the default locale.
  INSERT INTO "stories_locales" ("title", "lede", "body", "_locale", "_parent_id")
    SELECT "title", "lede", "body", 'en', "id" FROM "stories";
  INSERT INTO "_stories_v_locales" ("version_title", "version_lede", "version_body", "_locale", "_parent_id")
    SELECT "version_title", "version_lede", "version_body", 'en', "id" FROM "_stories_v";
  INSERT INTO "curations_locales" ("title", "intro", "_locale", "_parent_id")
    SELECT "title", "intro", 'en', "id" FROM "curations";
  INSERT INTO "_curations_v_locales" ("version_title", "version_intro", "_locale", "_parent_id")
    SELECT "version_title", "version_intro", 'en', "id" FROM "_curations_v";
  INSERT INTO "drop_pages_locales" ("headline", "body", "_locale", "_parent_id")
    SELECT "headline", "body", 'en', "id" FROM "drop_pages";
  INSERT INTO "_drop_pages_v_locales" ("version_headline", "version_body", "_locale", "_parent_id")
    SELECT "version_headline", "version_body", 'en', "id" FROM "_drop_pages_v";
  ALTER TABLE "stories" DROP COLUMN "title";
  ALTER TABLE "stories" DROP COLUMN "lede";
  ALTER TABLE "stories" DROP COLUMN "body";
  ALTER TABLE "_stories_v" DROP COLUMN "version_title";
  ALTER TABLE "_stories_v" DROP COLUMN "version_lede";
  ALTER TABLE "_stories_v" DROP COLUMN "version_body";
  ALTER TABLE "curations" DROP COLUMN "title";
  ALTER TABLE "curations" DROP COLUMN "intro";
  ALTER TABLE "_curations_v" DROP COLUMN "version_title";
  ALTER TABLE "_curations_v" DROP COLUMN "version_intro";
  ALTER TABLE "drop_pages" DROP COLUMN "headline";
  ALTER TABLE "drop_pages" DROP COLUMN "body";
  ALTER TABLE "_drop_pages_v" DROP COLUMN "version_headline";
  ALTER TABLE "_drop_pages_v" DROP COLUMN "version_body";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  // The columns come back first, with the English words in them, before the
  // locale tables go: the Portuguese ones have nowhere to go, and are lost.
  await db.execute(sql`
   ALTER TABLE "stories" ADD COLUMN "title" varchar;
  ALTER TABLE "stories" ADD COLUMN "lede" varchar;
  ALTER TABLE "stories" ADD COLUMN "body" jsonb;
  ALTER TABLE "_stories_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_stories_v" ADD COLUMN "version_lede" varchar;
  ALTER TABLE "_stories_v" ADD COLUMN "version_body" jsonb;
  ALTER TABLE "curations" ADD COLUMN "title" varchar;
  ALTER TABLE "curations" ADD COLUMN "intro" varchar;
  ALTER TABLE "_curations_v" ADD COLUMN "version_title" varchar;
  ALTER TABLE "_curations_v" ADD COLUMN "version_intro" varchar;
  ALTER TABLE "drop_pages" ADD COLUMN "headline" varchar;
  ALTER TABLE "drop_pages" ADD COLUMN "body" jsonb;
  ALTER TABLE "_drop_pages_v" ADD COLUMN "version_headline" varchar;
  ALTER TABLE "_drop_pages_v" ADD COLUMN "version_body" jsonb;
  UPDATE "stories" SET "title" = l."title", "lede" = l."lede", "body" = l."body"
    FROM "stories_locales" l WHERE l."_parent_id" = "stories"."id" AND l."_locale" = 'en';
  UPDATE "_stories_v" SET "version_title" = l."version_title", "version_lede" = l."version_lede", "version_body" = l."version_body"
    FROM "_stories_v_locales" l WHERE l."_parent_id" = "_stories_v"."id" AND l."_locale" = 'en';
  UPDATE "curations" SET "title" = l."title", "intro" = l."intro"
    FROM "curations_locales" l WHERE l."_parent_id" = "curations"."id" AND l."_locale" = 'en';
  UPDATE "_curations_v" SET "version_title" = l."version_title", "version_intro" = l."version_intro"
    FROM "_curations_v_locales" l WHERE l."_parent_id" = "_curations_v"."id" AND l."_locale" = 'en';
  UPDATE "drop_pages" SET "headline" = l."headline", "body" = l."body"
    FROM "drop_pages_locales" l WHERE l."_parent_id" = "drop_pages"."id" AND l."_locale" = 'en';
  UPDATE "_drop_pages_v" SET "version_headline" = l."version_headline", "version_body" = l."version_body"
    FROM "_drop_pages_v_locales" l WHERE l."_parent_id" = "_drop_pages_v"."id" AND l."_locale" = 'en';
  ALTER TABLE "stories_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_stories_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "curations_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_curations_v_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "drop_pages_locales" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_drop_pages_v_locales" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "stories_locales" CASCADE;
  DROP TABLE "_stories_v_locales" CASCADE;
  DROP TABLE "curations_locales" CASCADE;
  DROP TABLE "_curations_v_locales" CASCADE;
  DROP TABLE "drop_pages_locales" CASCADE;
  DROP TABLE "_drop_pages_v_locales" CASCADE;
  DROP INDEX "_stories_v_snapshot_idx";
  DROP INDEX "_stories_v_published_locale_idx";
  DROP INDEX "_curations_v_snapshot_idx";
  DROP INDEX "_curations_v_published_locale_idx";
  DROP INDEX "_drop_pages_v_snapshot_idx";
  DROP INDEX "_drop_pages_v_published_locale_idx";
  ALTER TABLE "_stories_v" DROP COLUMN "snapshot";
  ALTER TABLE "_stories_v" DROP COLUMN "published_locale";
  ALTER TABLE "_curations_v" DROP COLUMN "snapshot";
  ALTER TABLE "_curations_v" DROP COLUMN "published_locale";
  ALTER TABLE "_drop_pages_v" DROP COLUMN "snapshot";
  ALTER TABLE "_drop_pages_v" DROP COLUMN "published_locale";
  DROP TYPE "public"."_locales";
  DROP TYPE "public"."enum__stories_v_published_locale";
  DROP TYPE "public"."enum__curations_v_published_locale";
  DROP TYPE "public"."enum__drop_pages_v_published_locale";`)
}
