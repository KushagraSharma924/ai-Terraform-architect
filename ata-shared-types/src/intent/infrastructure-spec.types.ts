export type CloudProvider = 'aws' | 'azure' | 'gcp';

export type ApplicationType =
  | 'nodejs'
  | 'python'
  | 'java'
  | 'go'
  | 'php'
  | 'static'
  | 'mern'
  | 'other';

export type ArchitecturePattern =
  | 'single-tier'
  | 'two-tier'
  | 'three-tier'
  | 'serverless'
  | 'microservices';

export type AwsServiceType =
  | 'ec2'
  | 'alb'
  | 'nlb'
  | 'rds'
  | 'vpc'
  | 'autoscaling'
  | 's3'
  | 'ecs'
  | 'eks'
  | 'lambda'
  | 'documentdb'
  | 'cloudfront'
  | 'route53'
  | 'iam'
  | 'elasticache';

export interface ComputeSpec {
  type: 'ec2' | 'ecs' | 'eks' | 'lambda' | 'none';
  instanceCount?: number;
  instanceType?: string;
  autoScaling?: {
    enabled: boolean;
    minInstances: number;
    maxInstances: number;
    targetCpuUtilization?: number;
  };
}

export interface LoadBalancerSpec {
  type: 'alb' | 'nlb' | 'none';
  scheme?: 'internet-facing' | 'internal';
  healthCheckPath?: string;
}

export interface DatabaseSpec {
  type: 'postgresql' | 'mysql' | 'mongodb' | 'documentdb' | 'none';
  engineVersion?: string | null;
  multiAz?: boolean;
  storageGb?: number;
}

export interface NetworkingSpec {
  vpcCidr?: string;
  privateSubnets: boolean;
  publicSubnets?: boolean;
  natGateway?: boolean;
  availabilityZones?: number;
}

export interface SecuritySpec {
  securityGroups?: string[];
  encryptionAtRest: boolean;
}

export interface StorageSpec {
  type: 's3';
  purpose?: string;
}

export interface Ambiguity {
  field: string;
  reason: string;
  confidence: 'low' | 'medium' | 'high';
}

export interface InfrastructureSpecification {
  schemaVersion: '1.0';
  cloudProvider: CloudProvider;
  applicationType: ApplicationType;
  architecturePattern?: ArchitecturePattern;
  services: AwsServiceType[];
  compute?: ComputeSpec;
  loadBalancer?: LoadBalancerSpec;
  database?: DatabaseSpec;
  networking?: NetworkingSpec;
  security?: SecuritySpec;
  storage?: StorageSpec[];
  estimatedMonthlyTraffic?: 'low' | 'medium' | 'high' | null;
  tags?: Record<string, string>;
  ambiguities: Ambiguity[];
  confidenceScore: number;
}
