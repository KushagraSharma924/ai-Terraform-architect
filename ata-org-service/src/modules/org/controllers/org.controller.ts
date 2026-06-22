import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { OrgService } from '../services/org.service';
import { CollaborationService } from '../services/collaboration.service';
import {
  AddTeamMemberDto,
  ApprovalPolicyDto,
  CommentDto,
  CreateOrgDto,
  CreateTeamDto,
  DecisionDto,
  InviteMemberDto,
  UpdateRoleDto,
} from './org.dto';

@Controller('orgs')
@UseGuards(JwtAuthGuard)
export class OrgController {
  constructor(
    private readonly orgs: OrgService,
    private readonly collab: CollaborationService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateOrgDto, @CurrentUser('id') userId: string) {
    return this.orgs.create(userId, dto.name);
  }

  @Get()
  listMine(@CurrentUser('id') userId: string) {
    return this.orgs.listMine(userId);
  }

  @Get(':id')
  get(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orgs.get(id, userId);
  }

  // members
  @Post(':id/members')
  invite(@Param('id') id: string, @Body() dto: InviteMemberDto, @CurrentUser('id') userId: string) {
    return this.orgs.invite(id, userId, dto.userId, dto.role);
  }

  @Get(':id/members')
  members(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orgs.listMembers(id, userId);
  }

  @Patch(':id/members/:memberId')
  updateRole(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateRoleDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgs.updateRole(id, userId, memberId, dto.role);
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @Param('memberId') memberId: string, @CurrentUser('id') userId: string) {
    return this.orgs.removeMember(id, userId, memberId);
  }

  // teams
  @Post(':id/teams')
  createTeam(@Param('id') id: string, @Body() dto: CreateTeamDto, @CurrentUser('id') userId: string) {
    return this.orgs.createTeam(id, userId, dto.name);
  }

  @Get(':id/teams')
  teams(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orgs.listTeams(id, userId);
  }

  @Post(':id/teams/:teamId/members')
  addTeamMember(
    @Param('id') id: string,
    @Param('teamId') teamId: string,
    @Body() dto: AddTeamMemberDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.orgs.addTeamMember(id, userId, teamId, dto.userId);
  }

  // audit / activity
  @Get(':id/audit-logs')
  audit(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orgs.audit(id, userId);
  }

  @Get(':id/activity')
  activity(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.orgs.activity(id, userId);
  }

  // collaboration: comments + approvals
  @Post(':id/comments')
  comment(@Param('id') id: string, @Body() dto: CommentDto, @CurrentUser('id') userId: string) {
    return this.collab.comment(id, userId, dto.projectId, dto.body, dto.parentId);
  }

  @Get(':id/projects/:projectId/comments')
  listComments(@Param('projectId') projectId: string) {
    return this.collab.listComments(projectId);
  }

  @Post(':id/approval-policies')
  setPolicy(@Param('id') id: string, @Body() dto: ApprovalPolicyDto, @CurrentUser('id') userId: string) {
    return this.collab.setApprovalPolicy(id, userId, dto.requiredApprovers, dto.projectId);
  }

  @Post(':id/approvals')
  decide(@Param('id') id: string, @Body() dto: DecisionDto, @CurrentUser('id') userId: string) {
    return this.collab.decide(id, userId, dto.deploymentId, dto.decision, dto.comment);
  }

  @Get(':id/approvals/:deploymentId')
  approvalStatus(@Param('id') id: string, @Param('deploymentId') deploymentId: string) {
    return this.collab.status(id, deploymentId);
  }
}

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly collab: CollaborationService) {}

  @Get()
  list(@CurrentUser('id') userId: string) {
    return this.collab.listNotifications(userId);
  }

  @Post(':id/read')
  read(@Param('id') id: string) {
    return this.collab.markRead(id);
  }
}
