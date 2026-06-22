import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import {
  CloudAccountController,
  DeploymentController,
} from './controllers/deployment.controller';
import { DeploymentRepository } from './repositories/deployment.repository';
import { CloudAccountRepository } from './repositories/cloud-account.repository';
import { DeploymentOrchestratorService } from './services/deployment-orchestrator.service';
import { DeploymentExecutionService } from './services/deployment-execution.service';
import { CloudAccountService } from './services/cloud-account.service';
import { CostService } from './cost/cost.service';
import { CredentialBroker, MockStsAdapter, STS_PORT } from './credentials/credential-broker';
import { RUNNER_PORT } from './runner/runner.port';
import { LocalRunnerAdapter } from './runner/local-runner.adapter';
import { TERRAFORM_SOURCE, HttpTerraformSource } from './ports/terraform-source.port';
import { SecurityGate } from './ports/security-gate.port';
import { DeploymentProcessor } from './processors/deployment.processor';

@Module({
  imports: [BullModule.registerQueue({ name: 'deployment-execution' })],
  controllers: [CloudAccountController, DeploymentController],
  providers: [
    DeploymentRepository,
    CloudAccountRepository,
    DeploymentOrchestratorService,
    DeploymentExecutionService,
    CloudAccountService,
    CostService,
    CredentialBroker,
    SecurityGate,
    DeploymentProcessor,
    { provide: STS_PORT, useClass: MockStsAdapter },
    { provide: RUNNER_PORT, useClass: LocalRunnerAdapter },
    { provide: TERRAFORM_SOURCE, useClass: HttpTerraformSource },
  ],
})
export class DeploymentModule {}
