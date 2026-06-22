import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CloudOpsController } from './controllers/cloudops.controller';
import { CloudOpsRepository } from './repositories/cloudops.repository';
import { InventoryService } from './services/inventory.service';
import { AssistantService } from './services/assistant.service';
import { CostAnalysisEngine } from './engines/cost-analysis.engine';
import { RecommendationEngine } from './engines/recommendation.engine';
import { TELEMETRY_PORT } from './ports/telemetry.port';
import { MockTelemetryAdapter } from './ports/mock-telemetry.adapter';
import { AwsTelemetryAdapter } from './ports/aws-telemetry.adapter';
import { LLM_PORT, MockLlmAdapter } from './ports/llm.port';
import { OllamaLlmAdapter } from './ports/ollama-llm.adapter';
import { ClaudeLlmAdapter } from './ports/claude-llm.adapter';

@Module({
  controllers: [CloudOpsController],
  providers: [
    CloudOpsRepository,
    InventoryService,
    AssistantService,
    CostAnalysisEngine,
    RecommendationEngine,
    {
      provide: TELEMETRY_PORT,
      useFactory: () => {
        const provider = process.env.TELEMETRY_PROVIDER ?? 'mock';
        console.log(`[CloudOpsModule] TELEMETRY_PROVIDER=${provider}`);
        return provider === 'aws' ? new AwsTelemetryAdapter() : new MockTelemetryAdapter();
      },
    },
    {
      provide: LLM_PORT,
      useFactory: () => {
        const provider = process.env.LLM_PROVIDER ?? 'mock';
        console.log(`[CloudOpsModule] LLM_PROVIDER=${provider}`);
        if (provider === 'anthropic') {
          const apiKey = process.env.ANTHROPIC_API_KEY ?? '';
          const model = process.env.ANTHROPIC_MODEL ?? 'claude-haiku-4-5-20251001';
          return new ClaudeLlmAdapter(apiKey, model);
        }
        if (provider === 'ollama') {
          const baseUrl = process.env.OLLAMA_BASE_URL ?? 'http://localhost:11434';
          const model = process.env.OLLAMA_MODEL ?? 'qwen2.5:3b';
          return new OllamaLlmAdapter(baseUrl, model);
        }
        return new MockLlmAdapter();
      },
      inject: [ConfigService],
    },
  ],
})
export class CloudOpsModule {}
