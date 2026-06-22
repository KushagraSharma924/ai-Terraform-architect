import { z } from 'zod';

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3006),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  JWT_PUBLIC_KEY: z.string(),
  INTERNAL_API_KEY: z.string().default('change-me-in-production'),
  TERRAFORM_SERVICE_URL: z.string().url().default('http://localhost:3005'),
  BROKER_AWS_ACCOUNT_ID: z.string().default('000000000000'),
  CREDENTIAL_TTL_SECONDS: z.coerce.number().default(3600),
  RUNNER_WORK_DIR: z.string().default('/tmp/ata-deploy-runs'),
  SECURITY_SERVICE_URL: z.string().url().default('http://localhost:3007'),
  SECURITY_GATE_MODE: z.enum(['off', 'warn', 'block']).default('warn'),
  STS_MODE: z.enum(['mock', 'real']).default('mock'),
});

export type Env = z.infer<typeof envSchema>;
