CREATE SCHEMA "security";
--> statement-breakpoint
CREATE TABLE "security"."compliance_results" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"framework" varchar(16) NOT NULL,
	"control_id" varchar(32) NOT NULL,
	"status" varchar(12) NOT NULL,
	"finding_refs" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security"."findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"scan_id" uuid NOT NULL,
	"organization_id" uuid NOT NULL,
	"scanner" varchar(20) NOT NULL,
	"rule_id" varchar(64) NOT NULL,
	"severity" varchar(12) NOT NULL,
	"resource" varchar(255),
	"file_path" varchar(1024),
	"line" integer,
	"message" text NOT NULL,
	"remediation" text,
	"status" varchar(16) DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security"."policies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"name" varchar(128) NOT NULL,
	"rego_source" text NOT NULL,
	"severity" varchar(12) DEFAULT 'high' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "security"."scans" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"target_type" varchar(20) NOT NULL,
	"target_id" uuid NOT NULL,
	"scanners" jsonb NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"risk_score" integer,
	"grade" varchar(2),
	"error" text,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "security"."suppressions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"rule_id" varchar(64) NOT NULL,
	"resource" varchar(255),
	"reason" text NOT NULL,
	"created_by" uuid NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "security"."compliance_results" ADD CONSTRAINT "compliance_results_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "security"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security"."findings" ADD CONSTRAINT "findings_scan_id_scans_id_fk" FOREIGN KEY ("scan_id") REFERENCES "security"."scans"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_compliance_scan" ON "security"."compliance_results" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_findings_scan" ON "security"."findings" USING btree ("scan_id");--> statement-breakpoint
CREATE INDEX "idx_findings_severity" ON "security"."findings" USING btree ("severity");--> statement-breakpoint
CREATE INDEX "idx_policies_org" ON "security"."policies" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_scans_org" ON "security"."scans" USING btree ("organization_id");--> statement-breakpoint
CREATE INDEX "idx_scans_target" ON "security"."scans" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "idx_suppressions_org" ON "security"."suppressions" USING btree ("organization_id");