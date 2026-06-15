import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3001', 10),
  appName: process.env.APP_NAME ?? 'ata-auth-service',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'change-me-in-production',

  database: {
    url: process.env.DATABASE_URL!,
  },

  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },

  jwt: {
    privateKey: Buffer.from(process.env.JWT_PRIVATE_KEY ?? '', 'base64').toString('utf-8'),
    publicKey: Buffer.from(process.env.JWT_PUBLIC_KEY ?? '', 'base64').toString('utf-8'),
    accessTokenTtl: parseInt(process.env.JWT_ACCESS_TOKEN_TTL ?? '900', 10),
    refreshTokenTtl: parseInt(process.env.JWT_REFRESH_TOKEN_TTL ?? '604800', 10),
  },

  smtp: {
    host: process.env.SMTP_HOST ?? 'localhost',
    port: parseInt(process.env.SMTP_PORT ?? '1025', 10),
    secure: process.env.SMTP_SECURE === 'true',
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    from: process.env.EMAIL_FROM ?? 'noreply@ata.local',
  },

  oauth: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL ?? 'http://localhost:3001/auth/oauth/google/callback',
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      callbackUrl: process.env.GITHUB_CALLBACK_URL ?? 'http://localhost:3001/auth/oauth/github/callback',
    },
  },

  rateLimit: {
    login: {
      max: parseInt(process.env.RATE_LIMIT_LOGIN_MAX ?? '5', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW_MS ?? '900000', 10),
    },
    register: {
      max: parseInt(process.env.RATE_LIMIT_REGISTER_MAX ?? '10', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_REGISTER_WINDOW_MS ?? '3600000', 10),
    },
  },
}));
