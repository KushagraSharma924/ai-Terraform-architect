import type { PublicUser, UserRole, SubscriptionTier } from './user.types';

// ─── Token pair ───────────────────────────────────────────────────────────────

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

// ─── JWT payload (decoded claims) ─────────────────────────────────────────────

export interface JwtPayload {
  /** Subject — the user's UUID */
  sub: string;
  email: string;
  role: UserRole;
  subscriptionTier: SubscriptionTier;
  iat: number;
  exp: number;
}

// ─── Request / Response DTOs (used by frontend & services) ───────────────────

export interface RegisterDto {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface RefreshTokenDto {
  refreshToken: string;
}

export interface VerifyEmailDto {
  token: string;
}

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  token: string;
  newPassword: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: PublicUser & { role: UserRole; subscriptionTier: SubscriptionTier };
}

// ─── Internal token validation (gateway → auth-service) ──────────────────────

export interface ValidateTokenRequest {
  token: string;
}

export interface ValidateTokenResponse {
  valid: boolean;
  userId?: string;
  role?: UserRole;
}
