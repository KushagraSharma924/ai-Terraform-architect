import { pgSchema, uuid, varchar, boolean, timestamp, jsonb, index, unique } from 'drizzle-orm/pg-core';

export const authSchema = pgSchema('auth');

export const users = authSchema.table(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: varchar('password_hash', { length: 255 }), // NULL for OAuth-only users
    fullName: varchar('full_name', { length: 255 }).notNull(),
    role: varchar('role', { length: 20 }).notNull().default('user'),
    subscriptionTier: varchar('subscription_tier', { length: 20 }).notNull().default('free'),
    emailVerified: boolean('email_verified').notNull().default(false),
    oauthProvider: varchar('oauth_provider', { length: 20 }),
    oauthId: varchar('oauth_id', { length: 255 }),
    status: varchar('status', { length: 20 }).notNull().default('active'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index('idx_users_email').on(t.email),
    oauthIdx: index('idx_users_oauth').on(t.oauthProvider, t.oauthId),
    oauthUniq: unique('uq_oauth').on(t.oauthProvider, t.oauthId),
  }),
);

export type UserRecord = typeof users.$inferSelect;
export type NewUserRecord = typeof users.$inferInsert;
