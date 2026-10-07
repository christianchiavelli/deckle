CREATE TABLE "passkey_ceremonies" (
	"session_id" text PRIMARY KEY NOT NULL,
	"purpose" text NOT NULL,
	"challenge" text NOT NULL,
	"user_id" uuid,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "passkey_ceremonies_purpose_check" CHECK (("passkey_ceremonies"."purpose" = 'register' and "passkey_ceremonies"."user_id" is not null) or ("passkey_ceremonies"."purpose" = 'sign-in' and "passkey_ceremonies"."user_id" is null))
);
--> statement-breakpoint
CREATE TABLE "passkeys" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"public_key" text NOT NULL,
	"counter" bigint NOT NULL,
	"transports" text[] NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_used_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "drop_copies" (
	"drop_slug" text NOT NULL,
	"number" integer NOT NULL,
	"status" text NOT NULL,
	"holder_id" uuid,
	"held_until" timestamp with time zone,
	"order_code" text,
	"claimed_at" timestamp with time zone,
	"sold_at" timestamp with time zone,
	CONSTRAINT "drop_copies_drop_slug_number_pk" PRIMARY KEY("drop_slug","number"),
	CONSTRAINT "drop_copies_number_check" CHECK ("drop_copies"."number" > 0),
	CONSTRAINT "drop_copies_status_check" CHECK (("drop_copies"."status" = 'open' and "drop_copies"."holder_id" is null and "drop_copies"."held_until" is null and "drop_copies"."order_code" is null)
        or ("drop_copies"."status" = 'held' and "drop_copies"."holder_id" is not null and "drop_copies"."held_until" is not null and "drop_copies"."order_code" is null)
        or ("drop_copies"."status" = 'sold' and "drop_copies"."holder_id" is not null and "drop_copies"."held_until" is null and "drop_copies"."order_code" is not null))
);
--> statement-breakpoint
CREATE TABLE "drops" (
	"slug" text PRIMARY KEY NOT NULL,
	"artwork_slug" text NOT NULL,
	"edition_size" integer NOT NULL,
	"opens_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "drops_edition_size_check" CHECK ("drops"."edition_size" > 0)
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid,
	"cart_token" text,
	"customer_token" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "passkey_ceremonies" ADD CONSTRAINT "passkey_ceremonies_session_id_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "passkeys" ADD CONSTRAINT "passkeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_copies" ADD CONSTRAINT "drop_copies_drop_slug_drops_slug_fk" FOREIGN KEY ("drop_slug") REFERENCES "public"."drops"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "drop_copies" ADD CONSTRAINT "drop_copies_holder_id_users_id_fk" FOREIGN KEY ("holder_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "passkeys_user_id_idx" ON "passkeys" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "drop_copies_one_per_person_idx" ON "drop_copies" USING btree ("drop_slug","holder_id") WHERE "drop_copies"."holder_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "drop_copies_one_hold_per_person_idx" ON "drop_copies" USING btree ("holder_id") WHERE "drop_copies"."status" = 'held';--> statement-breakpoint
CREATE INDEX "drop_copies_open_idx" ON "drop_copies" USING btree ("drop_slug","number") WHERE "drop_copies"."status" = 'open';--> statement-breakpoint
CREATE INDEX "drop_copies_held_until_idx" ON "drop_copies" USING btree ("held_until") WHERE "drop_copies"."status" = 'held';--> statement-breakpoint
CREATE INDEX "sessions_expires_at_idx" ON "sessions" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");