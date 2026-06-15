import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { PipelineOrchestratorService } from '../../pipeline/pipeline-orchestrator.service';

@Processor('intent-parse')
export class IntentGenerationConsumer extends WorkerHost {
  constructor(private readonly pipeline: PipelineOrchestratorService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    const { generationId, userId } = job.data;
    await this.pipeline.process(generationId, userId);
  }
}
