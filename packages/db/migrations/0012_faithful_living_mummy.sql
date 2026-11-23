CREATE TABLE "suggestion" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text,
	"place" text,
	"category_id" uuid,
	"image_id" uuid,
	"status" text DEFAULT 'open' NOT NULL,
	"task_id" uuid,
	"rejection_note" text,
	"created_by" text NOT NULL,
	"handled_by" text,
	"handled_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "suggestion_title_check" CHECK (length("suggestion"."title") between 1 and 200),
	CONSTRAINT "suggestion_handled_check" CHECK (("suggestion"."status" = 'open') = ("suggestion"."handled_at" is null))
);
--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_image_id_upload_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."upload"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "suggestion" ADD CONSTRAINT "suggestion_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "suggestion_status_idx" ON "suggestion" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "suggestion_created_by_idx" ON "suggestion" USING btree ("created_by");