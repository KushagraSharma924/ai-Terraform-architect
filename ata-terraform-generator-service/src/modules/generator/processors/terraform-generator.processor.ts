import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TerraformGeneratorService } from '../services/terraform-generator.service';

@Processor('terraform-generation')
export class TerraformGeneratorProcessor extends WorkerHost {
  private readonly logger = new Logger(TerraformGeneratorProcessor.name);

  constructor(private readonly generatorService: TerraformGeneratorService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing job ${job.id} of type ${job.name}`);
    if (job.name === 'generate-project') {
      const { versionId, projectId, userId, generationId, name, cloudProvider, spec } = job.data;
      try {
        await this.generatorService.execute(
          versionId,
          projectId,
          userId,
          generationId,
          name,
          cloudProvider,
          spec,
        );
        return { versionId };
      } catch (err: any) {
        this.logger.error(`Job execution failed: ${err.message}`);
        throw err;
      }
    }
  }
}
