import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '../../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import { cloudAccounts, costGuardrails } from '../../../database/schema';

@Injectable()
export class CloudAccountRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async create(data: typeof cloudAccounts.$inferInsert) {
    const [row] = await this.db.insert(cloudAccounts).values(data).returning();
    return row;
  }

  async findById(id: string) {
    const [row] = await this.db
      .select()
      .from(cloudAccounts)
      .where(eq(cloudAccounts.id, id))
      .limit(1);
    return row || null;
  }

  async update(id: string, data: Partial<typeof cloudAccounts.$inferInsert>) {
    const [row] = await this.db
      .update(cloudAccounts)
      .set(data)
      .where(eq(cloudAccounts.id, id))
      .returning();
    return row;
  }

  async listForOrg(organizationId: string) {
    return this.db
      .select()
      .from(cloudAccounts)
      .where(eq(cloudAccounts.organizationId, organizationId))
      .orderBy(desc(cloudAccounts.createdAt));
  }

  async findGuardrail(organizationId: string) {
    const [row] = await this.db
      .select()
      .from(costGuardrails)
      .where(eq(costGuardrails.organizationId, organizationId))
      .limit(1);
    return row || null;
  }

  async upsertGuardrail(data: typeof costGuardrails.$inferInsert) {
    const existing = await this.findGuardrail(data.organizationId);
    if (existing) {
      const [row] = await this.db
        .update(costGuardrails)
        .set(data)
        .where(and(eq(costGuardrails.id, existing.id)))
        .returning();
      return row;
    }
    const [row] = await this.db.insert(costGuardrails).values(data).returning();
    return row;
  }
}
