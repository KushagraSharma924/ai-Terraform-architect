import { Inject, Injectable, Logger } from '@nestjs/common';
import { CloudOpsRepository } from '../repositories/cloudops.repository';
import { TELEMETRY_PORT, TelemetryPort } from '../ports/telemetry.port';
import { RecommendationEngine } from '../engines/recommendation.engine';

/**
 * Discovers resources for a cloud account, persists a snapshot, and refreshes
 * recommendations. Synchronous because the default telemetry is fast/mock; the
 * AWS adapter would move this behind a queue.
 */
@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private readonly repo: CloudOpsRepository,
    private readonly recommender: RecommendationEngine,
    @Inject(TELEMETRY_PORT) private readonly telemetry: TelemetryPort,
  ) {}

  async refresh(organizationId: string, cloudAccountId: string) {
    const resources = await this.telemetry.discoverResources(cloudAccountId);
    const snapshot = await this.repo.createSnapshot({
      organizationId,
      cloudAccountId,
      resourceCount: resources.length,
      status: 'completed',
    });

    await this.repo.insertResources(
      resources.map((r) => ({
        snapshotId: snapshot.id,
        organizationId,
        service: r.service,
        resourceId: r.resourceId,
        region: r.region,
        type: r.type,
        state: r.state,
        monthlyCost: r.monthlyCost != null ? String(r.monthlyCost) : null,
        tags: r.tags,
        config: r.config,
      })),
    );

    const recs = this.recommender.generate(resources);
    await this.repo.replaceRecommendations(
      organizationId,
      cloudAccountId,
      recs.map((rec) => ({
        organizationId,
        cloudAccountId,
        category: rec.category,
        severity: rec.severity,
        resourceRef: rec.resourceRef,
        title: rec.title,
        rationale: rec.rationale,
        estSavings: rec.estSavings != null ? String(rec.estSavings) : null,
      })),
    );

    this.logger.log(`Inventory refresh: ${resources.length} resources, ${recs.length} recommendations`);
    return { snapshotId: snapshot.id, resourceCount: resources.length, recommendationCount: recs.length };
  }

  async getInventory(organizationId: string, cloudAccountId: string) {
    let snapshot = await this.repo.latestSnapshot(organizationId, cloudAccountId);
    if (!snapshot) {
      await this.refresh(organizationId, cloudAccountId);
      snapshot = await this.repo.latestSnapshot(organizationId, cloudAccountId);
    }
    const resources = snapshot ? await this.repo.resourcesForSnapshot(snapshot.id) : [];
    return { snapshot, resources };
  }
}
