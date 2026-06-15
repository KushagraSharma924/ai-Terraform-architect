import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3002),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_PUBLIC_KEY: z.string(),   // RS256 public key (base64)
  AUTH_SERVICE_URL: z.string().url().default('http://localhost:3001'),
  INTERNAL_API_KEY: z.string().default('change-me-in-production'),
});

export type Env = z.infer<typeof envSchema>;
