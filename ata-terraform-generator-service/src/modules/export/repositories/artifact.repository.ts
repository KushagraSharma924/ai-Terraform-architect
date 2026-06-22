import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '../../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, sql } from 'drizzle-orm';
import { terraformArtifacts } from '../../../database/schema';

@Injectable()
export class ArtifactRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async create(data: typeof terraformArtifacts.$inferInsert) {
    const [artifact] = await this.db.insert(terraformArtifacts).values(data).returning();
    return artifact;
  }

  async findById(id: string) {
    const [artifact] = await this.db
      .select()
      .from(terraformArtifacts)
      .where(eq(terraformArtifacts.id, id))
      .limit(1);
    return artifact || null;
  }

  /** Most recent ready artifact of a type for a version (download cache / dedup). */
  async findReady(versionId: string, type: string) {
    const [artifact] = await this.db
      .select()
      .from(terraformArtifacts)
      .where(
        and(
          eq(terraformArtifacts.terraformVersionId, versionId),
          eq(terraformArtifacts.type, type),
          eq(terraformArtifacts.status, 'ready'),
        ),
      )
      .orderBy(desc(terraformArtifacts.createdAt))
      .limit(1);
    return artifact || null;
  }

  async listForVersion(versionId: string) {
    return this.db
      .select()
      .from(terraformArtifacts)
      .where(eq(terraformArtifacts.terraformVersionId, versionId))
      .orderBy(desc(terraformArtifacts.createdAt));
  }

  async markReady(
    id: string,
    data: { storageKey: string; contentHash: string; sizeBytes: number; expiresAt: Date | null },
  ) {
    const [artifact] = await this.db
      .update(terraformArtifacts)
      .set({ ...data, status: 'ready', readyAt: new Date(), error: null })
      .where(eq(terraformArtifacts.id, id))
      .returning();
    return artifact;
  }

  async markFailed(id: string, error: string) {
    const [artifact] = await this.db
      .update(terraformArtifacts)
      .set({ status: 'failed', error })
      .where(eq(terraformArtifacts.id, id))
      .returning();
    return artifact;
  }

  async incrementDownloadCount(id: string) {
    await this.db
      .update(terraformArtifacts)
      .set({ downloadCount: sql`${terraformArtifacts.downloadCount} + 1` })
      .where(eq(terraformArtifacts.id, id));
  }
}
