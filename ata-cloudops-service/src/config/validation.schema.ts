import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3008),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_PUBLIC_KEY: z.string(),
  INTERNAL_API_KEY: z.string().default('change-me-in-production'),
  TELEMETRY_PROVIDER: z.enum(['mock', 'aws']).default('mock'),
  LLM_PROVIDER: z.enum(['mock', 'anthropic', 'ollama']).default('mock'),
  OLLAMA_BASE_URL: z.string().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:3b'),
  ANTHROPIC_API_KEY: z.string().default(''),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-4-5-20251001'),
});

export type Env = z.infer<typeof envSchema>;
