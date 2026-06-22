CREATE SCHEMA "deployment";
--> statement-breakpoint
CREATE TABLE "deployment"."cloud_accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"provider" varchar(20) DEFAULT 'aws' NOT NULL,
	"auth_method" varchar(20) NOT NULL,
	"role_arn" varchar(512),
	"external_id" varchar(128),
	"secret_ref" varchar(512),
	"default_region" varchar(32) DEFAULT 'us-east-1' NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployment"."cost_guardrails" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"monthly_limit_usd" integer,
	"per_deploy_limit_usd" integer,
	"action" varchar(10) DEFAULT 'block' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployment"."deployment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" uuid NOT NULL,
	"from_state" varchar(30),
	"to_state" varchar(30) NOT NULL,
	"event" varchar(50) NOT NULL,
	"actor" uuid,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployment"."deployment_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"deployment_id" uuid NOT NULL,
	"run_type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'running' NOT NULL,
	"exit_code" integer,
	"log_storage_key" varchar(1024),
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "deployment"."deployments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"cloud_account_id" uuid NOT NULL,
	"project_version_id" uuid NOT NULL,
	"environment" varchar(32) DEFAULT 'dev' NOT NULL,
	"state" varchar(30) DEFAULT 'queued' NOT NULL,
	"plan_summary" jsonb,
	"cost_estimate" jsonb,
	"state_version" integer,
	"requested_by" uuid NOT NULL,
	"approved_by" uuid,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "deployment"."deployment_events" ADD CONSTRAINT "deployment_events_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "deployment"."deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment"."deployment_runs" ADD CONSTRAINT "deployment_runs_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "deployment"."deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment"."deployments" ADD CONSTRAINT "deployments_cloud_account_id_cloud_accounts_id_fk" FOREIGN KEY ("cloud_account_id") REFERENCES "deployment"."cloud_accounts"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_cloud_accounts_org" ON "deployment"."cloud_accounts" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_cloud_accounts_user" ON "deployment"."cloud_accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_cost_guardrails_org" ON "deployment"."cost_guardrails" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_deployment_events_deployment" ON "deployment"."deployment_events" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "idx_deployment_runs_deployment" ON "deployment"."deployment_runs" USING btree ("deployment_id");--> statement-breakpoint
CREATE INDEX "idx_deployments_org" ON "deployment"."deployments" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_deployments_account" ON "deployment"."deployments" USING btree ("cloud_account_id");--> statement-breakpoint
CREATE INDEX "idx_deployments_state" ON "deployment"."deployments" USING btree ("state");