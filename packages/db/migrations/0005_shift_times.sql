ALTER TABLE "shift" ADD COLUMN "starts_time" time;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "ends_time" time;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "ends_next_day" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "shift" ADD COLUMN "position" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "shift_one_per_member_idx" ON "shift" USING btree ("task_id","assignee_id") WHERE "shift"."assignee_id" is not null;--> statement-breakpoint
ALTER TABLE "shift" DROP COLUMN "starts_at";--> statement-breakpoint
ALTER TABLE "shift" DROP COLUMN "ends_at";--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_time_check" CHECK (("shift"."starts_time" is null and "shift"."ends_time" is null and not "shift"."ends_next_day") or ("shift"."starts_time" is not null and "shift"."ends_time" is not null and "shift"."ends_next_day" = ("shift"."ends_time" <= "shift"."starts_time")));