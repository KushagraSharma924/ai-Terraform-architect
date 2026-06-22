import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3008', 10),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtPublicKey: Buffer.from(process.env.JWT_PUBLIC_KEY ?? '', 'base64').toString('utf-8'),
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'change-me-in-production',
  // Telemetry + LLM are mock by default so the assistant works without cloud/LLM creds.
  telemetryProvider: process.env.TELEMETRY_PROVIDER ?? 'mock', // 'mock'|'aws'
  llmProvider: process.env.LLM_PROVIDER ?? 'mock', // 'mock'|'anthropic'
}));
