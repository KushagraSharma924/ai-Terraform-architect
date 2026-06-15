import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, gt } from 'drizzle-orm';
import { usageQuotas } from '../../database/schema';

const GENERATION_LIMITS: Record<string, number> = {
  free: 50,
  pro: 1000,
  team: 5000,
  enterprise: 999999,
};

@Injectable()
export class UsageService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async getOrInitQuota(userId: string, tier: string) {
    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const [existing] = await this.db
      .select()
      .from(usageQuotas)
      .where(
        and(
          eq(usageQuotas.userId, userId),
          gt(usageQuotas.periodEnd, now),
        ),
      )
      .limit(1);

    if (existing) return existing;

    const limit = GENERATION_LIMITS[tier] ?? GENERATION_LIMITS.free;

    const [created] = await this.db
      .insert(usageQuotas)
      .values({
        userId,
        periodStart,
        periodEnd,
        generationsLimit: String(limit) as any,
        generationsUsed: '0' as any,
        tier,
      })
      .onConflictDoNothing()
      .returning();

    return created ?? existing;
  }

  async getQuota(userId: string, tier: string) {
    const quota = await this.getOrInitQuota(userId, tier);
    const limit = GENERATION_LIMITS[quota?.tier ?? tier] ?? GENERATION_LIMITS.free;

    return {
      tier: quota?.tier ?? tier,
      generationsUsed: Number(quota?.generationsUsed ?? 0),
      generationsLimit: limit,
      periodStart: quota?.periodStart?.toISOString(),
      periodEnd: quota?.periodEnd?.toISOString(),
    };
  }
}
