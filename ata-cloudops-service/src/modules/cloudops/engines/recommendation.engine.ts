import { Injectable } from '@nestjs/common';
import { DiscoveredResource } from '../ports/telemetry.port';

export interface Recommendation {
  category: 'cost' | 'waste' | 'health' | 'security';
  severity: 'critical' | 'high' | 'medium' | 'low';
  resourceRef: string;
  title: string;
  rationale: string;
  estSavings?: number;
}

/**
 * Rule-based analysis of discovered resources → actionable recommendations.
 * Covers the design's examples: idle/unused, oversized, cold storage, public
 * exposure, and over-broad IAM.
 */
@Injectable()
export class RecommendationEngine {
  generate(resources: DiscoveredResource[]): Recommendation[] {
    const recs: Recommendation[] = [];

    for (const r of resources) {
      const cfg = (r.config ?? {}) as Record<string, any>;

      // Idle EC2
      if (r.service === 'ec2' && (r.state === 'stopped' || cfg.idleDays > 30)) {
        recs.push({
          category: 'waste',
          severity: 'medium',
          resourceRef: r.resourceId,
          title: `Terminate idle instance ${r.resourceId}`,
          rationale: `Instance has been idle ${cfg.idleDays ?? 'many'} days (state: ${r.state}).`,
          estSavings: r.monthlyCost,
        });
      }

      // Oversized EC2 (low CPU)
      if (r.service === 'ec2' && r.state === 'running' && cfg.cpuUtilizationAvg != null && cfg.cpuUtilizationAvg < 15) {
        recs.push({
          category: 'cost',
          severity: 'high',
          resourceRef: r.resourceId,
          title: `Right-size ${r.resourceId} (${r.type})`,
          rationale: `Average CPU ${cfg.cpuUtilizationAvg}% — downsizing one tier could cut cost ~40%.`,
          estSavings: r.monthlyCost ? Math.round(r.monthlyCost * 0.4) : undefined,
        });
      }

      // Public S3
      if (r.service === 's3' && cfg.publicAccess) {
        recs.push({
          category: 'security',
          severity: 'critical',
          resourceRef: r.resourceId,
          title: `Block public access on ${r.resourceId}`,
          rationale: 'Bucket allows public access — enable a public access block.',
        });
      }

      // Cold storage
      if (r.service === 's3' && cfg.lastAccessedDays > 180) {
        recs.push({
          category: 'cost',
          severity: 'medium',
          resourceRef: r.resourceId,
          title: `Add lifecycle policy to ${r.resourceId}`,
          rationale: `Not accessed in ${cfg.lastAccessedDays} days — transition to Glacier.`,
          estSavings: r.monthlyCost ? Math.round(r.monthlyCost * 0.7) : undefined,
        });
      }

      // Public RDS
      if (r.service === 'rds' && cfg.publiclyAccessible) {
        recs.push({
          category: 'security',
          severity: 'high',
          resourceRef: r.resourceId,
          title: `Disable public accessibility on ${r.resourceId}`,
          rationale: 'RDS instance is publicly accessible — move to private subnets.',
        });
      }

      // Over-broad IAM
      if (r.service === 'iam' && cfg.wildcardPolicy) {
        recs.push({
          category: 'security',
          severity: 'high',
          resourceRef: r.resourceId,
          title: `Tighten wildcard IAM policy on ${r.resourceId}`,
          rationale: 'Policy grants "*" — scope to least privilege.',
        });
      }
    }

    return recs;
  }
}
