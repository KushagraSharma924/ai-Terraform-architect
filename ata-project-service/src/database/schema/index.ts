import { pgSchema, uuid, varchar, timestamp, index, uniqueIndex, integer, primaryKey, unique } from 'drizzle-orm/pg-core';

export const projectsSchema = pgSchema('projects');

export const workspaces = projectsSchema.table(
  'workspaces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    slug: varchar('slug', { length: 255 }).notNull().unique(),
    ownerId: uuid('owner_id').notNull(), // logical FK → auth.users.id
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index('idx_workspaces_owner').on(t.ownerId),
    slugIdx: uniqueIndex('idx_workspaces_slug').on(t.slug),
  }),
);

export const workspaceMembers = projectsSchema.table(
  'workspace_members',
  {
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    userId: uuid('user_id').notNull(), // logical FK → auth.users.id
    role: varchar('role', { length: 20 }).notNull().default('viewer'),
    invitedBy: uuid('invited_by'), // logical FK → auth.users.id
    joinedAt: timestamp('joined_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('idx_wm_user').on(t.userId),
    pk: primaryKey({ name: 'workspace_members_pkey', columns: [t.workspaceId, t.userId] }),
  }),
);

export const workspaceInvitations = projectsSchema.table(
  'workspace_invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('viewer'),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    invitedBy: uuid('invited_by').notNull(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('idx_wi_workspace').on(t.workspaceId),
    emailIdx: index('idx_wi_email').on(t.email),
  }),
);

export const projects = projectsSchema.table(
  'projects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    workspaceId: uuid('workspace_id')
      .notNull()
      .references(() => workspaces.id, { onDelete: 'cascade' }),
    name: varchar('name', { length: 255 }).notNull(),
    description: varchar('description', { length: 2048 }),
    createdBy: uuid('created_by').notNull(), // logical FK → auth.users.id
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index('idx_projects_workspace').on(t.workspaceId),
    nameUniq: unique('uq_project_name_per_workspace').on(t.workspaceId, t.name),
  }),
);

export const usageQuotas = projectsSchema.table(
  'usage_quotas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull(), // logical FK → auth.users.id
    periodStart: timestamp('period_start', { withTimezone: true }).notNull(),
    periodEnd: timestamp('period_end', { withTimezone: true }).notNull(),
    generationsUsed: integer('generations_used').notNull().default(0),
    generationsLimit: integer('generations_limit').notNull(),
    tier: varchar('tier', { length: 20 }).notNull(),
  },
  (t) => ({
    userIdx: index('idx_usage_user').on(t.userId),
    periodUniq: unique('uq_user_period').on(t.userId, t.periodStart, t.periodEnd),
  }),
);

export type WorkspaceRecord = typeof workspaces.$inferSelect;
export type NewWorkspaceRecord = typeof workspaces.$inferInsert;
export type WorkspaceMemberRecord = typeof workspaceMembers.$inferSelect;
export type NewWorkspaceMemberRecord = typeof workspaceMembers.$inferInsert;
export type WorkspaceInvitationRecord = typeof workspaceInvitations.$inferSelect;
export type ProjectRecord = typeof projects.$inferSelect;
export type NewProjectRecord = typeof projects.$inferInsert;
export type UsageQuotaRecord = typeof usageQuotas.$inferSelect;
