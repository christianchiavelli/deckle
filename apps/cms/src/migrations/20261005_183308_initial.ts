import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('admin', 'editor', 'gateway');
  CREATE TYPE "public"."enum_stories_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__stories_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_curations_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__curations_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_drop_pages_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum__drop_pages_v_version_status" AS ENUM('draft', 'published');
  CREATE TYPE "public"."enum_payload_jobs_log_task_slug" AS ENUM('inline', 'deliver-cms-event');
  CREATE TYPE "public"."enum_payload_jobs_log_state" AS ENUM('failed', 'succeeded');
  CREATE TYPE "public"."enum_payload_jobs_task_slug" AS ENUM('inline', 'deliver-cms-event');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"role" "enum_users_role" DEFAULT 'editor' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"enable_a_p_i_key" boolean,
  	"api_key" varchar,
  	"api_key_index" varchar,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"reset_password_requested_at" timestamp(3) with time zone,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "stories_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar
  );
  
  CREATE TABLE "stories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"artwork_slug" varchar,
  	"title" varchar,
  	"lede" varchar,
  	"body" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_stories_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_stories_v_version_sources" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar,
  	"url" varchar,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_stories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_artwork_slug" varchar,
  	"version_title" varchar,
  	"version_lede" varchar,
  	"version_body" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__stories_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean,
  	"autosave" boolean
  );
  
  CREATE TABLE "curations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"slug" varchar,
  	"intro" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_curations_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "curations_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "_curations_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar,
  	"version_slug" varchar,
  	"version_intro" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__curations_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "_curations_v_texts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer NOT NULL,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"text" varchar
  );
  
  CREATE TABLE "drop_pages" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slug" varchar,
  	"artwork_slug" varchar,
  	"headline" varchar,
  	"body" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"_status" "enum_drop_pages_status" DEFAULT 'draft'
  );
  
  CREATE TABLE "_drop_pages_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_slug" varchar,
  	"version_artwork_slug" varchar,
  	"version_headline" varchar,
  	"version_body" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version__status" "enum__drop_pages_v_version_status" DEFAULT 'draft',
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"latest" boolean
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_jobs_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"executed_at" timestamp(3) with time zone NOT NULL,
  	"completed_at" timestamp(3) with time zone NOT NULL,
  	"task_slug" "enum_payload_jobs_log_task_slug" NOT NULL,
  	"task_i_d" varchar NOT NULL,
  	"input" jsonb,
  	"output" jsonb,
  	"state" "enum_payload_jobs_log_state" NOT NULL,
  	"error" jsonb
  );
  
  CREATE TABLE "payload_jobs" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"input" jsonb,
  	"completed_at" timestamp(3) with time zone,
  	"total_tried" numeric DEFAULT 0,
  	"has_error" boolean DEFAULT false,
  	"error" jsonb,
  	"task_slug" "enum_payload_jobs_task_slug",
  	"queue" varchar DEFAULT 'default',
  	"wait_until" timestamp(3) with time zone,
  	"processing" boolean DEFAULT false,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"stories_id" integer,
  	"curations_id" integer,
  	"drop_pages_id" integer,
  	"media_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "stories_sources" ADD CONSTRAINT "stories_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v_version_sources" ADD CONSTRAINT "_stories_v_version_sources_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_stories_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_stories_v" ADD CONSTRAINT "_stories_v_parent_id_stories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."stories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "curations_texts" ADD CONSTRAINT "curations_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."curations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_curations_v" ADD CONSTRAINT "_curations_v_parent_id_curations_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."curations"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_curations_v_texts" ADD CONSTRAINT "_curations_v_texts_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_curations_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_drop_pages_v" ADD CONSTRAINT "_drop_pages_v_parent_id_drop_pages_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."drop_pages"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_jobs_log" ADD CONSTRAINT "payload_jobs_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."payload_jobs"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_stories_fk" FOREIGN KEY ("stories_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_curations_fk" FOREIGN KEY ("curations_id") REFERENCES "public"."curations"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_drop_pages_fk" FOREIGN KEY ("drop_pages_id") REFERENCES "public"."drop_pages"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "stories_sources_order_idx" ON "stories_sources" USING btree ("_order");
  CREATE INDEX "stories_sources_parent_id_idx" ON "stories_sources" USING btree ("_parent_id");
  CREATE UNIQUE INDEX "stories_artwork_slug_idx" ON "stories" USING btree ("artwork_slug");
  CREATE INDEX "stories_updated_at_idx" ON "stories" USING btree ("updated_at");
  CREATE INDEX "stories_created_at_idx" ON "stories" USING btree ("created_at");
  CREATE INDEX "stories__status_idx" ON "stories" USING btree ("_status");
  CREATE INDEX "_stories_v_version_sources_order_idx" ON "_stories_v_version_sources" USING btree ("_order");
  CREATE INDEX "_stories_v_version_sources_parent_id_idx" ON "_stories_v_version_sources" USING btree ("_parent_id");
  CREATE INDEX "_stories_v_parent_idx" ON "_stories_v" USING btree ("parent_id");
  CREATE INDEX "_stories_v_version_version_artwork_slug_idx" ON "_stories_v" USING btree ("version_artwork_slug");
  CREATE INDEX "_stories_v_version_version_updated_at_idx" ON "_stories_v" USING btree ("version_updated_at");
  CREATE INDEX "_stories_v_version_version_created_at_idx" ON "_stories_v" USING btree ("version_created_at");
  CREATE INDEX "_stories_v_version_version__status_idx" ON "_stories_v" USING btree ("version__status");
  CREATE INDEX "_stories_v_created_at_idx" ON "_stories_v" USING btree ("created_at");
  CREATE INDEX "_stories_v_updated_at_idx" ON "_stories_v" USING btree ("updated_at");
  CREATE INDEX "_stories_v_latest_idx" ON "_stories_v" USING btree ("latest");
  CREATE INDEX "_stories_v_autosave_idx" ON "_stories_v" USING btree ("autosave");
  CREATE UNIQUE INDEX "curations_slug_idx" ON "curations" USING btree ("slug");
  CREATE INDEX "curations_updated_at_idx" ON "curations" USING btree ("updated_at");
  CREATE INDEX "curations_created_at_idx" ON "curations" USING btree ("created_at");
  CREATE INDEX "curations__status_idx" ON "curations" USING btree ("_status");
  CREATE INDEX "curations_texts_order_parent" ON "curations_texts" USING btree ("order","parent_id");
  CREATE INDEX "_curations_v_parent_idx" ON "_curations_v" USING btree ("parent_id");
  CREATE INDEX "_curations_v_version_version_slug_idx" ON "_curations_v" USING btree ("version_slug");
  CREATE INDEX "_curations_v_version_version_updated_at_idx" ON "_curations_v" USING btree ("version_updated_at");
  CREATE INDEX "_curations_v_version_version_created_at_idx" ON "_curations_v" USING btree ("version_created_at");
  CREATE INDEX "_curations_v_version_version__status_idx" ON "_curations_v" USING btree ("version__status");
  CREATE INDEX "_curations_v_created_at_idx" ON "_curations_v" USING btree ("created_at");
  CREATE INDEX "_curations_v_updated_at_idx" ON "_curations_v" USING btree ("updated_at");
  CREATE INDEX "_curations_v_latest_idx" ON "_curations_v" USING btree ("latest");
  CREATE INDEX "_curations_v_texts_order_parent" ON "_curations_v_texts" USING btree ("order","parent_id");
  CREATE UNIQUE INDEX "drop_pages_slug_idx" ON "drop_pages" USING btree ("slug");
  CREATE INDEX "drop_pages_artwork_slug_idx" ON "drop_pages" USING btree ("artwork_slug");
  CREATE INDEX "drop_pages_updated_at_idx" ON "drop_pages" USING btree ("updated_at");
  CREATE INDEX "drop_pages_created_at_idx" ON "drop_pages" USING btree ("created_at");
  CREATE INDEX "drop_pages__status_idx" ON "drop_pages" USING btree ("_status");
  CREATE INDEX "_drop_pages_v_parent_idx" ON "_drop_pages_v" USING btree ("parent_id");
  CREATE INDEX "_drop_pages_v_version_version_slug_idx" ON "_drop_pages_v" USING btree ("version_slug");
  CREATE INDEX "_drop_pages_v_version_version_artwork_slug_idx" ON "_drop_pages_v" USING btree ("version_artwork_slug");
  CREATE INDEX "_drop_pages_v_version_version_updated_at_idx" ON "_drop_pages_v" USING btree ("version_updated_at");
  CREATE INDEX "_drop_pages_v_version_version_created_at_idx" ON "_drop_pages_v" USING btree ("version_created_at");
  CREATE INDEX "_drop_pages_v_version_version__status_idx" ON "_drop_pages_v" USING btree ("version__status");
  CREATE INDEX "_drop_pages_v_created_at_idx" ON "_drop_pages_v" USING btree ("created_at");
  CREATE INDEX "_drop_pages_v_updated_at_idx" ON "_drop_pages_v" USING btree ("updated_at");
  CREATE INDEX "_drop_pages_v_latest_idx" ON "_drop_pages_v" USING btree ("latest");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_jobs_log_order_idx" ON "payload_jobs_log" USING btree ("_order");
  CREATE INDEX "payload_jobs_log_parent_id_idx" ON "payload_jobs_log" USING btree ("_parent_id");
  CREATE INDEX "payload_jobs_completed_at_idx" ON "payload_jobs" USING btree ("completed_at");
  CREATE INDEX "payload_jobs_total_tried_idx" ON "payload_jobs" USING btree ("total_tried");
  CREATE INDEX "payload_jobs_has_error_idx" ON "payload_jobs" USING btree ("has_error");
  CREATE INDEX "payload_jobs_task_slug_idx" ON "payload_jobs" USING btree ("task_slug");
  CREATE INDEX "payload_jobs_queue_idx" ON "payload_jobs" USING btree ("queue");
  CREATE INDEX "payload_jobs_wait_until_idx" ON "payload_jobs" USING btree ("wait_until");
  CREATE INDEX "payload_jobs_processing_idx" ON "payload_jobs" USING btree ("processing");
  CREATE INDEX "payload_jobs_updated_at_idx" ON "payload_jobs" USING btree ("updated_at");
  CREATE INDEX "payload_jobs_created_at_idx" ON "payload_jobs" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_stories_id_idx" ON "payload_locked_documents_rels" USING btree ("stories_id");
  CREATE INDEX "payload_locked_documents_rels_curations_id_idx" ON "payload_locked_documents_rels" USING btree ("curations_id");
  CREATE INDEX "payload_locked_documents_rels_drop_pages_id_idx" ON "payload_locked_documents_rels" USING btree ("drop_pages_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "stories_sources" CASCADE;
  DROP TABLE "stories" CASCADE;
  DROP TABLE "_stories_v_version_sources" CASCADE;
  DROP TABLE "_stories_v" CASCADE;
  DROP TABLE "curations" CASCADE;
  DROP TABLE "curations_texts" CASCADE;
  DROP TABLE "_curations_v" CASCADE;
  DROP TABLE "_curations_v_texts" CASCADE;
  DROP TABLE "drop_pages" CASCADE;
  DROP TABLE "_drop_pages_v" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_jobs_log" CASCADE;
  DROP TABLE "payload_jobs" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_stories_status";
  DROP TYPE "public"."enum__stories_v_version_status";
  DROP TYPE "public"."enum_curations_status";
  DROP TYPE "public"."enum__curations_v_version_status";
  DROP TYPE "public"."enum_drop_pages_status";
  DROP TYPE "public"."enum__drop_pages_v_version_status";
  DROP TYPE "public"."enum_payload_jobs_log_task_slug";
  DROP TYPE "public"."enum_payload_jobs_log_state";
  DROP TYPE "public"."enum_payload_jobs_task_slug";`)
}
