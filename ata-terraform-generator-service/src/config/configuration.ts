import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3005', 10),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtPublicKey: Buffer.from(process.env.JWT_PUBLIC_KEY ?? '', 'base64').toString('utf-8'),
  intentServiceUrl: process.env.INTENT_SERVICE_URL ?? 'http://localhost:3004',
  projectServiceUrl: process.env.PROJECT_SERVICE_URL ?? 'http://localhost:3002',
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'change-me-in-production',
  modulesPath: process.env.MODULES_PATH!,
  // Phase 5 — artifact storage. Local filesystem by default; swap for S3 via StoragePort.
  artifactStorageDir: process.env.ARTIFACT_STORAGE_DIR ?? '/tmp/ata-artifacts',
  artifactSignedUrlTtlSeconds: parseInt(process.env.ARTIFACT_SIGNED_URL_TTL ?? '900', 10),
}));
