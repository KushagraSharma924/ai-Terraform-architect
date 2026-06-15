import { z } from 'zod';

export const envSchema = z.object({
  // App
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3001),
  APP_NAME: z.string().default('ata-auth-service'),

  // Database
  DATABASE_URL: z.string().url(),

  // Redis
  REDIS_URL: z.string().default('redis://localhost:6379'),

  // JWT – RS256
  JWT_PRIVATE_KEY: z.string(), // PEM, base64-encoded in env
  JWT_PUBLIC_KEY: z.string(),  // PEM, base64-encoded in env
  JWT_ACCESS_TOKEN_TTL: z.coerce.number().default(900),    // 15 min
  JWT_REFRESH_TOKEN_TTL: z.coerce.number().default(604800), // 7 days

  // Email
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().default(1025),
  SMTP_SECURE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().default('noreply@ata.local'),
  FRONTEND_URL: z.string().url().default('http://localhost:3000'),

  // OAuth – Google
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),

  // OAuth – GitHub
  GITHUB_CLIENT_ID: z.string().optional(),
  GITHUB_CLIENT_SECRET: z.string().optional(),
  GITHUB_CALLBACK_URL: z.string().optional(),

  // Rate limiting
  RATE_LIMIT_LOGIN_MAX: z.coerce.number().default(5),
  RATE_LIMIT_LOGIN_WINDOW_MS: z.coerce.number().default(900000), // 15 min
  RATE_LIMIT_REGISTER_MAX: z.coerce.number().default(10),
  RATE_LIMIT_REGISTER_WINDOW_MS: z.coerce.number().default(3600000), // 1 hr

  // Internal API key (used by gateway/other services)
  INTERNAL_API_KEY: z.string().default('change-me-in-production'),
});

export type Env = z.infer<typeof envSchema>;
