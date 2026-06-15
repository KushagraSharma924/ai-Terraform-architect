ALTER TABLE "projects"."usage_quotas" ALTER COLUMN "generations_used" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "projects"."usage_quotas" ALTER COLUMN "generations_limit" SET DATA TYPE integer;--> statement-breakpoint
ALTER TABLE "projects"."workspace_members" ADD CONSTRAINT "workspace_members_pkey" PRIMARY KEY("workspace_id","user_id");--> statement-breakpoint
ALTER TABLE "projects"."projects" ADD CONSTRAINT "uq_project_name_per_workspace" UNIQUE("workspace_id","name");--> statement-breakpoint
ALTER TABLE "projects"."usage_quotas" ADD CONSTRAINT "uq_user_period" UNIQUE("user_id","period_start","period_end");