import { Module } from '@nestjs/common';
import { OrgController, NotificationController } from './controllers/org.controller';
import { OrgRepository } from './repositories/org.repository';
import { AuthorizationService } from './services/authorization.service';
import { OrgService } from './services/org.service';
import { CollaborationService } from './services/collaboration.service';

@Module({
  controllers: [OrgController, NotificationController],
  providers: [OrgRepository, AuthorizationService, OrgService, CollaborationService],
})
export class OrgModule {}
