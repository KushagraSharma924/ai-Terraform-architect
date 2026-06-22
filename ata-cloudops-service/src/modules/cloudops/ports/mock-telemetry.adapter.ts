import { Injectable } from '@nestjs/common';
import { createHash } from 'crypto';
import { CostPoint, DiscoveredResource, TelemetryPort } from './telemetry.port';

/**
 * Deterministic synthetic telemetry, seeded from the cloud account id so the
 * same account always yields a stable (but realistic) inventory + cost trend.
 * Intentionally includes idle/oversized/public resources so the recommendation
 * and monitoring engines have something to find.
 */
@Injectable()
export class MockTelemetryAdapter implements TelemetryPort {
  private seed(accountId: string, salt: string): number {
    const h = createHash('sha256').update(`${accountId}:${salt}`).digest();
    return h.readUInt32BE(0) / 0xffffffff; // 0..1
  }

  async discoverResources(cloudAccountId: string): Promise<DiscoveredResource[]> {
    const r = (s: string) => this.seed(cloudAccountId, s);
    const region = 'us-east-1';
    return [
      {
        service: 'ec2',
        resourceId: 'i-0a1b2c3d4e5f6',
        region,
        type: 'm5.2xlarge',
        state: 'running',
        monthlyCost: 280,
        tags: { Name: 'api-server', env: 'prod' },
        config: { cpuUtilizationAvg: Math.round(r('cpu1') * 8) }, // low → oversized
      },
      {
        service: 'ec2',
        resourceId: 'i-0ff1deadbeef0',
        region,
        type: 't3.medium',
        state: 'stopped',
        monthlyCost: 30,
        tags: { Name: 'legacy-worker' },
        config: { cpuUtilizationAvg: 0, idleDays: 47 }, // idle
      },
      {
        service: 'rds',
        resourceId: 'db-prod-postgres',
        region,
        type: 'db.r5.large',
        state: 'available',
        monthlyCost: 320,
        tags: { env: 'prod' },
        config: { connections: 4, publiclyAccessible: r('rdspub') > 0.5 },
      },
      {
        service: 's3',
        resourceId: 'acme-public-assets',
        region,
        type: 'bucket',
        state: 'active',
        monthlyCost: 12,
        tags: {},
        config: { publicAccess: true, sizeGb: 120 },
      },
      {
        service: 's3',
        resourceId: 'acme-old-backups',
        region,
        type: 'bucket',
        state: 'active',
        monthlyCost: 85,
        tags: {},
        config: { lastAccessedDays: 210, sizeGb: 900 }, // cold → lifecycle candidate
      },
      {
        service: 'iam',
        resourceId: 'role/ci-deployer',
        type: 'role',
        state: 'active',
        monthlyCost: 0,
        config: { wildcardPolicy: true, lastUsedDays: 3 },
      },
    ];
  }

  async getCostSeries(cloudAccountId: string, days: number): Promise<CostPoint[]> {
    const services = ['EC2', 'RDS', 'S3', 'CloudWatch', 'DataTransfer'];
    const base: Record<string, number> = { EC2: 11, RDS: 10.5, S3: 3.2, CloudWatch: 1.1, DataTransfer: 2.4 };
    const points: CostPoint[] = [];
    for (let d = days - 1; d >= 0; d--) {
      const day = new Date();
      day.setDate(day.getDate() - d);
      const dateStr = day.toISOString().slice(0, 10);
      for (const svc of services) {
        // Gentle upward drift on EC2 to make "why is my bill increasing?" answerable.
        const drift = svc === 'EC2' ? (days - d) * 0.25 : 0;
        const noise = this.seed(cloudAccountId, `${svc}${dateStr}`) * 1.5;
        points.push({
          service: svc,
          usageDate: dateStr,
          amount: Math.round((base[svc] + drift + noise) * 100) / 100,
        });
      }
    }
    return points;
  }
}
