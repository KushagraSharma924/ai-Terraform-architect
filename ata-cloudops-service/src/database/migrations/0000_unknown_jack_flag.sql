CREATE SCHEMA "cloudops";
--> statement-breakpoint
CREATE TABLE "cloudops"."cloud_resources" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"snapshot_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"service" varchar(20) NOT NULL,
	"resource_id" varchar(255) NOT NULL,
	"region" varchar(32),
	"type" varchar(64),
	"state" varchar(32),
	"monthly_cost" numeric(10, 2),
	"tags" jsonb,
	"config" jsonb,
	"discovered_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudops"."conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"cloud_account_id" uuid NOT NULL,
	"title" varchar(255),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudops"."cost_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cloud_account_id" uuid NOT NULL,
	"service" varchar(40) NOT NULL,
	"usage_date" date NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" varchar(8) DEFAULT 'USD' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudops"."inventory_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cloud_account_id" uuid NOT NULL,
	"resource_count" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"taken_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudops"."messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"role" varchar(12) NOT NULL,
	"content" text NOT NULL,
	"citations" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cloudops"."recommendations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cloud_account_id" uuid NOT NULL,
	"category" varchar(20) NOT NULL,
	"severity" varchar(12) NOT NULL,
	"resource_ref" varchar(255),
	"title" varchar(255) NOT NULL,
	"rationale" text NOT NULL,
	"est_savings" numeric(10, 2),
	"status" varchar(12) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cloudops"."cloud_resources" ADD CONSTRAINT "cloud_resources_snapshot_id_inventory_snapshots_id_fk" FOREIGN KEY ("snapshot_id") REFERENCES "cloudops"."inventory_snapshots"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cloudops"."messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "cloudops"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cloud_res_snap" ON "cloudops"."cloud_resources" USING btree ("snapshot_id");--> statement-breakpoint
CREATE INDEX "idx_cloud_res_service" ON "cloudops"."cloud_resources" USING btree ("service");--> statement-breakpoint
CREATE INDEX "idx_cost_org_date" ON "cloudops"."cost_records" USING btree ("organization_id","usage_date");--> statement-breakpoint
CREATE INDEX "idx_inv_snap_org" ON "cloudops"."inventory_snapshots" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_messages_conv" ON "cloudops"."messages" USING btree ("conversation_id");--> statement-breakpoint
CREATE INDEX "idx_recs_org" ON "cloudops"."recommendations" USING btree ("organization_id");