import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gt } from 'drizzle-orm';
import { emailVerificationTokens } from '../../database/schema/email-verification-tokens.schema';
import { generateSecureToken, hashToken } from '../../common/utils/crypto.util';

export type EmailTokenType = 'verify_email' | 'reset_password';

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);
  private readonly transporter: nodemailer.Transporter;

  constructor(
    private readonly config: ConfigService,
    @InjectDrizzle() private readonly db: NodePgDatabase,
  ) {
    const smtp = this.config.get('app.smtp') as {
      host: string;
      port: number;
      secure: boolean;
      user?: string;
      pass?: string;
    };

    this.transporter = nodemailer.createTransport({
      host: smtp.host,
      port: smtp.port,
      secure: smtp.secure,
      auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    });
  }

  // ─── Token generation ──────────────────────────────────────────────────────

  async createToken(userId: string, type: EmailTokenType, ttlMinutes = 60): Promise<string> {
    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    await this.db.insert(emailVerificationTokens).values({
      userId,
      tokenHash,
      type,
      expiresAt,
    });

    return rawToken;
  }

  async validateAndConsume(
    rawToken: string,
    type: EmailTokenType,
  ): Promise<{ userId: string }> {
    const tokenHash = hashToken(rawToken);
    const now = new Date();

    const [record] = await this.db
      .select()
      .from(emailVerificationTokens)
      .where(
        and(
          eq(emailVerificationTokens.tokenHash, tokenHash),
          eq(emailVerificationTokens.type, type),
          gt(emailVerificationTokens.expiresAt, now),
        ),
      )
      .limit(1);

    if (!record || record.usedAt) {
      throw new BadRequestException({ error: 'INVALID_OR_EXPIRED_TOKEN' });
    }

    // Mark as used (single-use)
    await this.db
      .update(emailVerificationTokens)
      .set({ usedAt: now })
      .where(eq(emailVerificationTokens.id, record.id));

    return { userId: record.userId };
  }

  // ─── Email sending ─────────────────────────────────────────────────────────

  async sendVerificationEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.config.get<string>('app.frontendUrl');
    const verifyUrl = `${frontendUrl}/verify-email?token=${token}`;

    await this.transporter
      .sendMail({
        from: this.config.get<string>('app.smtp.from'),
        to: email,
        subject: 'Verify your Ata account',
        html: `
          <h1>Welcome to Ata!</h1>
          <p>Click the link below to verify your email address:</p>
          <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">
            Verify Email
          </a>
          <p>This link expires in 1 hour.</p>
          <p>If you didn't create an Ata account, you can safely ignore this email.</p>
        `,
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to send verification email', err);
      });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const frontendUrl = this.config.get<string>('app.frontendUrl');
    const resetUrl = `${frontendUrl}/reset-password?token=${token}`;

    await this.transporter
      .sendMail({
        from: this.config.get<string>('app.smtp.from'),
        to: email,
        subject: 'Reset your Ata password',
        html: `
          <h1>Password Reset Request</h1>
          <p>Click the link below to reset your password:</p>
          <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#6366f1;color:#fff;border-radius:6px;text-decoration:none;">
            Reset Password
          </a>
          <p>This link expires in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        `,
      })
      .catch((err: unknown) => {
        this.logger.error('Failed to send password reset email', err);
      });
  }
}
