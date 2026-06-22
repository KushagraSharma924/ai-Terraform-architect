import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '../../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc, isNull, gt, or } from 'drizzle-orm';
import {
  scans,
  findings,
  complianceResults,
  suppressions,
} from '../../../database/schema';

@Injectable()
export class ScanRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  async createScan(data: typeof scans.$inferInsert) {
    const [row] = await this.db.insert(scans).values(data).returning();
    return row;
  }

  async findScan(id: string) {
    const [row] = await this.db.select().from(scans).where(eq(scans.id, id)).limit(1);
    return row || null;
  }

  async updateScan(id: string, data: Partial<typeof scans.$inferInsert>) {
    const [row] = await this.db.update(scans).set(data).where(eq(scans.id, id)).returning();
    return row;
  }

  async latestForTarget(targetType: string, targetId: string) {
    const [row] = await this.db
      .select()
      .from(scans)
      .where(and(eq(scans.targetType, targetType), eq(scans.targetId, targetId)))
      .orderBy(desc(scans.startedAt))
      .limit(1);
    return row || null;
  }

  async insertFindings(rows: (typeof findings.$inferInsert)[]) {
    if (rows.length === 0) return;
    await this.db.insert(findings).values(rows);
  }

  async listFindings(scanId: string) {
    return this.db
      .select()
      .from(findings)
      .where(eq(findings.scanId, scanId))
      .orderBy(findings.severity);
  }

  async insertComplianceResults(rows: (typeof complianceResults.$inferInsert)[]) {
    if (rows.length === 0) return;
    await this.db.insert(complianceResults).values(rows);
  }

  async listCompliance(scanId: string, framework?: string) {
    const where = framework
      ? and(eq(complianceResults.scanId, scanId), eq(complianceResults.framework, framework))
      : eq(complianceResults.scanId, scanId);
    return this.db.select().from(complianceResults).where(where);
  }

  /** Active (non-expired) suppressions for an org — used to mute findings. */
  async activeSuppressions(organizationId: string) {
    return this.db
      .select()
      .from(suppressions)
      .where(
        and(
          eq(suppressions.organizationId, organizationId),
          or(isNull(suppressions.expiresAt), gt(suppressions.expiresAt, new Date())),
        ),
      );
  }

  async createSuppression(data: typeof suppressions.$inferInsert) {
    const [row] = await this.db.insert(suppressions).values(data).returning();
    return row;
  }
}
