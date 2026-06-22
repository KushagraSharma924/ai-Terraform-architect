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
  Inject,
  BadRequestException,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { InventoryService } from '../services/inventory.service';
import { AssistantService } from '../services/assistant.service';
import { CloudOpsRepository } from '../repositories/cloudops.repository';
import { CostAnalysisEngine } from '../engines/cost-analysis.engine';
import { TELEMETRY_PORT, TelemetryPort } from '../ports/telemetry.port';

function orgOf(userId: string): string {
  return userId; // personal-org tenancy stub (Phase 10 swaps this)
}

@Controller('cloudops')
@UseGuards(JwtAuthGuard)
export class CloudOpsController {
  constructor(
    private readonly inventory: InventoryService,
    private readonly assistant: AssistantService,
    private readonly repo: CloudOpsRepository,
    private readonly costEngine: CostAnalysisEngine,
    @Inject(TELEMETRY_PORT) private readonly telemetry: TelemetryPort,
  ) {}

  @Post('inventory/:cloudAccountId/refresh')
  @HttpCode(HttpStatus.ACCEPTED)
  refresh(@Param('cloudAccountId') cloudAccountId: string, @CurrentUser('id') userId: string) {
    return this.inventory.refresh(orgOf(userId), cloudAccountId);
  }

  @Get('inventory/:cloudAccountId')
  getInventory(@Param('cloudAccountId') cloudAccountId: string, @CurrentUser('id') userId: string) {
    return this.inventory.getInventory(orgOf(userId), cloudAccountId);
  }

  @Get('cost/:cloudAccountId/trends')
  async costTrends(
    @Param('cloudAccountId') cloudAccountId: string,
    @Query('days') days = '30',
  ) {
    const series = await this.telemetry.getCostSeries(cloudAccountId, +days);
    return this.costEngine.analyze(series);
  }

  @Get('recommendations')
  recommendations(@CurrentUser('id') userId: string) {
    return this.repo.listRecommendations(orgOf(userId));
  }

  @Post('recommendations/:id/dismiss')
  dismiss(@Param('id') id: string) {
    return this.repo.dismissRecommendation(id);
  }

  // ---- Assistant chat ----
  @Post('conversations')
  startConversation(@Body() body: { cloudAccountId: string }, @CurrentUser('id') userId: string) {
    if (!body?.cloudAccountId) throw new BadRequestException('cloudAccountId is required');
    return this.assistant.startConversation(orgOf(userId), userId, body.cloudAccountId);
  }

  @Get('conversations')
  listConversations(@CurrentUser('id') userId: string) {
    return this.assistant.listConversations(userId);
  }

  @Get('conversations/:id/messages')
  messages(@Param('id') id: string) {
    return this.assistant.getMessages(id);
  }

  @Post('conversations/:id/messages')
  ask(@Param('id') id: string, @Body() body: { message: string }) {
    if (!body?.message) throw new BadRequestException('message is required');
    return this.assistant.ask(id, body.message);
  }
}
