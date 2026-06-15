import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '3004', 10),
  databaseUrl: process.env.DATABASE_URL!,
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  jwtPublicKey: Buffer.from(process.env.JWT_PUBLIC_KEY ?? '', 'base64').toString('utf-8'),
  projectServiceUrl: process.env.PROJECT_SERVICE_URL ?? 'http://localhost:3002',
  internalApiKey: process.env.INTERNAL_API_KEY ?? 'change-me-in-production',

  llm: {
    primaryProvider: process.env.LLM_PRIMARY_PROVIDER ?? 'openai',
    openai: {
      apiKey: process.env.OPENAI_API_KEY,
      model: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
    },
    claude: {
      apiKey: process.env.CLAUDE_API_KEY,
      model: process.env.CLAUDE_MODEL ?? 'claude-3-5-sonnet-20240620',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
      model: process.env.GEMINI_MODEL ?? 'gemini-1.5-pro',
    },
    grok: {
      apiKey: process.env.GROK_API_KEY,
      model: process.env.GROK_MODEL ?? 'grok-2-1212',
    },
    ollama: {
      baseUrl: process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434',
      model: process.env.OLLAMA_MODEL ?? 'qwen2.5:3b',
    },
    mockMode: process.env.LLM_MOCK_MODE === 'true',
  },
}));
