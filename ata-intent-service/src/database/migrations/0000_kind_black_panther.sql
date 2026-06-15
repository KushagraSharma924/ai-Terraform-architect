CREATE SCHEMA "intent";
--> statement-breakpoint
CREATE TABLE "intent"."generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"parent_generation_id" uuid,
	"version_number" integer DEFAULT 1 NOT NULL,
	"prompt_text" text NOT NULL,
	"prompt_hash" varchar(64) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"cloud_provider_hint" varchar(20),
	"infrastructure_spec" jsonb,
	"confidence_score" numeric(3, 2),
	"llm_provider" varchar(20),
	"llm_model" varchar(50),
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"latency_ms" integer,
	"retry_count" integer DEFAULT 0 NOT NULL,
	"error_code" varchar(50),
	"error_message" text,
	"error_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "intent"."intent_defaults" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"field_path" varchar(255) NOT NULL,
	"cloud_provider" varchar(20) NOT NULL,
	"default_value" jsonb NOT NULL,
	"reason" text,
	CONSTRAINT "intent_defaults_field_path_unique" UNIQUE("field_path")
);
--> statement-breakpoint
CREATE TABLE "intent"."llm_call_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"generation_id" uuid NOT NULL,
	"attempt_number" integer NOT NULL,
	"provider" varchar(20) NOT NULL,
	"model" varchar(50) NOT NULL,
	"request_redacted" jsonb,
	"response_redacted" jsonb,
	"prompt_tokens" integer,
	"completion_tokens" integer,
	"latency_ms" integer,
	"validation_errors" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent"."prompt_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"version" varchar(10) NOT NULL,
	"schema_version" varchar(10) NOT NULL,
	"template_text" text NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "intent"."generations" ADD CONSTRAINT "generations_parent_generation_id_generations_id_fk" FOREIGN KEY ("parent_generation_id") REFERENCES "intent"."generations"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent"."llm_call_logs" ADD CONSTRAINT "llm_call_logs_generation_id_generations_id_fk" FOREIGN KEY ("generation_id") REFERENCES "intent"."generations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_generations_project" ON "intent"."generations" USING btree ("project_id");--> statement-breakpoint
CREATE INDEX "idx_generations_user" ON "intent"."generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_generations_status" ON "intent"."generations" USING btree ("status");--> statement-breakpoint
CREATE INDEX "idx_generations_prompt_hash" ON "intent"."generations" USING btree ("prompt_hash");--> statement-breakpoint
CREATE INDEX "idx_llm_logs_generation" ON "intent"."llm_call_logs" USING btree ("generation_id");--> statement-breakpoint
CREATE INDEX "uq_template_name_version" ON "intent"."prompt_templates" USING btree ("name","version");