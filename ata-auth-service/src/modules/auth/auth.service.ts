import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { UsersService } from '../users/users.service';
import { TokenService } from '../token/token.service';
import { EmailVerificationService } from '../email-verification/email-verification.service';
import { hashPassword, verifyPassword } from '../../common/utils/hash.util';
import { auditLogs } from '../../database/schema/audit-logs.schema';
import type { RegisterDto } from './dto/register.dto';
import type { LoginDto } from './dto/login.dto';
import type { UserRecord } from '../../database/schema/users.schema';

export interface AuthTokenPair {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: string;
    subscriptionTier: string;
  };
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly users: UsersService,
    private readonly tokens: TokenService,
    private readonly emailVerification: EmailVerificationService,
    @InjectDrizzle() private readonly db: NodePgDatabase,
  ) {}

  // ─── Register ──────────────────────────────────────────────────────────────

  async register(
    dto: RegisterDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ user: Omit<UserRecord, 'passwordHash'>; message: string }> {
    const passwordHash = await hashPassword(dto.password);

    const user = await this.users.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      role: 'user',
      subscriptionTier: 'free',
      status: 'active',
      emailVerified: false,
    });

    // Send verification email
    const verifyToken = await this.emailVerification.createToken(user.id, 'verify_email', 60);
    await this.emailVerification.sendVerificationEmail(user.email, verifyToken);

    await this.logAudit(user.id, 'register', meta);

    const { passwordHash: _ph, ...publicUser } = user;
    return { user: publicUser, message: 'Verification email sent' };
  }

  // ─── Login ─────────────────────────────────────────────────────────────────

  async login(
    dto: LoginDto,
    meta: { ip?: string; userAgent?: string },
  ): Promise<AuthTokenPair> {
    const user = await this.users.findByEmail(dto.email);

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException({ error: 'INVALID_CREDENTIALS' });
    }

    const valid = await verifyPassword(user.passwordHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException({ error: 'INVALID_CREDENTIALS' });
    }

    if (!user.emailVerified) {
      throw new ForbiddenException({ error: 'EMAIL_NOT_VERIFIED' });
    }

    if (user.status === 'suspended') {
      throw new ForbiddenException({ error: 'ACCOUNT_SUSPENDED' });
    }

    if (user.status === 'deleted') {
      throw new UnauthorizedException({ error: 'INVALID_CREDENTIALS' });
    }

    const tokenPair = await this.issueTokenPair(user, meta);
    await this.logAudit(user.id, 'login', meta);
    return tokenPair;
  }

  // ─── Logout ────────────────────────────────────────────────────────────────

  async logout(refreshToken: string, userId: string, meta: { ip?: string; userAgent?: string }): Promise<void> {
    await this.tokens.revokeRefreshToken(refreshToken);
    await this.logAudit(userId, 'logout', meta);
  }

  // ─── Refresh ───────────────────────────────────────────────────────────────

  async refresh(
    rawRefreshToken: string,
    meta: { ip?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const { newRawToken, userId } = await this.tokens.rotateRefreshToken(rawRefreshToken, meta);

    const user = await this.users.findById(userId);
    if (!user) {
      throw new UnauthorizedException({ error: 'INVALID_REFRESH_TOKEN' });
    }

    const accessToken = this.tokens.issueAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as any,
      subscriptionTier: user.subscriptionTier as any,
    });

    await this.logAudit(userId, 'token_refresh', meta);
    return { accessToken, refreshToken: newRawToken };
  }

  // ─── Email verification ────────────────────────────────────────────────────

  async verifyEmail(token: string): Promise<{ message: string }> {
    const { userId } = await this.emailVerification.validateAndConsume(token, 'verify_email');
    await this.users.markEmailVerified(userId);
    return { message: 'Email verified successfully' };
  }

  // ─── Forgot / reset password ───────────────────────────────────────────────

  async forgotPassword(email: string): Promise<{ message: string }> {
    const user = await this.users.findByEmail(email);
    // Always return 200 to prevent email enumeration
    if (user) {
      const token = await this.emailVerification.createToken(user.id, 'reset_password', 60);
      await this.emailVerification.sendPasswordResetEmail(user.email, token);
    }
    return { message: 'If account exists, reset email sent' };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ message: string }> {
    const { userId } = await this.emailVerification.validateAndConsume(token, 'reset_password');
    const passwordHash = await hashPassword(newPassword);
    await this.users.updatePassword(userId, passwordHash);
    // Revoke all refresh tokens for security
    await this.tokens.revokeAllUserTokens(userId);
    return { message: 'Password reset successfully' };
  }

  // ─── OAuth ─────────────────────────────────────────────────────────────────

  async oauthLogin(data: {
    email: string;
    fullName: string;
    oauthProvider: string;
    oauthId: string;
  }): Promise<AuthTokenPair> {
    const user = await this.users.findOrCreateOAuthUser(data);
    return this.issueTokenPair(user, {});
  }

  // ─── Internal token validation ─────────────────────────────────────────────

  validateToken(token: string): { valid: boolean; userId?: string; role?: string } {
    try {
      const payload = this.tokens.verifyAccessToken(token);
      return { valid: true, userId: payload.sub, role: payload.role };
    } catch {
      return { valid: false };
    }
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private async issueTokenPair(
    user: UserRecord,
    meta: { ip?: string; userAgent?: string },
  ): Promise<AuthTokenPair> {
    const accessToken = this.tokens.issueAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role as any,
      subscriptionTier: user.subscriptionTier as any,
    });

    const refreshToken = await this.tokens.issueRefreshToken(user.id, {
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        subscriptionTier: user.subscriptionTier,
      },
    };
  }

  private async logAudit(
    userId: string | null,
    action: string,
    meta: { ip?: string; userAgent?: string; metadata?: Record<string, unknown> },
  ): Promise<void> {
    try {
      await this.db.insert(auditLogs).values({
        userId: userId ?? undefined,
        action,
        ipAddress: meta.ip,
        userAgent: meta.userAgent,
        metadata: meta.metadata ?? null,
      });
    } catch (err) {
      this.logger.warn(`Failed to write audit log for action ${action}`, err);
    }
  }
}
