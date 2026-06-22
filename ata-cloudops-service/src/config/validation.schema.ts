import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3008),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_PUBLIC_KEY: z.string(),
  INTERNAL_API_KEY: z.string().default('change-me-in-production'),
  TELEMETRY_PROVIDER: z.enum(['mock', 'aws']).default('mock'),
  LLM_PROVIDER: z.enum(['mock', 'anthropic']).default('mock'),
});

export type Env = z.infer<typeof envSchema>;
