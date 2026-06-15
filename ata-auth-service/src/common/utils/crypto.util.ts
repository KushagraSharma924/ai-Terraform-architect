import { randomBytes, createHash } from 'crypto';

/**
 * Generate a cryptographically secure random token of `bytes` length.
 * Returns the token as a hex string.
 */
export function generateSecureToken(bytes = 32): string {
  return randomBytes(bytes).toString('hex');
}

/**
 * Hash a token string with SHA-256.
 * We store the hash in the DB so raw tokens are never persisted.
 */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
