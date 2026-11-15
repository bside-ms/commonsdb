CREATE TABLE "task_series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"title" text NOT NULL,
	"description" jsonb,
	"urgent" boolean DEFAULT false NOT NULL,
	"self_service" boolean DEFAULT false NOT NULL,
	"place" text,
	"contact" text,
	"bring" text,
	"physical_demands" text,
	"shift_templates" jsonb NOT NULL,
	"rule" jsonb NOT NULL,
	"anchor" date NOT NULL,
	"until" date,
	"min_gap_days" integer DEFAULT 0 NOT NULL,
	"lookahead" integer DEFAULT 3 NOT NULL,
	"paused_at" timestamp with time zone,
	"created_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_series_until_check" CHECK ("task_series"."until" is null or "task_series"."until" >= "task_series"."anchor"),
	CONSTRAINT "task_series_min_gap_check" CHECK ("task_series"."min_gap_days" between 0 and 365),
	CONSTRAINT "task_series_lookahead_check" CHECK ("task_series"."lookahead" between 1 and 12)
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "series_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "period_key" text;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "series_edited" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "task_series" ADD CONSTRAINT "task_series_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_series" ADD CONSTRAINT "task_series_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_series_category_idx" ON "task_series" USING btree ("category_id");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_series_id_task_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."task_series"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_series_idx" ON "task" USING btree ("series_id");--> statement-breakpoint
CREATE UNIQUE INDEX "task_series_period_idx" ON "task" USING btree ("series_id","period_key") WHERE "task"."period_key" is not null;