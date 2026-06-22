import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { DeploymentExecutionService } from '../services/deployment-execution.service';

@Processor('deployment-execution')
export class DeploymentProcessor extends WorkerHost {
  private readonly logger = new Logger(DeploymentProcessor.name);

  constructor(private readonly execution: DeploymentExecutionService) {
    super();
  }

  async process(job: Job<{ deploymentId: string; userId: string }, any, string>): Promise<any> {
    const { deploymentId, userId } = job.data;
    if (job.name === 'plan' || job.name === 'apply' || job.name === 'destroy') {
      this.logger.log(`Executing ${job.name} for deployment ${deploymentId} (job ${job.id})`);
      await this.execution.execute(deploymentId, userId, job.name);
      return { deploymentId, runType: job.name };
    }
  }
}
