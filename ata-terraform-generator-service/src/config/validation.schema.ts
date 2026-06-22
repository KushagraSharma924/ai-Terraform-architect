import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3005),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_PUBLIC_KEY: z.string(), // base64-encoded RS256 PEM
  INTENT_SERVICE_URL: z.string().url().default('http://localhost:3004'),
  PROJECT_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  INTERNAL_API_KEY: z.string().default('change-me-in-production'),
  MODULES_PATH: z.string(),
  ARTIFACT_STORAGE_DIR: z.string().default('/tmp/ata-artifacts'),
  ARTIFACT_SIGNED_URL_TTL: z.coerce.number().default(900),
});

export type Env = z.infer<typeof envSchema>;
