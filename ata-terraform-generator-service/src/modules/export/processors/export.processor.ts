import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ArtifactService } from '../services/artifact.service';

@Processor('terraform-export')
export class ExportProcessor extends WorkerHost {
  private readonly logger = new Logger(ExportProcessor.name);

  constructor(private readonly artifactService: ArtifactService) {
    super();
  }

  async process(job: Job<{ artifactId: string }, any, string>): Promise<any> {
    if (job.name === 'build-artifact') {
      this.logger.log(`Building artifact ${job.data.artifactId} (job ${job.id})`);
      await this.artifactService.buildArtifact(job.data.artifactId);
      return { artifactId: job.data.artifactId };
    }
  }
}
