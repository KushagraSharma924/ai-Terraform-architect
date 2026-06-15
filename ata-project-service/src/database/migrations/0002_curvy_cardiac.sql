CREATE TABLE "projects"."architecture_specifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"specification" jsonb NOT NULL,
	"raw_prompt" varchar(4096) NOT NULL,
	"ambiguities" jsonb,
	"tokens_used" integer DEFAULT 0,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects"."parser_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"error_message" varchar(1024),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "projects"."architecture_specifications" ADD CONSTRAINT "architecture_specifications_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects"."parser_jobs" ADD CONSTRAINT "parser_jobs_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "projects"."projects"("id") ON DELETE cascade ON UPDATE no action;