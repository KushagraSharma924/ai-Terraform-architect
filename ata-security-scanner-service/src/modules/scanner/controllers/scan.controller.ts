import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { ScanOrchestratorService } from '../services/scan-orchestrator.service';
import { ScanRepository } from '../repositories/scan.repository';
import { Framework } from '../engines/compliance.engine';
import { CreateScanDto, SuppressDto } from './scan.dto';

// Personal-org tenancy stub (see roadmap); replaced by the real org claim in Phase 10.
function orgOf(userId: string): string {
  return userId;
}

@Controller('scans')
@UseGuards(JwtAuthGuard)
export class ScanController {
  constructor(
    private readonly orchestrator: ScanOrchestratorService,
    private readonly repo: ScanRepository,
  ) {}

  @Post()
  @HttpCode(HttpStatus.ACCEPTED)
  create(@Body() dto: CreateScanDto, @CurrentUser('id') userId: string) {
    return this.orchestrator.requestScan({
      organizationId: orgOf(userId),
      userId,
      targetType: dto.targetType,
      targetId: dto.targetId,
    });
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.orchestrator.getScan(id);
  }

  @Get(':id/findings')
  findings(@Param('id') id: string) {
    return this.orchestrator.listFindings(id);
  }

  @Get(':id/compliance')
  compliance(@Param('id') id: string, @Query('framework') framework?: Framework) {
    return this.orchestrator.listCompliance(id, framework);
  }

  @Post('findings/suppress')
  suppress(@Body() dto: SuppressDto, @CurrentUser('id') userId: string) {
    return this.repo.createSuppression({
      organizationId: orgOf(userId),
      ruleId: dto.ruleId,
      resource: dto.resource,
      reason: dto.reason,
      createdBy: userId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });
  }

  /** Deploy gate — consumed by the deployment service before apply. */
  @Get('gate/:versionId')
  gate(@Param('versionId') versionId: string) {
    return this.orchestrator.gate(versionId);
  }
}
