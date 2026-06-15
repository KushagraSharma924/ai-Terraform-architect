import { pgSchema, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';
import { users, authSchema } from './users.schema';

export const emailVerificationTokens = authSchema.table(
  'email_verification_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: varchar('token_hash', { length: 255 }).notNull().unique(),
    type: varchar('type', { length: 20 }).notNull(), // 'verify_email' | 'reset_password'
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index('idx_evt_user').on(t.userId),
  }),
);

export type EmailVerificationTokenRecord = typeof emailVerificationTokens.$inferSelect;
export type NewEmailVerificationTokenRecord = typeof emailVerificationTokens.$inferInsert;
