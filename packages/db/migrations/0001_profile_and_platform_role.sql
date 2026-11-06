CREATE TABLE "profile" (
	"user_id" text PRIMARY KEY NOT NULL,
	"display_name" text NOT NULL,
	"pronoun" text,
	"phone" text,
	"accessibility_note" text,
	"interests" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visibility" text DEFAULT 'members' NOT NULL,
	"photo_visibility" text DEFAULT 'members' NOT NULL,
	"notify_by_email" boolean DEFAULT true NOT NULL,
	"notify_new_tasks" boolean DEFAULT false NOT NULL,
	"onboarded_at" timestamp with time zone,
	"rules_accepted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profile_visibility_check" CHECK (
            "profile"."visibility"
            in ('members', 'admins')
        ),
	CONSTRAINT "profile_photo_visibility_check" CHECK (
                "profile"."photo_visibility"
                in ('members', 'admins', 'nobody')
            )
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "platform_role" text DEFAULT 'member' NOT NULL;--> statement-breakpoint
ALTER TABLE "profile" ADD CONSTRAINT "profile_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;