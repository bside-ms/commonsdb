CREATE TABLE "site_page" (
	"slug" text PRIMARY KEY NOT NULL,
	"body" jsonb,
	"updated_by" text,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
