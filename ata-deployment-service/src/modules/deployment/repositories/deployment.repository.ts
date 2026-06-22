import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '../../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, desc } from 'drizzle-orm';
import { deployments, deploymentRuns, deploymentEvents } from '../../../database/schema';

@Injectable()
export class DeploymentRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async create(data: typeof deployments.$inferInsert) {
    const [row] = await this.db.insert(deployments).values(data).returning();
    return row;
  }

  async findById(id: string) {
    const [row] = await this.db.select().from(deployments).where(eq(deployments.id, id)).limit(1);
    return row || null;
  }

  async update(id: string, data: Partial<typeof deployments.$inferInsert>) {
    const [row] = await this.db
      .update(deployments)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(deployments.id, id))
      .returning();
    return row;
  }

  async listForAccount(cloudAccountId: string) {
    return this.db
      .select()
      .from(deployments)
      .where(eq(deployments.cloudAccountId, cloudAccountId))
      .orderBy(desc(deployments.createdAt));
  }

  // --- runs ---
  async createRun(data: typeof deploymentRuns.$inferInsert) {
    const [row] = await this.db.insert(deploymentRuns).values(data).returning();
    return row;
  }

  async finishRun(id: string, data: Partial<typeof deploymentRuns.$inferInsert>) {
    const [row] = await this.db
      .update(deploymentRuns)
      .set({ ...data, finishedAt: new Date() })
      .where(eq(deploymentRuns.id, id))
      .returning();
    return row;
  }

  async listRuns(deploymentId: string) {
    return this.db
      .select()
      .from(deploymentRuns)
      .where(eq(deploymentRuns.deploymentId, deploymentId))
      .orderBy(desc(deploymentRuns.startedAt));
  }

  // --- events (append-only audit) ---
  async appendEvent(data: typeof deploymentEvents.$inferInsert) {
    const [row] = await this.db.insert(deploymentEvents).values(data).returning();
    return row;
  }

  async listEvents(deploymentId: string) {
    return this.db
      .select()
      .from(deploymentEvents)
      .where(eq(deploymentEvents.deploymentId, deploymentId))
      .orderBy(deploymentEvents.createdAt);
  }
}
