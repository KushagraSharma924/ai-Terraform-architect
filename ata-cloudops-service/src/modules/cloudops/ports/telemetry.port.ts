export const TELEMETRY_PORT = 'TELEMETRY_PORT';

export interface DiscoveredResource {
  service: 'ec2' | 'rds' | 's3' | 'iam';
  resourceId: string;
  region?: string;
  type?: string;
  state?: string;
  monthlyCost?: number;
  tags?: Record<string, string>;
  config?: Record<string, unknown>;
}

export interface CostPoint {
  service: string;
  usageDate: string; // YYYY-MM-DD
  amount: number;
}

/**
 * Reads telemetry from a cloud account. The default mock adapter returns
 * deterministic synthetic data so the assistant + dashboards work without real
 * AWS credentials. Production binds an AWS adapter (EC2/RDS/S3/IAM describe +
 * Cost Explorer) — future Azure Monitor / GCP Monitoring adapters slot in here.
 */
export interface TelemetryPort {
  discoverResources(cloudAccountId: string): Promise<DiscoveredResource[]>;
  getCostSeries(cloudAccountId: string, days: number): Promise<CostPoint[]>;
}
