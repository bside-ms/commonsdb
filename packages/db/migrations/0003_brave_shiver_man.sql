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
ALTER TABLE "shift" DROP CONSTRAINT "shift_hours_check";--> statement-breakpoint
ALTER TABLE "shift" DROP CONSTRAINT "shift_status_check";--> statement-breakpoint
ALTER TABLE "shift" DROP CONSTRAINT "shift_open_unassigned_check";--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_account_id_account_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."account"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ledger_entry" ADD CONSTRAINT "ledger_entry_shift_id_shift_id_fk" FOREIGN KEY ("shift_id") REFERENCES "public"."shift"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "ledger_entry_account_idx" ON "ledger_entry" USING btree ("account_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "ledger_entry_shift_credit_uniq" ON "ledger_entry" USING btree ("shift_id") WHERE "ledger_entry"."kind" = 'shift_credit';--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_hours_check" CHECK ("shift"."hours_tenths"
            > 0);--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_status_check" CHECK ("shift"."status"
            in ('open', 'taken', 'reported', 'confirmed'));--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_open_unassigned_check" CHECK ("shift"."status"
            <> 'open' or
            "shift"."assignee_id"
            is
            null);