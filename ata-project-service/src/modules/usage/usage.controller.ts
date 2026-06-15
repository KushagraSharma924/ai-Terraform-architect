import { Controller, Get, UseGuards } from '@nestjs/common';
import { UsageService } from './usage.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('usage')
@UseGuards(JwtAuthGuard)
export class UsageController {
  constructor(private readonly usage: UsageService) {}

  @Get('quota')
  getQuota(
    @CurrentUser('id') userId: string,
    @CurrentUser('subscriptionTier') tier: string,
  ) {
    return this.usage.getQuota(userId, tier ?? 'free');
  }
}
