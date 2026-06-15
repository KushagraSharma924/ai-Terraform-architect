import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  boolean,
  numeric,
  jsonb,
  index,
} from 'drizzle-orm/pg-core';

export const intentSchema = pgSchema('intent');

export const generations = intentSchema.table(
  'generations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),
    parentGenerationId: uuid('parent_generation_id').references((): any => generations.id, { onDelete: 'set null' }),
    versionNumber: integer('version_number').notNull().default(1),
    promptText: text('prompt_text').notNull(),
    promptHash: varchar('prompt_hash', { length: 64 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    cloudProviderHint: varchar('cloud_provider_hint', { length: 20 }),
    infrastructureSpec: jsonb('infrastructure_spec'),
    confidenceScore: numeric('confidence_score', { precision: 3, scale: 2 }),
    llmProvider: varchar('llm_provider', { length: 20 }),
    llmModel: varchar('llm_model', { length: 50 }),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    latencyMs: integer('latency_ms'),
    retryCount: integer('retry_count').notNull().default(0),
    errorCode: varchar('error_code', { length: 50 }),
    errorMessage: text('error_message'),
    errorDetails: jsonb('error_details'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    projectIdx: index('idx_generations_project').on(t.projectId),
    userIdx: index('idx_generations_user').on(t.userId),
    statusIdx: index('idx_generations_status').on(t.status),
    promptHashIdx: index('idx_generations_prompt_hash').on(t.promptHash),
  }),
);

export const promptTemplates = intentSchema.table(
  'prompt_templates',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 100 }).notNull(),
    version: varchar('version', { length: 10 }).notNull(),
    schemaVersion: varchar('schema_version', { length: 10 }).notNull(),
    templateText: text('template_text').notNull(),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    nameVersionUniq: index('uq_template_name_version').on(t.name, t.version),
  }),
);

export const llmCallLogs = intentSchema.table(
  'llm_call_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    generationId: uuid('generation_id')
      .notNull()
      .references(() => generations.id, { onDelete: 'cascade' }),
    attemptNumber: integer('attempt_number').notNull(),
    provider: varchar('provider', { length: 20 }).notNull(),
    model: varchar('model', { length: 50 }).notNull(),
    requestRedacted: jsonb('request_redacted'),
    responseRedacted: jsonb('response_redacted'),
    promptTokens: integer('prompt_tokens'),
    completionTokens: integer('completion_tokens'),
    latencyMs: integer('latency_ms'),
    validationErrors: jsonb('validation_errors'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    generationIdx: index('idx_llm_logs_generation').on(t.generationId),
  }),
);

export const intentDefaults = intentSchema.table(
  'intent_defaults',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fieldPath: varchar('field_path', { length: 255 }).notNull().unique(),
    cloudProvider: varchar('cloud_provider', { length: 20 }).notNull(),
    defaultValue: jsonb('default_value').notNull(),
    reason: text('reason'),
  },
  () => ({}),
);
