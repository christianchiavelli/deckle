CREATE TABLE "webhook_deliveries" (
	"id" uuid PRIMARY KEY NOT NULL,
	"source" text NOT NULL,
	"type" text NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signing_keys" (
	"kid" text PRIMARY KEY NOT NULL,
	"algorithm" text NOT NULL,
	"public_jwk" jsonb NOT NULL,
	"private_jwk" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"not_before" timestamp with time zone DEFAULT now() NOT NULL,
	"not_after" timestamp with time zone
);
--> statement-breakpoint
CREATE INDEX "webhook_deliveries_received_at_idx" ON "webhook_deliveries" USING btree ("received_at");--> statement-breakpoint
CREATE INDEX "signing_keys_not_before_idx" ON "signing_keys" USING btree ("not_before");