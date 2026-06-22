import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  boolean,
  jsonb,
  index,
  ForeignKey,
} from 'drizzle-orm/pg-core';

export const terraformSchema = pgSchema('terraform');

export const terraformProjects = terraformSchema.table(
  'terraform_projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    generationId: uuid('generation_id').notNull(),
    projectId: uuid('project_id').notNull(),
    userId: uuid('user_id').notNull(),
    cloudProvider: varchar('cloud_provider', { length: 20 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    currentVersionId: uuid('current_version_id'),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    generationIdx: index('idx_tfprojects_generation').on(t.generationId),
    projectIdx: index('idx_tfprojects_project').on(t.projectId),
  })
);

export const terraformVersions = terraformSchema.table(
  'terraform_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    terraformProjectId: uuid('terraform_project_id')
      .notNull()
      .references((): any => terraformProjects.id, { onDelete: 'cascade' }),
    generationId: uuid('generation_id').notNull(),
    versionNumber: integer('version_number').notNull(),
    specSnapshot: jsonb('spec_snapshot').notNull(),
    moduleVersionsUsed: jsonb('module_versions_used').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    validationPassed: boolean('validation_passed'),
    fileCount: integer('file_count'),
    totalSizeBytes: integer('total_size_bytes'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp('completed_at', { withTimezone: true }),
  },
  (t) => ({
    projectIdx: index('idx_tfversions_project').on(t.terraformProjectId),
    generationIdx: index('idx_tfversions_generation').on(t.generationId),
  })
);

export const terraformFiles = terraformSchema.table(
  'terraform_files',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    terraformVersionId: uuid('terraform_version_id')
      .notNull()
      .references((): any => terraformVersions.id, { onDelete: 'cascade' }),
    filePath: varchar('file_path', { length: 1024 }).notNull(),
    fileType: varchar('file_type', { length: 20 }).notNull(), // 'root_config'|'module_file'|'readme'|'tfvars'
    content: text('content').notNull(),
    checksum: varchar('checksum', { length: 64 }).notNull(), // sha256
    sizeBytes: integer('size_bytes').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    versionIdx: index('idx_tffiles_version').on(t.terraformVersionId),
  })
);

export const generationLogs = terraformSchema.table(
  'generation_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    terraformVersionId: uuid('terraform_version_id')
      .notNull()
      .references((): any => terraformVersions.id, { onDelete: 'cascade' }),
    stage: varchar('stage', { length: 50 }).notNull(), // 'provider_mapping'|'module_resolution'|'variable_mapping'|'template_rendering'|'module_copy'|'validation'|'persistence'
    level: varchar('level', { length: 10 }).notNull(), // 'info'|'warning'|'error'
    message: text('message').notNull(),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    versionIdx: index('idx_genlogs_version').on(t.terraformVersionId),
    levelIdx: index('idx_genlogs_level').on(t.level),
  })
);

export const validationResults = terraformSchema.table(
  'validation_results',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    terraformVersionId: uuid('terraform_version_id')
      .notNull()
      .references((): any => terraformVersions.id, { onDelete: 'cascade' }),
    tool: varchar('tool', { length: 30 }).notNull(), // 'terraform_fmt'|'terraform_validate'|'tflint'|'tfsec'|'checkov'|'infracost'
    status: varchar('status', { length: 20 }).notNull(), // 'pass'|'fail'|'warning'
    rawOutput: jsonb('raw_output'),
    summary: text('summary'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    versionIdx: index('idx_validation_version').on(t.terraformVersionId),
  })
);

// Phase 5 — Project Export & Versioning.
// One row per requested export artifact (zip | validation_json | pdf) for a version.
// Append-only + content-addressed (sha256) so identical content is deduped/cached.
export const terraformArtifacts = terraformSchema.table(
  'terraform_artifacts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    terraformVersionId: uuid('terraform_version_id')
      .notNull()
      .references((): any => terraformVersions.id, { onDelete: 'cascade' }),
    type: varchar('type', { length: 20 }).notNull(), // 'zip'|'validation_json'|'pdf'
    status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending'|'ready'|'failed'
    storageKey: varchar('storage_key', { length: 1024 }), // path/key in StoragePort
    contentHash: varchar('content_hash', { length: 64 }), // sha256 of artifact bytes
    sizeBytes: integer('size_bytes'),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    error: text('error'),
    downloadCount: integer('download_count').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    readyAt: timestamp('ready_at', { withTimezone: true }),
    expiresAt: timestamp('expires_at', { withTimezone: true }),
  },
  (t) => ({
    versionIdx: index('idx_tfartifacts_version').on(t.terraformVersionId),
    hashIdx: index('idx_tfartifacts_hash').on(t.contentHash),
    statusIdx: index('idx_tfartifacts_status').on(t.status),
  })
);

export const moduleRegistry = terraformSchema.table(
  'module_registry',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    provider: varchar('provider', { length: 20 }).notNull(), // 'aws'|'azure'|'gcp'
    category: varchar('category', { length: 30 }).notNull(), // 'networking'|'compute'|'database'|'loadbalancing'|'security'|'storage'|'iam'
    name: varchar('name', { length: 100 }).notNull(), // 'vpc', 'ec2-asg', 'rds-postgresql'
    version: varchar('version', { length: 20 }).notNull(), // semver
    sourcePath: varchar('source_path', { length: 255 }).notNull(),
    status: varchar('status', { length: 20 }).notNull().default('active'), // 'active'|'deprecated'|'retired'
    requiredVariables: jsonb('required_variables').notNull(),
    optionalVariables: jsonb('optional_variables'),
    outputs: jsonb('outputs').notNull(),
    dependsOn: jsonb('depends_on'),
    supportedIntentKeys: jsonb('supported_intent_keys'),
    releasedAt: timestamp('released_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    lookupIdx: index('idx_module_registry_lookup').on(t.provider, t.category, t.name, t.status),
  })
);
