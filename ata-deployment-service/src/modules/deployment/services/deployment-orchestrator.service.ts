import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { DeploymentRepository } from '../repositories/deployment.repository';
import { CloudAccountRepository } from '../repositories/cloud-account.repository';
import { CostService, CostEstimate } from '../cost/cost.service';
import { SecurityGate } from '../ports/security-gate.port';
import {
  DeploymentEventName,
  DeploymentState,
  IllegalTransitionError,
  nextState,
} from '../state-machine/deployment-state-machine';
import type { DeploymentRecord } from '../../../database/schema';

export interface CreateDeploymentInput {
  organizationId: string;
  cloudAccountId: string;
  projectVersionId: string;
  environment?: string;
}

/**
 * The sole owner of deployment state. Every public method that changes state
 * routes through `transition`, which validates against the state machine and
 * appends an immutable event (event-sourced audit).
 */
@Injectable()
export class DeploymentOrchestratorService {
  private readonly logger = new Logger(DeploymentOrchestratorService.name);

  constructor(
    private readonly deploymentRepo: DeploymentRepository,
    private readonly accountRepo: CloudAccountRepository,
    private readonly costService: CostService,
    private readonly securityGate: SecurityGate,
    @InjectQueue('deployment-execution') private readonly queue: Queue,
  ) {}

  private async transition(
    deployment: DeploymentRecord,
    event: DeploymentEventName,
    actor: string | null,
    metadata?: Record<string, unknown>,
    extra?: Partial<DeploymentRecord>,
  ): Promise<DeploymentRecord> {
    let to: DeploymentState;
    try {
      to = nextState(deployment.state as DeploymentState, event);
    } catch (err) {
      if (err instanceof IllegalTransitionError) {
        throw new BadRequestException(err.message);
      }
      throw err;
    }

    const updated = await this.deploymentRepo.update(deployment.id, { ...extra, state: to });
    await this.deploymentRepo.appendEvent({
      deploymentId: deployment.id,
      fromState: deployment.state,
      toState: to,
      event,
      actor: actor ?? undefined,
      metadata,
    });
    this.logger.log(`Deployment ${deployment.id}: ${deployment.state} → ${to} (${event})`);
    return updated;
  }

  // ---- Command API (user-facing) ----

  async create(userId: string, input: CreateDeploymentInput): Promise<DeploymentRecord> {
    const account = await this.accountRepo.findById(input.cloudAccountId);
    if (!account) throw new NotFoundException('Cloud account not found');
    if (account.organizationId !== input.organizationId) {
      throw new ForbiddenException('Cloud account belongs to another organization');
    }
    if (account.status !== 'verified') {
      throw new BadRequestException('Cloud account is not verified');
    }
    return this.deploymentRepo.create({
      organizationId: input.organizationId,
      cloudAccountId: input.cloudAccountId,
      projectVersionId: input.projectVersionId,
      environment: input.environment ?? 'dev',
      state: 'queued',
      requestedBy: userId,
    });
  }

  async requestPlan(deploymentId: string, userId: string): Promise<DeploymentRecord> {
    const deployment = await this.requireDeployment(deploymentId);
    const updated = await this.transition(deployment, 'plan_requested', userId);
    await this.queue.add('plan', { deploymentId, userId });
    return updated;
  }

  async approve(deploymentId: string, userId: string): Promise<DeploymentRecord> {
    const deployment = await this.requireDeployment(deploymentId);
    return this.transition(deployment, 'approved', userId, undefined, {
      approvedBy: userId,
    });
  }

  async requestApply(deploymentId: string, userId: string): Promise<DeploymentRecord> {
    const deployment = await this.requireDeployment(deploymentId);

    // Phase 8 deploy gate: a failing scan blocks apply when the gate is in block mode.
    const gate = await this.securityGate.check(deployment.projectVersionId);
    if (!gate.pass) {
      if (this.securityGate.mode === 'block') {
        throw new BadRequestException(`Security gate blocked apply: ${gate.reason}`);
      }
      this.logger.warn(`Security gate warning for ${deploymentId}: ${gate.reason}`);
    }

    const updated = await this.transition(deployment, 'apply_requested', userId, {
      securityGate: gate,
    });
    await this.queue.add('apply', { deploymentId, userId });
    return updated;
  }

  async requestDestroy(deploymentId: string, userId: string): Promise<DeploymentRecord> {
    const deployment = await this.requireDeployment(deploymentId);
    const updated = await this.transition(deployment, 'destroy_requested', userId);
    await this.queue.add('destroy', { deploymentId, userId });
    return updated;
  }

  async rollback(deploymentId: string, userId: string): Promise<DeploymentRecord> {
    const deployment = await this.requireDeployment(deploymentId);
    return this.transition(deployment, 'rolled_back', userId);
  }

  // ---- Result callbacks (invoked by the execution worker) ----

  async recordPlanResult(
    deploymentId: string,
    success: boolean,
    planSummary?: { add: number; change: number; destroy: number },
    error?: string,
  ): Promise<void> {
    const deployment = await this.requireDeployment(deploymentId);
    if (!success) {
      await this.transition(deployment, 'plan_failed', null, { error }, { error });
      return;
    }

    // Cost guardrail gate: a blocking guardrail forces the plan into failed.
    const estimate: CostEstimate = await this.costService.estimate(planSummary);
    const guardrail = await this.accountRepo.findGuardrail(deployment.organizationId);
    const decision = this.costService.evaluateGuardrails(estimate, guardrail);

    if (!decision.allowed) {
      await this.transition(
        deployment,
        'plan_failed',
        null,
        { guardrail: decision },
        { error: decision.reason, planSummary, costEstimate: estimate },
      );
      return;
    }

    await this.transition(deployment, 'plan_succeeded', null, { guardrail: decision }, {
      planSummary,
      costEstimate: estimate,
    });
  }

  async recordApplyResult(
    deploymentId: string,
    success: boolean,
    stateVersion?: number,
    error?: string,
  ): Promise<void> {
    const deployment = await this.requireDeployment(deploymentId);
    await this.transition(
      deployment,
      success ? 'apply_succeeded' : 'apply_failed',
      null,
      { error },
      { stateVersion, error: success ? null : error },
    );
  }

  async recordDestroyResult(
    deploymentId: string,
    success: boolean,
    error?: string,
  ): Promise<void> {
    const deployment = await this.requireDeployment(deploymentId);
    await this.transition(
      deployment,
      success ? 'destroy_succeeded' : 'destroy_failed',
      null,
      { error },
      { error: success ? null : error },
    );
  }

  // ---- Queries ----

  async get(deploymentId: string): Promise<DeploymentRecord> {
    return this.requireDeployment(deploymentId);
  }

  async events(deploymentId: string) {
    return this.deploymentRepo.listEvents(deploymentId);
  }

  async runs(deploymentId: string) {
    return this.deploymentRepo.listRuns(deploymentId);
  }

  private async requireDeployment(id: string): Promise<DeploymentRecord> {
    const deployment = await this.deploymentRepo.findById(id);
    if (!deployment) throw new NotFoundException('Deployment not found');
    return deployment;
  }
}
