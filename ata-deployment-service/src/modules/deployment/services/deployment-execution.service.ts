import { Inject, Injectable, Logger } from '@nestjs/common';
import { DeploymentRepository } from '../repositories/deployment.repository';
import { CloudAccountRepository } from '../repositories/cloud-account.repository';
import { DeploymentOrchestratorService } from './deployment-orchestrator.service';
import { CredentialBroker } from '../credentials/credential-broker';
import { RUNNER_PORT, RunnerPort } from '../runner/runner.port';
import { TERRAFORM_SOURCE, TerraformSource } from '../ports/terraform-source.port';

type RunType = 'plan' | 'apply' | 'destroy';

/**
 * Executes a single terraform run for a deployment. Invoked by the BullMQ worker.
 * Crash-safe: a `deployment_run` row is opened before execution and closed after,
 * so a worker that dies mid-run leaves a discoverable "running" run to recover.
 */
@Injectable()
export class DeploymentExecutionService {
  private readonly logger = new Logger(DeploymentExecutionService.name);

  constructor(
    private readonly deploymentRepo: DeploymentRepository,
    private readonly accountRepo: CloudAccountRepository,
    private readonly orchestrator: DeploymentOrchestratorService,
    private readonly broker: CredentialBroker,
    @Inject(RUNNER_PORT) private readonly runner: RunnerPort,
    @Inject(TERRAFORM_SOURCE) private readonly source: TerraformSource,
  ) {}

  async execute(deploymentId: string, userId: string, runType: RunType): Promise<void> {
    const deployment = await this.deploymentRepo.findById(deploymentId);
    if (!deployment) throw new Error(`Deployment ${deploymentId} not found`);
    const account = await this.accountRepo.findById(deployment.cloudAccountId);
    if (!account) throw new Error('Cloud account not found');

    const run = await this.deploymentRepo.createRun({ deploymentId, runType, status: 'running' });

    try {
      const credentials = await this.broker.mint(account, deploymentId);
      const files = await this.source.getVersionFiles(deployment.projectVersionId, userId);

      const result = await this.runner.execute({
        deploymentId,
        runType,
        files,
        credentials,
        region: account.defaultRegion,
        onLog: (line) => this.logger.debug(`[${deploymentId}] ${line.trimEnd()}`),
      });

      await this.deploymentRepo.finishRun(run.id, {
        status: 'succeeded',
        exitCode: result.exitCode,
      });

      if (runType === 'plan') {
        await this.orchestrator.recordPlanResult(deploymentId, true, result.planSummary);
      } else if (runType === 'apply') {
        await this.orchestrator.recordApplyResult(deploymentId, true, result.stateVersion);
      } else {
        await this.orchestrator.recordDestroyResult(deploymentId, true);
      }
    } catch (err: any) {
      const message = err?.message ?? 'unknown error';
      this.logger.error(`Run ${run.id} (${runType}) failed: ${message}`);
      await this.deploymentRepo.finishRun(run.id, { status: 'failed', exitCode: 1 });

      if (runType === 'plan') {
        await this.orchestrator.recordPlanResult(deploymentId, false, undefined, message);
      } else if (runType === 'apply') {
        await this.orchestrator.recordApplyResult(deploymentId, false, undefined, message);
      } else {
        await this.orchestrator.recordDestroyResult(deploymentId, false, message);
      }
      // Do not rethrow: failure is a recorded terminal-ish state, not a lost job.
    }
  }
}
