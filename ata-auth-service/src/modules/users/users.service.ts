import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { users, type NewUserRecord, type UserRecord } from '../../database/schema/users.schema';

@Injectable()
export class UsersService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async findById(id: string): Promise<UserRecord | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async findByEmail(email: string): Promise<UserRecord | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);
    return user;
  }

  async findByOAuth(
    provider: string,
    oauthId: string,
  ): Promise<UserRecord | undefined> {
    const [user] = await this.db
      .select()
      .from(users)
      .where(eq(users.oauthId, oauthId))
      .limit(1);
    return user;
  }

  async create(data: NewUserRecord): Promise<UserRecord> {
    const existing = await this.findByEmail(data.email);
    if (existing) {
      throw new ConflictException({ error: 'EMAIL_ALREADY_EXISTS' });
    }

    const [created] = await this.db
      .insert(users)
      .values({ ...data, email: data.email.toLowerCase() })
      .returning();

    return created;
  }

  async markEmailVerified(id: string): Promise<void> {
    await this.db
      .update(users)
      .set({ emailVerified: true, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    await this.db
      .update(users)
      .set({ passwordHash, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async findOrCreateOAuthUser(data: {
    email: string;
    fullName: string;
    oauthProvider: string;
    oauthId: string;
  }): Promise<UserRecord> {
    // Try find by OAuth ID
    const byOAuth = await this.findByOAuth(data.oauthProvider, data.oauthId);
    if (byOAuth) return byOAuth;

    // Try find by email and link OAuth
    const byEmail = await this.findByEmail(data.email);
    if (byEmail) {
      const [updated] = await this.db
        .update(users)
        .set({
          oauthProvider: data.oauthProvider,
          oauthId: data.oauthId,
          emailVerified: true,
          updatedAt: new Date(),
        })
        .where(eq(users.id, byEmail.id))
        .returning();
      return updated;
    }

    // Create new OAuth user
    const [created] = await this.db
      .insert(users)
      .values({
        email: data.email.toLowerCase(),
        fullName: data.fullName,
        oauthProvider: data.oauthProvider,
        oauthId: data.oauthId,
        emailVerified: true, // OAuth emails are pre-verified
        role: 'user',
        subscriptionTier: 'free',
        status: 'active',
      })
      .returning();

    return created;
  }
}
