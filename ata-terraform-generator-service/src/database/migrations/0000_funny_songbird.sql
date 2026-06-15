CREATE SCHEMA "terraform";
--> statement-breakpoint
CREATE TABLE "terraform"."generation_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terraform_version_id" uuid NOT NULL,
	"stage" varchar(50) NOT NULL,
	"level" varchar(10) NOT NULL,
	"message" text NOT NULL,
	"metadata" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terraform"."module_registry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" varchar(20) NOT NULL,
	"category" varchar(30) NOT NULL,
	"name" varchar(100) NOT NULL,
	"version" varchar(20) NOT NULL,
	"source_path" varchar(255) NOT NULL,
	"status" varchar(20) DEFAULT 'active' NOT NULL,
	"required_variables" jsonb NOT NULL,
	"optional_variables" jsonb,
	"outputs" jsonb NOT NULL,
	"depends_on" jsonb,
	"supported_intent_keys" jsonb,
	"released_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terraform"."terraform_files" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terraform_version_id" uuid NOT NULL,
	"file_path" varchar(1024) NOT NULL,
	"file_type" varchar(20) NOT NULL,
	"content" text NOT NULL,
	"checksum" varchar(64) NOT NULL,
	"size_bytes" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terraform"."terraform_projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"cloud_provider" varchar(20) NOT NULL,
	"name" varchar(255) NOT NULL,
	"current_version_id" uuid,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "terraform"."terraform_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terraform_project_id" uuid NOT NULL,
	"generation_id" uuid NOT NULL,
	"version_number" integer NOT NULL,
	"spec_snapshot" jsonb NOT NULL,
	"module_versions_used" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"validation_passed" boolean,
	"file_count" integer,
	"total_size_bytes" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "terraform"."validation_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terraform_version_id" uuid NOT NULL,
	"tool" varchar(30) NOT NULL,
	"status" varchar(20) NOT NULL,
	"raw_output" jsonb,
	"summary" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "terraform"."generation_logs" ADD CONSTRAINT "generation_logs_terraform_version_id_terraform_versions_id_fk" FOREIGN KEY ("terraform_version_id") REFERENCES "terraform"."terraform_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terraform"."terraform_files" ADD CONSTRAINT "terraform_files_terraform_version_id_terraform_versions_id_fk" FOREIGN KEY ("terraform_version_id") REFERENCES "terraform"."terraform_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terraform"."terraform_versions" ADD CONSTRAINT "terraform_versions_terraform_project_id_terraform_projects_id_fk" FOREIGN KEY ("terraform_project_id") REFERENCES "terraform"."terraform_projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "terraform"."validation_results" ADD CONSTRAINT "validation_results_terraform_version_id_terraform_versions_id_fk" FOREIGN KEY ("terraform_version_id") REFERENCES "terraform"."terraform_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_genlogs_version" ON "terraform"."generation_logs" USING btree ("terraform_version_id");--> statement-breakpoint
CREATE INDEX "idx_genlogs_level" ON "terraform"."generation_logs" USING btree ("level");--> statement-breakpoint
CREATE INDEX "idx_module_registry_lookup" ON "terraform"."module_registry" USING btree ("provider","category","name","status");--> statement-breakpoint
CREATE INDEX "idx_tffiles_version" ON "terraform"."terraform_files" USING btree ("terraform_version_id");--> statement-breakpoint
CREATE INDEX "idx_tfprojects_generation" ON "terraform"."terraform_projects" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "idx_tfprojects_project" ON "terraform"."terraform_projects" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_tfversions_project" ON "terraform"."terraform_versions" USING btree ("terraform_project_id");--> statement-breakpoint
CREATE INDEX "idx_tfversions_generation" ON "terraform"."terraform_versions" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "idx_validation_version" ON "terraform"."validation_results" USING btree ("terraform_version_id");