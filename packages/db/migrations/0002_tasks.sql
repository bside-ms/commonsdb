CREATE TABLE "capability" (
	"user_id" text NOT NULL,
	"category_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "capability_user_id_category_id_pk" PRIMARY KEY("user_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"super_category_id" uuid NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shift" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"starts_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"hours_tenths" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"assignee_id" text,
	"taken_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "shift_hours_check" CHECK ("shift"."hours_tenths"
        > 0),
	CONSTRAINT "shift_status_check" CHECK ("shift"."status"
        in ('open', 'taken', 'reported', 'confirmed')),
	CONSTRAINT "shift_open_unassigned_check" CHECK ("shift"."status"
        <> 'open' or
        "shift"."assignee_id"
        is
        null)
);
--> statement-breakpoint
CREATE TABLE "super_category" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task" (
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
	"when_kind" text NOT NULL,
	"starts_on" date NOT NULL,
	"ends_on" date,
	"created_by" text,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "task_when_check" CHECK (("task"."when_kind" = 'date' and "task"."ends_on" is null)
                or (
                "task"."when_kind"
                =
                'range'
                and
                "task"."ends_on"
                is
                not
                null
                and
                "task"."ends_on"
                >=
                "task"."starts_on"
                ))
);
--> statement-breakpoint
ALTER TABLE "capability" ADD CONSTRAINT "capability_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "capability" ADD CONSTRAINT "capability_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category" ADD CONSTRAINT "category_super_category_id_super_category_id_fk" FOREIGN KEY ("super_category_id") REFERENCES "public"."super_category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_task_id_task_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."task"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "shift" ADD CONSTRAINT "shift_assignee_id_user_id_fk" FOREIGN KEY ("assignee_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_category_id_category_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."category"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task" ADD CONSTRAINT "task_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "category_super_category_idx" ON "category" USING btree ("super_category_id");--> statement-breakpoint
CREATE INDEX "shift_task_idx" ON "shift" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "shift_assignee_idx" ON "shift" USING btree ("assignee_id");--> statement-breakpoint
CREATE INDEX "task_category_idx" ON "task" USING btree ("category_id");