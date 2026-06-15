import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { refreshTokens } from '../../database/schema/refresh-tokens.schema';
import { generateSecureToken, hashToken } from '../../common/utils/crypto.util';
import type { JwtPayload } from '@ata/shared-types';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectDrizzle() private readonly db: NodePgDatabase,
  ) {}

  // ─── Access token ──────────────────────────────────────────────────────────

  issueAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
    return this.jwt.sign(payload, {
      algorithm: 'RS256',
      expiresIn: this.config.get<number>('app.jwt.accessTokenTtl') ?? 900,
    });
  }

  verifyAccessToken(token: string): JwtPayload {
    return this.jwt.verify<JwtPayload>(token, {
      algorithms: ['RS256'],
    });
  }

  // ─── Refresh token ─────────────────────────────────────────────────────────

  async issueRefreshToken(
    userId: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<string> {
    const rawToken = generateSecureToken(48);
    const tokenHash = hashToken(rawToken);
    const ttl = this.config.get<number>('app.jwt.refreshTokenTtl') ?? 604800;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    await this.db.insert(refreshTokens).values({
      userId,
      tokenHash,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt,
    });

    return rawToken;
  }

  async rotateRefreshToken(
    rawToken: string,
    meta: { userAgent?: string; ipAddress?: string },
  ): Promise<{ newRawToken: string; userId: string }> {
    const tokenHash = hashToken(rawToken);

    const [existing] = await this.db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.tokenHash, tokenHash))
      .limit(1);

    if (!existing) {
      throw new UnauthorizedException({ error: 'INVALID_REFRESH_TOKEN' });
    }
    if (existing.revoked) {
      // Reuse detected — revoke the entire chain as a security measure
      await this.revokeAllUserTokens(existing.userId);
      throw new UnauthorizedException({ error: 'REFRESH_TOKEN_REVOKED' });
    }
    if (existing.expiresAt < new Date()) {
      throw new UnauthorizedException({ error: 'INVALID_REFRESH_TOKEN' });
    }

    // Issue new token
    const newRawToken = generateSecureToken(48);
    const newTokenHash = hashToken(newRawToken);
    const ttl = this.config.get<number>('app.jwt.refreshTokenTtl') ?? 604800;
    const expiresAt = new Date(Date.now() + ttl * 1000);

    const [newRecord] = await this.db
      .insert(refreshTokens)
      .values({
        userId: existing.userId,
        tokenHash: newTokenHash,
        userAgent: meta.userAgent,
        ipAddress: meta.ipAddress,
        expiresAt,
      })
      .returning({ id: refreshTokens.id });

    // Revoke old token, link replacedBy
    await this.db
      .update(refreshTokens)
      .set({ revoked: true, revokedAt: new Date(), replacedBy: newRecord.id })
      .where(eq(refreshTokens.id, existing.id));

    return { newRawToken, userId: existing.userId };
  }

  async revokeRefreshToken(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    await this.db
      .update(refreshTokens)
      .set({ revoked: true, revokedAt: new Date() })
      .where(eq(refreshTokens.tokenHash, tokenHash));
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    await this.db
      .update(refreshTokens)
      .set({ revoked: true, revokedAt: new Date() })
      .where(and(eq(refreshTokens.userId, userId), eq(refreshTokens.revoked, false)));
  }
}
