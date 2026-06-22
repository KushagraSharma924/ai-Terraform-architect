import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ScanOrchestratorService } from '../services/scan-orchestrator.service';

@Processor('security-scan')
export class ScanProcessor extends WorkerHost {
  private readonly logger = new Logger(ScanProcessor.name);

  constructor(private readonly orchestrator: ScanOrchestratorService) {
    super();
  }

  async process(job: Job<{ scanId: string; userId: string }, any, string>): Promise<any> {
    if (job.name === 'run-scan') {
      this.logger.log(`Running scan ${job.data.scanId} (job ${job.id})`);
      await this.orchestrator.runScan(job.data.scanId, job.data.userId);
      return { scanId: job.data.scanId };
    }
  }
}
