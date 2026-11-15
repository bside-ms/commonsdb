CREATE TABLE "ledger_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_account_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "ledger_account_kind_check" CHECK ("ledger_account"."kind" in ('user', 'initiative'))
);
--> statement-breakpoint
ALTER TABLE "shift" DROP CONSTRAINT "shift_hours_check";--> statement-breakpoint
ALTER TABLE "ledger_entry" DROP CONSTRAINT "ledger_entry_account_id_account_id_fk";
--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "reported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "report_note" text;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "send_back_note" text;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "confirmed_by" text;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "confirm_note" text;--> statement-breakpoint
ALTER TABLE "ledger_account" ADD CONSTRAINT "ledger_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_account_id_ledger_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_hours_check" CHECK ("shift"."hours_tenths" > 0);