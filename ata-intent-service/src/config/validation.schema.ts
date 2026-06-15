import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3004),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_PUBLIC_KEY: z.string(), // base64-encoded RS256 PEM
  PROJECT_SERVICE_URL: z.string().url().default('http://localhost:3002'),
  INTERNAL_API_KEY: z.string().default('change-me-in-production'),

  // LLM Config
  LLM_PRIMARY_PROVIDER: z.enum(['openai', 'claude', 'gemini', 'grok', 'ollama']).default('openai'),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  CLAUDE_API_KEY: z.string().optional(),
  CLAUDE_MODEL: z.string().default('claude-3-5-sonnet-20240620'),
  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().default('gemini-1.5-pro'),
  GROK_API_KEY: z.string().optional(),
  GROK_MODEL: z.string().default('grok-2-1212'),
  OLLAMA_BASE_URL: z.string().url().default('http://localhost:11434'),
  OLLAMA_MODEL: z.string().default('qwen2.5:3b'),
  LLM_MOCK_MODE: z.preprocess((val) => val === 'true' || val === true, z.boolean()).default(false),
});

export type Env = z.infer<typeof envSchema>;
