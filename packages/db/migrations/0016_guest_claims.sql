CREATE TABLE "shift_claim" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shift_id" uuid NOT NULL,
	"code_hash" text NOT NULL,
	"guest_name" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"claimed_by" text,
	"claimed_at" timestamp with time zone,
	CONSTRAINT "shift_claim_shift_id_unique" UNIQUE("shift_id"),
	CONSTRAINT "shift_claim_code_hash_unique" UNIQUE("code_hash")
);
--> statement-breakpoint
ALTER TABLE "shift_claim" ADD CONSTRAINT "shift_claim_shift_id_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shift"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "shift_claim_open_idx" ON "shift_claim" USING btree ("claimed_at","created_at");