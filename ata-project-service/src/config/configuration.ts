import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3002', 10),
  databaseUrl: process.env.DATABASE_URL!,
  jwtPublicKey: Buffer.from(process.env.JWT_PUBLIC_KEY ?? '', 'base64').toString('utf-8'),
  authServiceUrl: process.env.AUTH_SERVICE_URL ?? 'http://localhost:3001',
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'change-me-in-production',
}));
