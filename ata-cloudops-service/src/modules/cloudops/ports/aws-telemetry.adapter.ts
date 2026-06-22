import { Injectable, Logger } from '@nestjs/common';
import { STSClient, AssumeRoleCommand } from '@aws-sdk/client-sts';
import { EC2Client, DescribeInstancesCommand, DescribeInstanceTypesCommand } from '@aws-sdk/client-ec2';
import { RDSClient, DescribeDBInstancesCommand } from '@aws-sdk/client-rds';
import { S3Client, ListBucketsCommand, GetPublicAccessBlockCommand } from '@aws-sdk/client-s3';
import { IAMClient, ListRolesCommand } from '@aws-sdk/client-iam';
import { CostExplorerClient, GetCostAndUsageCommand } from '@aws-sdk/client-cost-explorer';
import type { TelemetryPort, DiscoveredResource, CostPoint } from './telemetry.port';

interface AwsCredentials {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
}

// In-memory cache: cloudAccountId → { creds, expiresAt }
const credsCache = new Map<string, { creds: AwsCredentials; expiresAt: number }>();

@Injectable()
export class AwsTelemetryAdapter implements TelemetryPort {
  private readonly logger = new Logger(AwsTelemetryAdapter.name);
  private readonly region: string;

  constructor() {
    this.region = process.env.AWS_DEFAULT_REGION ?? 'ap-south-1';
  }

  // Resolve credentials: if cloudAccountId maps to a role ARN in env, assume it.
  // Otherwise fall back to ambient credentials (instance profile / env vars).
  private async resolveCredentials(_cloudAccountId: string): Promise<AwsCredentials | undefined> {
    const roleArn = process.env.CLOUDOPS_ROLE_ARN;
    const externalId = process.env.CLOUDOPS_EXTERNAL_ID;
    if (!roleArn) return undefined; // use ambient creds

    const cached = credsCache.get(_cloudAccountId);
    if (cached && cached.expiresAt > Date.now() + 60_000) return cached.creds;

    const sts = new STSClient({ region: this.region });
    const resp = await sts.send(new AssumeRoleCommand({
      RoleArn: roleArn,
      RoleSessionName: `cloudops-${_cloudAccountId.slice(0, 16)}`,
      ExternalId: externalId,
      DurationSeconds: 3600,
    }));

    const creds: AwsCredentials = {
      accessKeyId: resp.Credentials!.AccessKeyId!,
      secretAccessKey: resp.Credentials!.SecretAccessKey!,
      sessionToken: resp.Credentials!.SessionToken!,
    };
    credsCache.set(_cloudAccountId, { creds, expiresAt: resp.Credentials!.Expiration!.getTime() });
    return creds;
  }

  private clientConfig(creds?: AwsCredentials) {
    return {
      region: this.region,
      ...(creds ? { credentials: creds } : {}),
    };
  }

