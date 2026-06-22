CREATE TABLE "terraform"."terraform_artifacts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"terraform_version_id" uuid NOT NULL,
	"type" varchar(20) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"storage_key" varchar(1024),
	"content_hash" varchar(64),
	"size_bytes" integer,
	"file_name" varchar(255) NOT NULL,
	"error" text,
	"download_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"ready_at" timestamp with time zone,
	"expires_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "terraform"."terraform_artifacts" ADD CONSTRAINT "terraform_artifacts_terraform_version_id_terraform_versions_id_fk" FOREIGN KEY ("terraform_version_id") REFERENCES "terraform"."terraform_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_tfartifacts_version" ON "terraform"."terraform_artifacts" USING btree ("terraform_version_id");--> statement-breakpoint
CREATE INDEX "idx_tfartifacts_hash" ON "terraform"."terraform_artifacts" USING btree ("content_hash");--> statement-breakpoint
CREATE INDEX "idx_tfartifacts_status" ON "terraform"."terraform_artifacts" USING btree ("status");