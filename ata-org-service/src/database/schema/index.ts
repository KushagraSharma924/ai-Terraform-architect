import {
  pgSchema,
  uuid,
  varchar,
  timestamp,
  text,
  jsonb,
  integer,
  boolean,
  index,
  primaryKey,
  inet,
} from 'drizzle-orm/pg-core';

export const orgSchema = pgSchema('org');

export const organizations = orgSchema.table('organizations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  plan: varchar('plan', { length: 20 }).notNull().default('free'),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = orgSchema.table(
  'organization_members',
  {
    organizationId: uuid('organization_id')
      .notNull()
      .references(() => organizations.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: varchar('role', { length: 20 }).notNull().default('member'), // owner|admin|member|viewer|billing
    status: varchar('status', { length: 16 }).notNull().default('active'), // active|invited
    invitedBy: uuid('invited_by'),
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ name: 'org_members_pkey', columns: [t.organizationId, t.userId] }),
    userIdx: index('idx_org_members_user').on(t.userId),
  }),
);

export const teams = orgSchema.table('teams', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id')
    .notNull()
    .references(() => organizations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const teamMembers = orgSchema.table(
  'team_members',
  {
    teamId: uuid('team_id')
      .notNull()
      .references(() => teams.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(),
    role: varchar('role', { length: 20 }).notNull().default('member'),
  },
  (t) => ({ pk: primaryKey({ name: 'team_members_pkey', columns: [t.teamId, t.userId] }) }),
);

export const comments = orgSchema.table(
  'comments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    projectId: uuid('project_id').notNull(),
    parentId: uuid('parent_id'),
    authorId: uuid('author_id').notNull(),
    body: text('body').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ projectIdx: index('idx_comments_project').on(t.projectId) }),
);

export const approvalPolicies = orgSchema.table('approval_policies', {
  id: uuid('id').primaryKey().defaultRandom(),
  organizationId: uuid('organization_id').notNull(),
  projectId: uuid('project_id'), // null = org-wide
  requiredApprovers: integer('required_approvers').notNull().default(1),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const deploymentApprovals = orgSchema.table(
  'deployment_approvals',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    deploymentId: uuid('deployment_id').notNull(),
    approverId: uuid('approver_id').notNull(),
    decision: varchar('decision', { length: 12 }).notNull(), // approved|rejected
    comment: text('comment'),
    decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ deployIdx: index('idx_deploy_approvals_deployment').on(t.deploymentId) }),
);

// Append-only audit trail.
export const auditLogs = orgSchema.table(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    actorId: uuid('actor_id'),
    action: varchar('action', { length: 64 }).notNull(),
    targetType: varchar('target_type', { length: 40 }),
    targetId: varchar('target_id', { length: 128 }),
    metadata: jsonb('metadata'),
    ip: inet('ip'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index('idx_audit_org').on(t.organizationId, t.createdAt) }),
);

export const activityEvents = orgSchema.table(
  'activity_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    projectId: uuid('project_id'),
    actorId: uuid('actor_id'),
    type: varchar('type', { length: 64 }).notNull(),
    payload: jsonb('payload'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ orgIdx: index('idx_activity_org').on(t.organizationId, t.createdAt) }),
);

export const notifications = orgSchema.table(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    organizationId: uuid('organization_id').notNull(),
    userId: uuid('user_id').notNull(),
    channel: varchar('channel', { length: 16 }).notNull().default('in_app'),
    type: varchar('type', { length: 64 }).notNull(),
    payload: jsonb('payload'),
    readAt: timestamp('read_at', { withTimezone: true }),
    status: varchar('status', { length: 16 }).notNull().default('sent'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({ userIdx: index('idx_notifications_user').on(t.userId) }),
);

export type OrganizationRecord = typeof organizations.$inferSelect;
export type OrganizationMemberRecord = typeof organizationMembers.$inferSelect;
export type TeamRecord = typeof teams.$inferSelect;
export type CommentRecord = typeof comments.$inferSelect;
export type AuditLogRecord = typeof auditLogs.$inferSelect;
export type NotificationRecord = typeof notifications.$inferSelect;
