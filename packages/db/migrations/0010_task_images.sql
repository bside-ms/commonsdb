ALTER TABLE "task" ADD COLUMN "image_id" uuid;--> statement-breakpoint
ALTER TABLE "task" ADD COLUMN "image_alt" text;--> statement-breakpoint
ALTER TABLE "task_series" ADD COLUMN "image_id" uuid;--> statement-breakpoint
ALTER TABLE "task_series" ADD COLUMN "image_alt" text;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_image_id_upload_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."upload"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_series" ADD CONSTRAINT "task_series_image_id_upload_id_fk" FOREIGN KEY ("image_id") REFERENCES "public"."upload"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "task_image_idx" ON "task" USING btree ("image_id");--> statement-breakpoint
CREATE INDEX "task_series_image_idx" ON "task_series" USING btree ("image_id");