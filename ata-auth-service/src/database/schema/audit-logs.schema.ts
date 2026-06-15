import { pgSchema, uuid, varchar, timestamp, jsonb, index } from 'drizzle-orm/pg-core';
import { users, authSchema } from './users.schema';

export const auditLogs = authSchema.table(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    action: varchar('action', { length: 100 }).notNull(),
    metadata: jsonb('metadata'),
    ipAddress: varchar('ip_address', { length: 45 }),
    userAgent: varchar('user_agent', { length: 512 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('idx_auth_audit_user').on(t.userId),
    createdIdx: index('idx_auth_audit_created').on(t.createdAt),
  }),
);

export type AuditLogRecord = typeof auditLogs.$inferSelect;
export type NewAuditLogRecord = typeof auditLogs.$inferInsert;
