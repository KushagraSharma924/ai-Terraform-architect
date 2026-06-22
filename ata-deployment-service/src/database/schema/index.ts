import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const deploymentSchema = pgSchema('deployment');

// A customer's connected cloud account. Secrets are NEVER stored here:
// for assume_role/oidc we keep only the role ARN + externalId and mint
// short-lived STS credentials at runtime (Phase 6 §10).
export const cloudAccounts = deploymentSchema.table(
  'cloud_accounts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(), // cross-cutting tenant key
    userId: uuid('user_id').notNull(), // logical FK → auth.users.id
    provider: varchar('provider', { length: 20 }).notNull().default('aws'), // 'aws'|'azure'|'gcp'
    authMethod: varchar('auth_method', { length: 20 }).notNull(), // 'assume_role'|'oidc'|'access_key'
    roleArn: varchar('role_arn', { length: 512 }),
    externalId: varchar('external_id', { length: 128 }), // unique per account, confused-deputy guard
    secretRef: varchar('secret_ref', { length: 512 }), // pointer into Vault/Secrets Mgr (never the secret)
    defaultRegion: varchar('default_region', { length: 32 }).notNull().default('us-east-1'),
    status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending'|'verified'|'failed'|'revoked'
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('idx_cloud_accounts_org').on(t.organizationId),
    userIdx: index('idx_cloud_accounts_user').on(t.userId),
  }),
);

export const deployments = deploymentSchema.table(
  'deployments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    cloudAccountId: uuid('cloud_account_id')
      .notNull()
      .references(() => cloudAccounts.id, { onDelete: 'restrict' }),
    projectVersionId: uuid('project_version_id').notNull(), // logical FK → terraform.terraform_versions.id
    environment: varchar('environment', { length: 32 }).notNull().default('dev'),
    state: varchar('state', { length: 30 }).notNull().default('queued'),
    planSummary: jsonb('plan_summary'), // { add, change, destroy }
    costEstimate: jsonb('cost_estimate'), // { monthlyUsd, currency, breakdown }
    stateVersion: integer('state_version'), // remote tf state serial
    requestedBy: uuid('requested_by').notNull(),
    approvedBy: uuid('approved_by'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('idx_deployments_org').on(t.organizationId),
    accountIdx: index('idx_deployments_account').on(t.cloudAccountId),
    stateIdx: index('idx_deployments_state').on(t.state),
  }),
);

// One row per plan/apply/destroy execution inside a sandboxed runner.
export const deploymentRuns = deploymentSchema.table(
  'deployment_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deploymentId: uuid('deployment_id')
      .notNull()
      .references(() => deployments.id, { onDelete: 'cascade' }),
    runType: varchar('run_type', { length: 20 }).notNull(), // 'plan'|'apply'|'destroy'
    status: varchar('status', { length: 20 }).notNull().default('running'), // 'running'|'succeeded'|'failed'
    exitCode: integer('exit_code'),
    logStorageKey: varchar('log_storage_key', { length: 1024 }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
  },
  (t) => ({
    deploymentIdx: index('idx_deployment_runs_deployment').on(t.deploymentId),
  }),
);

// Append-only event store — the authoritative audit trail of state transitions.
// Current deployment.state is a projection of these events.
export const deploymentEvents = deploymentSchema.table(
  'deployment_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deploymentId: uuid('deployment_id')
      .notNull()
      .references(() => deployments.id, { onDelete: 'cascade' }),
    fromState: varchar('from_state', { length: 30 }),
    toState: varchar('to_state', { length: 30 }).notNull(),
    event: varchar('event', { length: 50 }).notNull(),
    actor: uuid('actor'), // user id, or null for system
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    deploymentIdx: index('idx_deployment_events_deployment').on(t.deploymentId),
  }),
);

export const costGuardrails = deploymentSchema.table(
  'cost_guardrails',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    monthlyLimitUsd: integer('monthly_limit_usd'),
    perDeployLimitUsd: integer('per_deploy_limit_usd'),
    action: varchar('action', { length: 10 }).notNull().default('block'), // 'warn'|'block'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    orgIdx: index('idx_cost_guardrails_org').on(t.organizationId),
  }),
);

export type CloudAccountRecord = typeof cloudAccounts.$inferSelect;
export type DeploymentRecord = typeof deployments.$inferSelect;
export type DeploymentRunRecord = typeof deploymentRuns.$inferSelect;
export type DeploymentEventRecord = typeof deploymentEvents.$inferSelect;
export type CostGuardrailRecord = typeof costGuardrails.$inferSelect;
