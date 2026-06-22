import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  integer,
  text,
  jsonb,
  index,
  date,
  numeric,
} from 'drizzle-orm/pg-core';

export const cloudopsSchema = pgSchema('cloudops');

export const inventorySnapshots = cloudopsSchema.table(
  'inventory_snapshots',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    cloudAccountId: uuid('cloud_account_id').notNull(),
    resourceCount: integer('resource_count').notNull().default(0),
    status: varchar('status', { length: 20 }).notNull().default('completed'),
    takenAt: timestamp('taken_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index('idx_inv_snap_org').on(t.organizationId) }),
);

export const cloudResources = cloudopsSchema.table(
  'cloud_resources',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    snapshotId: uuid('snapshot_id')
      .notNull()
      .references(() => inventorySnapshots.id, { onDelete: 'cascade' }),
    organizationId: uuid('organization_id').notNull(),
    service: varchar('service', { length: 20 }).notNull(), // ec2|rds|s3|iam
    resourceId: varchar('resource_id', { length: 255 }).notNull(),
    region: varchar('region', { length: 32 }),
    type: varchar('type', { length: 64 }),
    state: varchar('state', { length: 32 }),
    monthlyCost: numeric('monthly_cost', { precision: 10, scale: 2 }),
    tags: jsonb('tags'),
    config: jsonb('config'),
    discoveredAt: timestamp('discovered_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    snapIdx: index('idx_cloud_res_snap').on(t.snapshotId),
    serviceIdx: index('idx_cloud_res_service').on(t.service),
  }),
);

export const costRecords = cloudopsSchema.table(
  'cost_records',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    cloudAccountId: uuid('cloud_account_id').notNull(),
    service: varchar('service', { length: 40 }).notNull(),
    usageDate: date('usage_date').notNull(),
    amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
    currency: varchar('currency', { length: 8 }).notNull().default('USD'),
  },
  (t) => ({
    orgDateIdx: index('idx_cost_org_date').on(t.organizationId, t.usageDate),
  }),
);

export const recommendations = cloudopsSchema.table(
  'recommendations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    cloudAccountId: uuid('cloud_account_id').notNull(),
    category: varchar('category', { length: 20 }).notNull(), // cost|waste|health|security
    severity: varchar('severity', { length: 12 }).notNull(),
    resourceRef: varchar('resource_ref', { length: 255 }),
    title: varchar('title', { length: 255 }).notNull(),
    rationale: text('rationale').notNull(),
    estSavings: numeric('est_savings', { precision: 10, scale: 2 }),
    status: varchar('status', { length: 12 }).notNull().default('open'), // open|dismissed|applied
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index('idx_recs_org').on(t.organizationId) }),
);

export const conversations = cloudopsSchema.table('conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  userId: uuid('user_id').notNull(),
  cloudAccountId: uuid('cloud_account_id').notNull(),
  title: varchar('title', { length: 255 }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const messages = cloudopsSchema.table(
  'messages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    conversationId: uuid('conversation_id')
      .notNull()
      .references(() => conversations.id, { onDelete: 'cascade' }),
    role: varchar('role', { length: 12 }).notNull(), // user|assistant
    content: text('content').notNull(),
    citations: jsonb('citations'), // grounding refs (resource ids, metrics)
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ convIdx: index('idx_messages_conv').on(t.conversationId) }),
);

export type CloudResourceRecord = typeof cloudResources.$inferSelect;
export type CostRecord = typeof costRecords.$inferSelect;
export type RecommendationRecord = typeof recommendations.$inferSelect;
export type ConversationRecord = typeof conversations.$inferSelect;
export type MessageRecord = typeof messages.$inferSelect;
