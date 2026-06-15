import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3000', 10),
  jwtPublicKey: Buffer.from(process.env.JWT_PUBLIC_KEY ?? '', 'base64').toString('utf-8'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3003',
  authServiceUrl: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
  projectServiceUrl: process.env.PROJECT_SERVICE_URL ?? 'http://localhost:3002',
  intentServiceUrl: process.env.INTENT_SERVICE_URL ?? 'http://localhost:3004',
  terraformServiceUrl: process.env.TERRAFORM_SERVICE_URL ?? 'http://localhost:3005',
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'change-me-in-production',
  redis: { url: process.env.REDIS_URL ?? 'redis://localhost:6379' },
  rateLimit: {
    max: parseInt(process.env.RATE_LIMIT_MAX ?? '100', 10),
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '60000', 10),
  },
}));