  async discoverResources(cloudAccountId: string): Promise<DiscoveredResource[]> {
    const creds = await this.resolveCredentials(cloudAccountId);
    const cfg = this.clientConfig(creds);
    const resources: DiscoveredResource[] = [];

    // ── EC2 ──────────────────────────────────────────────────────────────────
    try {
      const ec2 = new EC2Client(cfg);
      const resp = await ec2.send(new DescribeInstancesCommand({ MaxResults: 100 }));
      for (const r of resp.Reservations ?? []) {
        for (const i of r.Instances ?? []) {
          const tags = Object.fromEntries((i.Tags ?? []).map(t => [t.Key!, t.Value!]));
          resources.push({
            service: 'ec2',
            resourceId: i.InstanceId!,
            region: this.region,
            type: i.InstanceType,
            state: i.State?.Name,
            tags,
            config: {
              launchTime: i.LaunchTime,
              publicIp: i.PublicIpAddress,
              privateIp: i.PrivateIpAddress,
              availabilityZone: i.Placement?.AvailabilityZone,
              platform: i.Platform ?? 'linux',
            },
          });
        }
      }
      this.logger.log(`EC2: found ${resources.filter(r => r.service === 'ec2').length} instances`);
    } catch (e: any) {
      this.logger.warn(`EC2 discovery failed: ${e.message}`);
    }

    // ── RDS ──────────────────────────────────────────────────────────────────
    try {
      const rds = new RDSClient(cfg);
      const resp = await rds.send(new DescribeDBInstancesCommand({}));
      for (const db of resp.DBInstances ?? []) {
        const tags = Object.fromEntries((db.TagList ?? []).map(t => [t.Key!, t.Value!]));
        resources.push({
          service: 'rds',
          resourceId: db.DBInstanceIdentifier!,
          region: this.region,
          type: db.DBInstanceClass,
          state: db.DBInstanceStatus,
          tags,
          config: {
            engine: db.Engine,
            engineVersion: db.EngineVersion,
            multiAz: db.MultiAZ,
            publiclyAccessible: db.PubliclyAccessible,
            allocatedStorage: db.AllocatedStorage,
            endpoint: db.Endpoint?.Address,
          },
        });
      }
      this.logger.log(`RDS: found ${resp.DBInstances?.length ?? 0} instances`);
    } catch (e: any) {
      this.logger.warn(`RDS discovery failed: ${e.message}`);
    }

    // ── S3 ───────────────────────────────────────────────────────────────────
    try {
      const s3 = new S3Client({ ...cfg, region: 'us-east-1' });
      const resp = await s3.send(new ListBucketsCommand({}));
      for (const bucket of resp.Buckets ?? []) {
        let publicAccess = false;
        try {
          const pab = await s3.send(new GetPublicAccessBlockCommand({ Bucket: bucket.Name! }));
          const c = pab.PublicAccessBlockConfiguration;
          publicAccess = !(c?.BlockPublicAcls && c?.BlockPublicPolicy && c?.IgnorePublicAcls && c?.RestrictPublicBuckets);
        } catch {
          // If GetPublicAccessBlock throws (no block config set), bucket may be public
          publicAccess = true;
        }
        resources.push({
          service: 's3',
          resourceId: bucket.Name!,
          type: 'bucket',
          state: 'active',
          config: {
            creationDate: bucket.CreationDate,
            publicAccess,
          },
        });
      }
      this.logger.log(`S3: found ${resp.Buckets?.length ?? 0} buckets`);
    } catch (e: any) {
      this.logger.warn(`S3 discovery failed: ${e.message}`);
    }

    // ── IAM Roles ─────────────────────────────────────────────────────────────
    try {
      const iam = new IAMClient(cfg);
      const resp = await iam.send(new ListRolesCommand({ MaxItems: 50 }));
      for (const role of resp.Roles ?? []) {
        resources.push({
          service: 'iam',
          resourceId: role.RoleName!,
          type: 'role',
          state: 'active',
          config: {
            arn: role.Arn,
            createDate: role.CreateDate,
            path: role.Path,
          },
        });
      }
      this.logger.log(`IAM: found ${resp.Roles?.length ?? 0} roles`);
    } catch (e: any) {
      this.logger.warn(`IAM discovery failed: ${e.message}`);
    }

    this.logger.log(`Total resources discovered: ${resources.length}`);
    return resources;
  }

  async getCostSeries(cloudAccountId: string, days: number): Promise<CostPoint[]> {
    const creds = await this.resolveCredentials(cloudAccountId);
    // Cost Explorer is only available in us-east-1
    const ce = new CostExplorerClient({ region: 'us-east-1', ...(creds ? { credentials: creds } : {}) });

    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    try {
      const resp = await ce.send(new GetCostAndUsageCommand({
        TimePeriod: { Start: fmt(start), End: fmt(end) },
        Granularity: 'DAILY',
        Metrics: ['UnblendedCost'],
        GroupBy: [{ Type: 'DIMENSION', Key: 'SERVICE' }],
      }));

      const points: CostPoint[] = [];
      for (const result of resp.ResultsByTime ?? []) {
        const date = result.TimePeriod!.Start!;
        for (const group of result.Groups ?? []) {
          const service = group.Keys?.[0] ?? 'Other';
          const amount = parseFloat(group.Metrics?.UnblendedCost?.Amount ?? '0');
          if (amount > 0) {
            points.push({ service, usageDate: date, amount: Math.round(amount * 100) / 100 });
          }
        }
      }
      this.logger.log(`Cost Explorer: ${points.length} data points over ${days} days`);
      return points;
    } catch (e: any) {
      this.logger.warn(`Cost Explorer failed: ${e.message}`);
      return [];
    }
  }
}
