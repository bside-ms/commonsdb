CREATE TABLE "ledger_account" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"user_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_account_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "ledger_account_kind_check" CHECK ("ledger_account"."kind" in ('user', 'initiative'))
);
--> statement-breakpoint
CREATE TABLE "ledger_entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"amount_tenths" integer NOT NULL,
	"kind" text NOT NULL,
	"memo" text,
	"shift_id" uuid,
	"actor_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ledger_entry_amount_check" CHECK ("ledger_entry"."amount_tenths" <> 0),
	CONSTRAINT "ledger_entry_kind_check" CHECK ("ledger_entry"."kind" in ('shift_credit', 'adjustment')),
	CONSTRAINT "ledger_entry_shift_credit_check" CHECK ("ledger_entry"."kind" <> 'shift_credit' or ("ledger_entry"."shift_id" is not null and "ledger_entry"."amount_tenths" > 0)),
	CONSTRAINT "ledger_entry_adjustment_memo_check" CHECK ("ledger_entry"."kind" <> 'adjustment' or "ledger_entry"."memo" is not null)
);
--> statement-breakpoint
ALTER TABLE "profile" DROP CONSTRAINT "profile_visibility_check";--> statement-breakpoint
ALTER TABLE "profile" DROP CONSTRAINT "profile_photo_visibility_check";--> statement-breakpoint
ALTER TABLE "shift" DROP CONSTRAINT "shift_hours_check";--> statement-breakpoint
ALTER TABLE "shift" DROP CONSTRAINT "shift_status_check";--> statement-breakpoint
ALTER TABLE "shift" DROP CONSTRAINT "shift_open_unassigned_check";--> statement-breakpoint
ALTER TABLE "task" DROP CONSTRAINT "task_when_check";--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "reported_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "report_note" text;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "send_back_note" text;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "confirmed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "confirmed_by" text;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "confirm_note" text;--> statement-breakpoint
ALTER TABLE "ledger_account" ADD CONSTRAINT "ledger_account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_account_id_ledger_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."ledger_account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_shift_id_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shift"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_entry_account_idx" ON "ledger_entry" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entry_shift_credit_uniq" ON "ledger_entry" USING btree ("shift_id") WHERE "ledger_entry"."kind" = 'shift_credit';--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_visibility_check" CHECK ("profile"."visibility" in ('members', 'admins'));--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_photo_visibility_check" CHECK ("profile"."photo_visibility" in ('members', 'admins', 'nobody'));--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_hours_check" CHECK ("shift"."hours_tenths" > 0);--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_status_check" CHECK ("shift"."status" in ('open', 'taken', 'reported', 'confirmed'));--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_open_unassigned_check" CHECK ("shift"."status" <> 'open' or "shift"."assignee_id" is null);--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_when_check" CHECK (("task"."when_kind" = 'date' and "task"."ends_on" is null) or ("task"."when_kind" = 'range' and "task"."ends_on" is not null and "task"."ends_on" >= "task"."starts_on"));