import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  jsonb,
  boolean,
  index,
} from 'drizzle-orm/pg-core';

export const securitySchema = pgSchema('security');

export const scans = securitySchema.table(
  'scans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    targetType: varchar('target_type', { length: 20 }).notNull(), // 'project_version'|'deployment'
    targetId: uuid('target_id').notNull(),
    scanners: jsonb('scanners').notNull(), // e.g. ['heuristic','checkov','tfsec']
    status: varchar('status', { length: 20 }).notNull().default('pending'), // pending|running|completed|failed
    riskScore: integer('risk_score'),
    grade: varchar('grade', { length: 2 }), // A..F
    error: text('error'),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => ({
    orgIdx: index('idx_scans_org').on(t.organizationId),
    targetIdx: index('idx_scans_target').on(t.targetType, t.targetId),
  }),
);

export const findings = securitySchema.table(
  'findings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scanId: uuid('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').notNull(),
    scanner: varchar('scanner', { length: 20 }).notNull(), // 'heuristic'|'checkov'|'tfsec'|'opa'
    ruleId: varchar('rule_id', { length: 64 }).notNull(),
    severity: varchar('severity', { length: 12 }).notNull(), // critical|high|medium|low|info
    resource: varchar('resource', { length: 255 }),
    filePath: varchar('file_path', { length: 1024 }),
    line: integer('line'),
    message: text('message').notNull(),
    remediation: text('remediation'),
    status: varchar('status', { length: 16 }).notNull().default('open'), // open|suppressed
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    scanIdx: index('idx_findings_scan').on(t.scanId),
    severityIdx: index('idx_findings_severity').on(t.severity),
  }),
);

export const complianceResults = securitySchema.table(
  'compliance_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    scanId: uuid('scan_id')
      .notNull()
      .references(() => scans.id, { onDelete: 'cascade' }),
    framework: varchar('framework', { length: 16 }).notNull(), // cis|soc2|iso27001
    controlId: varchar('control_id', { length: 32 }).notNull(),
    status: varchar('status', { length: 12 }).notNull(), // pass|fail
    findingRefs: jsonb('finding_refs'), // ruleIds contributing to a fail
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    scanIdx: index('idx_compliance_scan').on(t.scanId),
  }),
);

export const suppressions = securitySchema.table(
  'suppressions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    ruleId: varchar('rule_id', { length: 64 }).notNull(),
    resource: varchar('resource', { length: 255 }),
    reason: text('reason').notNull(),
    createdBy: uuid('created_by').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('idx_suppressions_org').on(t.organizationId),
  }),
);

export const policies = securitySchema.table(
  'policies',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    name: varchar('name', { length: 128 }).notNull(),
    regoSource: text('rego_source').notNull(),
    severity: varchar('severity', { length: 12 }).notNull().default('high'),
    enabled: boolean('enabled').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('idx_policies_org').on(t.organizationId),
  }),
);

export type ScanRecord = typeof scans.$inferSelect;
export type FindingRecord = typeof findings.$inferSelect;
export type ComplianceResultRecord = typeof complianceResults.$inferSelect;
export type SuppressionRecord = typeof suppressions.$inferSelect;
export type PolicyRecord = typeof policies.$inferSelect;
