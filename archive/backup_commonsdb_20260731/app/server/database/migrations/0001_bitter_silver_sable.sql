ALTER TABLE "users_on_task_occurrences" DROP CONSTRAINT "users_on_task_occurrences_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "users_on_task_occurrences" DROP CONSTRAINT "users_on_task_occurrences_task_occurrence_id_task_occurrences_id_fk";
--> statement-breakpoint
ALTER TABLE "users_on_task_occurrences" ADD CONSTRAINT "users_on_task_occurrences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_on_task_occurrences" ADD CONSTRAINT "users_on_task_occurrences_task_occurrence_id_task_occurrences_id_fk" FOREIGN KEY ("task_occurrence_id") REFERENCES "public"."task_occurrences"("id") ON DELETE cascade ON UPDATE no action;