import * as argon2 from 'argon2';

/**
 * Hash a plain-text password using argon2id.
 * Never store the raw password.
 */
export async function hashPassword(plaintext: string): Promise<string> {
  return argon2.hash(plaintext, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MiB
    timeCost: 3,
    parallelism: 1,
  });
}

/**
 * Verify a plain-text password against an argon2 hash.
 */
export async function verifyPassword(hash: string, plaintext: string): Promise<boolean> {
  return argon2.verify(hash, plaintext);
}
