CREATE TABLE IF NOT EXISTS "friendships" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"addressee_id" uuid NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"responded_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "friend_code" text;--> statement-breakpoint
UPDATE "users" SET "friend_code" = translate(upper(substr(md5("id"::text || random()::text), 1, 8)), '01', 'GH') WHERE "friend_code" IS NULL;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "friend_code" SET NOT NULL;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "friendships" ADD CONSTRAINT "friendships_addressee_id_users_id_fk" FOREIGN KEY ("addressee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "friendships_pair_unique" ON "friendships" USING btree (least("requester_id", "addressee_id"),greatest("requester_id", "addressee_id"));--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_requester_idx" ON "friendships" USING btree ("requester_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "friendships_addressee_idx" ON "friendships" USING btree ("addressee_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_friend_code_unique" UNIQUE("friend_code");