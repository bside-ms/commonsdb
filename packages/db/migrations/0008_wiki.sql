CREATE TABLE "knowledge_link" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"ref" text NOT NULL,
	"cached_title" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "knowledge_link_entity_type_check" CHECK ("knowledge_link"."entity_type" in ('task', 'series'))
);
--> statement-breakpoint
CREATE TABLE "wiki_page" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"parent_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"current_revision_id" uuid,
	"search_text" text DEFAULT '' NOT NULL,
	"search" "tsvector" GENERATED ALWAYS AS (setweight(to_tsvector('german', title), 'A') || setweight(to_tsvector('german', search_text), 'B')) STORED,
	"deleted_at" timestamp with time zone,
	"deleted_by" text,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "wiki_page_title_check" CHECK (length("wiki_page"."title") between 1 and 200)
);
--> statement-breakpoint
CREATE TABLE "wiki_revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"page_id" uuid NOT NULL,
	"title" text NOT NULL,
	"content" jsonb,
	"author_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "wiki_page" ADD CONSTRAINT "wiki_page_parent_id_wiki_page_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."wiki_page"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wiki_revision" ADD CONSTRAINT "wiki_revision_page_id_wiki_page_id_fk" FOREIGN KEY ("page_id") REFERENCES "public"."wiki_page"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "knowledge_link_unique_idx" ON "knowledge_link" USING btree ("entity_type","entity_id","provider","ref");--> statement-breakpoint
CREATE INDEX "knowledge_link_entity_idx" ON "knowledge_link" USING btree ("entity_type","entity_id","position");--> statement-breakpoint
CREATE INDEX "knowledge_link_ref_idx" ON "knowledge_link" USING btree ("provider","ref");--> statement-breakpoint
CREATE UNIQUE INDEX "wiki_page_slug_idx" ON "wiki_page" USING btree ("slug");--> statement-breakpoint
CREATE INDEX "wiki_page_parent_idx" ON "wiki_page" USING btree ("parent_id","position");--> statement-breakpoint
CREATE INDEX "wiki_page_search_idx" ON "wiki_page" USING gin ("search");--> statement-breakpoint
CREATE INDEX "wiki_revision_page_idx" ON "wiki_revision" USING btree ("page_id","created_at");