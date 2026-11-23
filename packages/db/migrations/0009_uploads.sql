CREATE TABLE "upload" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" text NOT NULL,
	"mime" text NOT NULL,
	"original_name" text,
	"bytes" integer NOT NULL,
	"meta" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"uploaded_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "upload_kind_check" CHECK ("upload"."kind" in ('image', 'document', 'audio', 'video')),
	CONSTRAINT "upload_bytes_check" CHECK ("upload"."bytes" > 0)
);
--> statement-breakpoint
CREATE TABLE "upload_file" (
	"upload_id" uuid NOT NULL,
	"variant" text NOT NULL,
	"storage_key" text NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer,
	"height" integer,
	CONSTRAINT "upload_file_upload_id_variant_pk" PRIMARY KEY("upload_id","variant"),
	CONSTRAINT "upload_file_storage_key_unique" UNIQUE("storage_key")
);
--> statement-breakpoint
ALTER TABLE "upload" ADD CONSTRAINT "upload_uploaded_by_user_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_file" ADD CONSTRAINT "upload_file_upload_id_upload_id_fk" FOREIGN KEY ("upload_id") REFERENCES "public"."upload"("id") ON DELETE cascade ON UPDATE no action;