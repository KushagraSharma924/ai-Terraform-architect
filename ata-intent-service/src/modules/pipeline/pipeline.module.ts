import { Module } from '@nestjs/common';
import { InputValidatorService } from './input-validator/input-validator.service';
import { PromptBuilderService } from './prompt-builder/prompt-builder.service';
import { SchemaValidatorService } from './schema-validator/schema-validator.service';
import { AmbiguityScorerService } from './ambiguity-scorer/ambiguity-scorer.service';
import { PipelineOrchestratorService } from './pipeline-orchestrator.service';
import { ProjectServiceClient } from '../../common/clients/project-service.client';

@Module({
  providers: [
    InputValidatorService,
    PromptBuilderService,
    SchemaValidatorService,
    AmbiguityScorerService,
    PipelineOrchestratorService,
    ProjectServiceClient,
  ],
  exports: [
    InputValidatorService,
    PromptBuilderService,
    SchemaValidatorService,
    AmbiguityScorerService,
    PipelineOrchestratorService,
    ProjectServiceClient,
  ],
})
export class PipelineModule {}
