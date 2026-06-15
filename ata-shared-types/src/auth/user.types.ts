// ─── Primitive union types ────────────────────────────────────────────────────

export type SubscriptionTier = 'free' | 'pro' | 'team' | 'enterprise';
export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'suspended' | 'deleted';
export type OAuthProvider = 'google' | 'github';

// ─── Full user record (internal) ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  emailVerified: boolean;
  status: UserStatus;
  oauthProvider?: OAuthProvider;
  createdAt: string; // ISO-8601
  updatedAt: string; // ISO-8601
}

// ─── Reduced user record for public / cross-service use ───────────────────────

export interface PublicUser {
  id: string;
  email: string;
  fullName: string;
}
