CREATE TYPE "public"."organization_member_role" AS ENUM('MEMBER', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."task_ends_after" AS ENUM('NEVER', 'COUNT', 'DATE');--> statement-breakpoint
CREATE TYPE "public"."task_frequency" AS ENUM('IRREGULAR', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY');--> statement-breakpoint
CREATE TYPE "public"."task_occurrence_status" AS ENUM('PENDING', 'COMPLETED', 'MISSED');--> statement-breakpoint
CREATE TYPE "public"."task_priority" AS ENUM('LOW', 'MEDIUM', 'HIGH', 'URGENT');--> statement-breakpoint
CREATE TYPE "public"."task_publishing_status" AS ENUM('DRAFT', 'PUBLISHED', 'FOLDED');--> statement-breakpoint
CREATE TYPE "public"."task_status" AS ENUM('PROCESSING', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "public"."task_type" AS ENUM('SINGLE', 'RECURRING');--> statement-breakpoint
CREATE TYPE "public"."wallet_transaction_type" AS ENUM('TRANSFER_IN', 'TRANSFER_OUT');--> statement-breakpoint
CREATE TABLE "organizationMembers" (
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"role" "organization_member_role" DEFAULT 'MEMBER',
	CONSTRAINT "organizationMembers_organization_id_user_id_pk" PRIMARY KEY("organization_id","user_id")
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"code" text,
	"name" text NOT NULL,
	"bio" text,
	"wallet_id" uuid NOT NULL,
	CONSTRAINT "organizations_code_unique" UNIQUE("code")
);
--> statement-breakpoint
CREATE TABLE "categories_on_tasks" (
	"task_id" uuid NOT NULL,
	"category_id" uuid NOT NULL,
	CONSTRAINT "categories_on_tasks_task_id_category_id_pk" PRIMARY KEY("task_id","category_id")
);
--> statement-breakpoint
CREATE TABLE "task_categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"url" text NOT NULL,
	"parent_id" uuid,
	CONSTRAINT "task_categories_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE "task_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"label" text,
	"url" text NOT NULL,
	"task_id" uuid
);
--> statement-breakpoint
CREATE TABLE "task_occurrences" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"due_start_date" timestamp,
	"due_end_date" timestamp,
	"status" "task_occurrence_status" DEFAULT 'PENDING' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"status" "task_status" DEFAULT 'PROCESSING' NOT NULL,
	"publishingStatus" "task_publishing_status" DEFAULT 'DRAFT' NOT NULL,
	"title" text NOT NULL,
	"description" text,
	"type" "task_type" NOT NULL,
	"frequency" "task_frequency",
	"due_start_date" timestamp,
	"due_end_date" timestamp,
	"endsAfter" "task_ends_after" DEFAULT 'NEVER' NOT NULL,
	"ends_after_count" integer,
	"ends_after_date" timestamp,
	"priority" "task_priority",
	"expense" integer,
	"factor" numeric(2)
);
--> statement-breakpoint
CREATE TABLE "users_on_task_occurrences" (
	"user_id" uuid NOT NULL,
	"task_occurrence_id" uuid NOT NULL,
	CONSTRAINT "users_on_task_occurrences_user_id_task_occurrence_id_pk" PRIMARY KEY("user_id","task_occurrence_id")
);
--> statement-breakpoint
CREATE TABLE "users_on_tasks" (
	"user_id" uuid NOT NULL,
	"task_id" uuid NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by_user_id" uuid,
	"resigned_at" timestamp,
	CONSTRAINT "users_on_tasks_user_id_task_id_pk" PRIMARY KEY("user_id","task_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"username" text,
	"firstname" text,
	"lastname" text,
	"wallet_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wallet_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"type" "wallet_transaction_type",
	"amount" integer NOT NULL,
	"comment" text
);
--> statement-breakpoint
CREATE TABLE "wallets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "organizationMembers" ADD CONSTRAINT "organizationMembers_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizationMembers" ADD CONSTRAINT "organizationMembers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories_on_tasks" ADD CONSTRAINT "categories_on_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "categories_on_tasks" ADD CONSTRAINT "categories_on_tasks_category_id_task_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."task_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_categories" ADD CONSTRAINT "task_categories_parent_id_task_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."task_categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_links" ADD CONSTRAINT "task_links_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_occurrences" ADD CONSTRAINT "task_occurrences_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_on_task_occurrences" ADD CONSTRAINT "users_on_task_occurrences_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_on_task_occurrences" ADD CONSTRAINT "users_on_task_occurrences_task_occurrence_id_task_occurrences_id_fk" FOREIGN KEY ("task_occurrence_id") REFERENCES "public"."task_occurrences"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_on_tasks" ADD CONSTRAINT "users_on_tasks_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_on_tasks" ADD CONSTRAINT "users_on_tasks_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users_on_tasks" ADD CONSTRAINT "users_on_tasks_assigned_by_user_id_users_id_fk" FOREIGN KEY ("assigned_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;