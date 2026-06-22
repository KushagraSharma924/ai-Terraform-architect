import { Module } from '@nestjs/common';
import { CloudOpsController } from './controllers/cloudops.controller';
import { CloudOpsRepository } from './repositories/cloudops.repository';
import { InventoryService } from './services/inventory.service';
import { AssistantService } from './services/assistant.service';
import { CostAnalysisEngine } from './engines/cost-analysis.engine';
import { RecommendationEngine } from './engines/recommendation.engine';
import { TELEMETRY_PORT } from './ports/telemetry.port';
import { MockTelemetryAdapter } from './ports/mock-telemetry.adapter';
import { LLM_PORT } from './ports/llm.port';
import { MockLlmAdapter } from './ports/llm.port';

@Module({
  controllers: [CloudOpsController],
  providers: [
    CloudOpsRepository,
    InventoryService,
    AssistantService,
    CostAnalysisEngine,
    RecommendationEngine,
    { provide: TELEMETRY_PORT, useClass: MockTelemetryAdapter },
    { provide: LLM_PORT, useClass: MockLlmAdapter },
  ],
})
export class CloudOpsModule {}
