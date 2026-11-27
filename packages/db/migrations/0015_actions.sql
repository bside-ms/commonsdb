CREATE TABLE "action" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"description" jsonb,
	"date" date NOT NULL,
	"starts_time" time,
	"ends_time" time,
	"place" text,
	"published_at" timestamp with time zone,
	"created_by" text NOT NULL,
	"updated_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "action_title_check" CHECK (length("action"."title") between 1 and 200),
	CONSTRAINT "action_times_check" CHECK (("action"."starts_time" is null) = ("action"."ends_time" is null))
);
--> statement-breakpoint
CREATE TABLE "action_lead" (
	"action_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	CONSTRAINT "action_lead_action_id_user_id_pk" PRIMARY KEY("action_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "action_id" uuid;--> statement-breakpoint
ALTER TABLE "action_lead" ADD CONSTRAINT "action_lead_action_id_action_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."action"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "action_lead" ADD CONSTRAINT "action_lead_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "action_date_idx" ON "action" USING btree ("date");--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_action_id_action_id_fk" FOREIGN KEY ("action_id") REFERENCES "public"."action"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_action_idx" ON "task" USING btree ("action_id");