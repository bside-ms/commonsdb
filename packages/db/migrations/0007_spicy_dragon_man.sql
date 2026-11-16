CREATE TABLE "message" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"thread_id" uuid NOT NULL,
	"author_id" text,
	"body" jsonb,
	"system" text,
	"retracted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "message_author_check" CHECK (("message"."author_id" is null) = ("message"."system" is not null)),
	CONSTRAINT "message_body_check" CHECK (("message"."body" is null) = ("message"."retracted_at" is not null))
);
--> statement-breakpoint
CREATE TABLE "thread" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"subject" text,
	"task_id" uuid,
	"member_id" text,
	"direct_key" text,
	"task_log" text,
	"claimed_by" text,
	"archived_at" timestamp with time zone,
	"archived_by" text,
	"admin_deleted_at" timestamp with time zone,
	"reported_thread_id" uuid,
	"last_message_at" timestamp with time zone DEFAULT now() NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thread_kind_check" CHECK ("thread"."kind" in ('admin', 'direct', 'group', 'task')),
	CONSTRAINT "thread_direct_key_check" CHECK (("thread"."kind" = 'direct') = ("thread"."direct_key" is not null)),
	CONSTRAINT "thread_task_log_check" CHECK ("thread"."task_log" is null or "thread"."kind" = 'admin')
);
--> statement-breakpoint
CREATE TABLE "thread_participant" (
	"thread_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"last_read_at" timestamp with time zone,
	"hidden_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "thread_participant_thread_id_user_id_pk" PRIMARY KEY("thread_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "user_block" (
	"blocker_id" text NOT NULL,
	"blocked_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_block_blocker_id_blocked_id_pk" PRIMARY KEY("blocker_id","blocked_id"),
	CONSTRAINT "user_block_self_check" CHECK ("user_block"."blocker_id" <> "user_block"."blocked_id")
);
--> statement-breakpoint
ALTER TABLE "profile" ADD COLUMN "dm_open" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "message" ADD CONSTRAINT "message_thread_id_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread" ADD CONSTRAINT "thread_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread" ADD CONSTRAINT "thread_member_id_user_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread" ADD CONSTRAINT "thread_claimed_by_user_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_participant" ADD CONSTRAINT "thread_participant_thread_id_thread_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."thread"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "thread_participant" ADD CONSTRAINT "thread_participant_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blocker_id_user_id_fk" FOREIGN KEY ("blocker_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_block" ADD CONSTRAINT "user_block_blocked_id_user_id_fk" FOREIGN KEY ("blocked_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "message_thread_idx" ON "message" USING btree ("thread_id","created_at");--> statement-breakpoint
CREATE INDEX "thread_member_idx" ON "thread" USING btree ("member_id");--> statement-breakpoint
CREATE INDEX "thread_task_idx" ON "thread" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "thread_last_message_idx" ON "thread" USING btree ("last_message_at");--> statement-breakpoint
CREATE UNIQUE INDEX "thread_direct_key_idx" ON "thread" USING btree ("direct_key") WHERE "thread"."kind" = 'direct';--> statement-breakpoint
CREATE UNIQUE INDEX "thread_task_chat_idx" ON "thread" USING btree ("task_id") WHERE "thread"."kind" = 'task';--> statement-breakpoint
CREATE UNIQUE INDEX "thread_task_log_idx" ON "thread" USING btree ("task_log") WHERE "thread"."task_log" is not null;--> statement-breakpoint
CREATE INDEX "thread_participant_user_idx" ON "thread_participant" USING btree ("user_id");