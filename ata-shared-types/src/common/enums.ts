/**
 * Runtime-safe const-object enums.
 * Named with an "Enum" suffix to avoid clashing with the string union types
 * of the same name exported from user.types.ts and workspace.types.ts.
 */

export const SubscriptionTierEnum = {
  FREE: 'free',
  PRO: 'pro',
  TEAM: 'team',
  ENTERPRISE: 'enterprise',
} as const;

export const UserRoleEnum = {
  USER: 'user',
  ADMIN: 'admin',
} as const;

export const UserStatusEnum = {
  ACTIVE: 'active',
  SUSPENDED: 'suspended',
  DELETED: 'deleted',
} as const;

export const OAuthProviderEnum = {
  GOOGLE: 'google',
  GITHUB: 'github',
} as const;

export const WorkspaceRoleEnum = {
  OWNER: 'owner',
  EDITOR: 'editor',
  VIEWER: 'viewer',
} as const;

export const InvitationStatusEnum = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  EXPIRED: 'expired',
  REVOKED: 'revoked',
} as const;

// ─── Generation limits per subscription tier ──────────────────────────────────

export const GENERATION_LIMITS: Record<string, number> = {
  free: 50,
  pro: 1000,
  team: 5000,
  enterprise: 999999,
};
