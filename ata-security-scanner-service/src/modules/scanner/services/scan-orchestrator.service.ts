import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ScanRepository } from '../repositories/scan.repository';
import { RiskScoringEngine } from '../engines/risk-scoring.engine';
import { ComplianceEngine, Framework } from '../engines/compliance.engine';
import { SCANNER_PORT, ScannerPort, RawFinding } from '../scanners/scanner.port';
import { TERRAFORM_SOURCE, TerraformSource } from '../ports/terraform-source.port';

export interface RequestScanInput {
  organizationId: string;
  userId: string;
  targetType: 'project_version' | 'deployment';
  targetId: string; // a terraform version id
}

@Injectable()
export class ScanOrchestratorService {
  private readonly logger = new Logger(ScanOrchestratorService.name);

  constructor(
    private readonly repo: ScanRepository,
    private readonly risk: RiskScoringEngine,
    private readonly compliance: ComplianceEngine,
    @Inject(SCANNER_PORT) private readonly scanners: ScannerPort[],
    @Inject(TERRAFORM_SOURCE) private readonly source: TerraformSource,
    @InjectQueue('security-scan') private readonly queue: Queue,
  ) {}

  /** Create a pending scan and enqueue execution (202 semantics). */
  async requestScan(input: RequestScanInput) {
    const scan = await this.repo.createScan({
      organizationId: input.organizationId,
      targetType: input.targetType,
      targetId: input.targetId,
      scanners: this.scanners.map((s) => s.name),
      status: 'pending',
    });
    await this.queue.add('run-scan', { scanId: scan.id, userId: input.userId });
    return scan;
  }

  /** Executed by the worker: fetch files, run scanners, score, persist. */
  async runScan(scanId: string, userId: string): Promise<void> {
    const scan = await this.repo.findScan(scanId);
    if (!scan) throw new NotFoundException('Scan not found');

    await this.repo.updateScan(scanId, { status: 'running' });
    try {
      const files = await this.source.getVersionFiles(scan.targetId, userId);

      // Fan-out across scanners, then flatten + dedupe.
      const raw = (await Promise.all(this.scanners.map((s) => s.scan(files)))).flat();
      const deduped = this.dedupe(raw);

      // Apply active suppressions (muted but still recorded).
      const active = await this.repo.activeSuppressions(scan.organizationId);
      const isSuppressed = (f: RawFinding) =>
        active.some((s) => s.ruleId === f.ruleId && (!s.resource || s.resource === f.resource));

      const open = deduped.filter((f) => !isSuppressed(f));

      const risk = this.risk.score(open);
      const reports = this.compliance.evaluateAll(open);

      await this.repo.insertFindings(
        deduped.map((f) => ({
          scanId,
          organizationId: scan.organizationId,
          scanner: f.scanner,
          ruleId: f.ruleId,
          severity: f.severity,
          resource: f.resource,
          filePath: f.filePath,
          line: f.line,
          message: f.message,
          remediation: f.remediation,
          status: isSuppressed(f) ? 'suppressed' : 'open',
        })),
      );

      await this.repo.insertComplianceResults(
        reports.flatMap((r) =>
          r.controls.map((c) => ({
            scanId,
            framework: c.framework,
            controlId: c.controlId,
            status: c.status,
            findingRefs: c.findingRefs,
          })),
        ),
      );

      await this.repo.updateScan(scanId, {
        status: 'completed',
        riskScore: risk.score,
        grade: risk.grade,
        finishedAt: new Date(),
      });
      this.logger.log(`Scan ${scanId} completed: score=${risk.score} grade=${risk.grade}`);
    } catch (err: any) {
      this.logger.error(`Scan ${scanId} failed: ${err.message}`);
      await this.repo.updateScan(scanId, {
        status: 'failed',
        error: err.message,
        finishedAt: new Date(),
      });
    }
  }

  async getScan(scanId: string) {
    const scan = await this.repo.findScan(scanId);
    if (!scan) throw new NotFoundException('Scan not found');
    return scan;
  }

  listFindings(scanId: string) {
    return this.repo.listFindings(scanId);
  }

  listCompliance(scanId: string, framework?: Framework) {
    return this.repo.listCompliance(scanId, framework);
  }

  /**
   * Deploy gate (Phase 8 §FR8.2). Returns the latest scan verdict for a version:
   * blocks when an unsuppressed critical/high finding exists.
   */
  async gate(targetId: string) {
    const scan = await this.repo.latestForTarget('project_version', targetId);
    if (!scan || scan.status !== 'completed') {
      return { pass: false, reason: 'No completed scan for this version', scanId: scan?.id ?? null };
    }
    const open = (await this.repo.listFindings(scan.id)).filter((f) => f.status === 'open');
    const blocking = open.filter((f) => f.severity === 'critical' || f.severity === 'high');
    return {
      pass: blocking.length === 0,
      reason: blocking.length ? `${blocking.length} blocking finding(s)` : 'ok',
      riskScore: scan.riskScore,
      grade: scan.grade,
      scanId: scan.id,
    };
  }

  private dedupe(findings: RawFinding[]): RawFinding[] {
    const seen = new Map<string, RawFinding>();
    for (const f of findings) {
      const key = `${f.ruleId}|${f.filePath}|${f.line}`;
      if (!seen.has(key)) seen.set(key, f);
    }
    return [...seen.values()];
  }
}
