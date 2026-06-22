import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '../../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import {
  inventorySnapshots,
  cloudResources,
  recommendations,
  conversations,
  messages,
} from '../../../database/schema';

@Injectable()
export class CloudOpsRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async createSnapshot(data: typeof inventorySnapshots.$inferInsert) {
    const [row] = await this.db.insert(inventorySnapshots).values(data).returning();
    return row;
  }

  async insertResources(rows: (typeof cloudResources.$inferInsert)[]) {
    if (rows.length === 0) return;
    await this.db.insert(cloudResources).values(rows);
  }

  async latestSnapshot(organizationId: string, cloudAccountId: string) {
    const [row] = await this.db
      .select()
      .from(inventorySnapshots)
      .where(
        and(
          eq(inventorySnapshots.organizationId, organizationId),
          eq(inventorySnapshots.cloudAccountId, cloudAccountId),
        ),
      )
      .orderBy(desc(inventorySnapshots.takenAt))
      .limit(1);
    return row || null;
  }

  async resourcesForSnapshot(snapshotId: string) {
    return this.db.select().from(cloudResources).where(eq(cloudResources.snapshotId, snapshotId));
  }

  async replaceRecommendations(
    organizationId: string,
    cloudAccountId: string,
    rows: (typeof recommendations.$inferInsert)[],
  ) {
    await this.db
      .delete(recommendations)
      .where(
        and(
          eq(recommendations.organizationId, organizationId),
          eq(recommendations.cloudAccountId, cloudAccountId),
          eq(recommendations.status, 'open'),
        ),
      );
    if (rows.length) await this.db.insert(recommendations).values(rows);
  }

  async listRecommendations(organizationId: string) {
    return this.db
      .select()
      .from(recommendations)
      .where(eq(recommendations.organizationId, organizationId))
      .orderBy(desc(recommendations.createdAt));
  }

  async dismissRecommendation(id: string) {
    await this.db.update(recommendations).set({ status: 'dismissed' }).where(eq(recommendations.id, id));
  }

  // conversations
  async createConversation(data: typeof conversations.$inferInsert) {
    const [row] = await this.db.insert(conversations).values(data).returning();
    return row;
  }

  async getConversation(id: string) {
    const [row] = await this.db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
    return row || null;
  }

  async listConversations(userId: string) {
    return this.db
      .select()
      .from(conversations)
      .where(eq(conversations.userId, userId))
      .orderBy(desc(conversations.createdAt));
  }

  async addMessage(data: typeof messages.$inferInsert) {
    const [row] = await this.db.insert(messages).values(data).returning();
    return row;
  }

  async listMessages(conversationId: string) {
    return this.db
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }
}
