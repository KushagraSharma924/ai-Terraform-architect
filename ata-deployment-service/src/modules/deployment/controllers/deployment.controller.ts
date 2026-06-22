import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CloudAccountService } from '../services/cloud-account.service';
import { DeploymentOrchestratorService } from '../services/deployment-orchestrator.service';
import { ConnectAccountDto, CreateDeploymentDto, GuardrailDto } from './deployment.dto';

/**
 * Until Phase 10 ships real organizations, each user acts as their own personal
 * org (tenancy stub from the roadmap). Swap this for the real org claim later.
 */
function orgOf(userId: string): string {
  return userId;
}

@Controller('cloud-accounts')
@UseGuards(JwtAuthGuard)
export class CloudAccountController {
  constructor(private readonly accounts: CloudAccountService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  connect(@Body() dto: ConnectAccountDto, @CurrentUser('id') userId: string) {
    return this.accounts.connect({
      organizationId: orgOf(userId),
      userId,
      authMethod: dto.authMethod,
      roleArn: dto.roleArn,
      defaultRegion: dto.defaultRegion,
    });
  }

  @Post(':id/verify')
  verify(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.accounts.verify(id, orgOf(userId));
  }

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.accounts.list(orgOf(userId));
  }

  @Post('guardrails')
  setGuardrail(@Body() dto: GuardrailDto, @CurrentUser('id') userId: string) {
    return this.accounts.setGuardrail(orgOf(userId), dto);
  }
}

@Controller('deployments')
@UseGuards(JwtAuthGuard)
export class DeploymentController {
  constructor(private readonly orchestrator: DeploymentOrchestratorService) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(@Body() dto: CreateDeploymentDto, @CurrentUser('id') userId: string) {
    return this.orchestrator.create(userId, {
      organizationId: orgOf(userId),
      cloudAccountId: dto.cloudAccountId,
      projectVersionId: dto.projectVersionId,
      environment: dto.environment,
    });
  }

  @Post(':id/plan')
  @HttpCode(HttpStatus.ACCEPTED)
  plan(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orchestrator.requestPlan(id, userId);
  }

  @Post(':id/approve')
  approve(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orchestrator.approve(id, userId);
  }

  @Post(':id/apply')
  @HttpCode(HttpStatus.ACCEPTED)
  apply(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orchestrator.requestApply(id, userId);
  }

  @Post(':id/destroy')
  @HttpCode(HttpStatus.ACCEPTED)
  destroy(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orchestrator.requestDestroy(id, userId);
  }

  @Post(':id/rollback')
  rollback(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orchestrator.rollback(id, userId);
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orchestrator.get(id);
  }

  @Get(':id/events')
  events(@Param('id') id: string) {
    return this.orchestrator.events(id);
  }

  @Get(':id/runs')
  runs(@Param('id') id: string) {
    return this.orchestrator.runs(id);
  }
}
