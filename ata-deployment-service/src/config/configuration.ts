import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3006', 10),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtPublicKey: Buffer.from(process.env.JWT_PUBLIC_KEY ?? '', 'base64').toString('utf-8'),
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'change-me-in-production',
  // URL of the terraform generator service — source of versioned .tf files to deploy.
  terraformServiceUrl: process.env.TERRAFORM_SERVICE_URL ?? 'http://localhost:3005',
  // AWS account id that customers' IAM roles trust (the broker principal).
  brokerAwsAccountId: process.env.BROKER_AWS_ACCOUNT_ID ?? '000000000000',
  // STS session TTL for minted temporary credentials (seconds).
  credentialTtlSeconds: parseInt(process.env.CREDENTIAL_TTL_SECONDS ?? '3600', 10),
  // Working directory for runner sandboxes.
  runnerWorkDir: process.env.RUNNER_WORK_DIR ?? '/tmp/ata-deploy-runs',
  // Phase 8 security gate. URL of the scanner service + enforcement mode.
  securityServiceUrl: process.env.SECURITY_SERVICE_URL ?? 'http://localhost:3007',
  securityGateMode: process.env.SECURITY_GATE_MODE ?? 'warn', // 'off'|'warn'|'block'
  // STS mode: 'mock' uses fake creds (no AWS needed), 'real' calls AWS STS AssumeRole.
  stsMode: process.env.STS_MODE ?? 'mock',
}));
