import {
  Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus, UseGuards,
} from '@nestjs/common';
import { WorkspacesService } from './workspaces.service';
import { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto, UpdateMemberRoleDto } from './dto/workspace.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('workspaces')
@UseGuards(JwtAuthGuard)
export class WorkspacesController {
  constructor(private readonly workspaces: WorkspacesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(@Body() dto: CreateWorkspaceDto, @CurrentUser('id') userId: string) {
    return this.workspaces.create(userId, dto);
  }

  @Get()
  findAll(@CurrentUser('id') userId: string) {
    return this.workspaces.findAllForUser(userId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.workspaces.findOne(id, userId);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateWorkspaceDto, @CurrentUser('id') userId: string) {
    return this.workspaces.update(id, userId, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.workspaces.remove(id, userId);
  }

  // ─── Members ───────────────────────────────────────────────────────────────

  @Get(':id/members')
  getMembers(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.workspaces.getMembers(id, userId);
  }

  @Post(':id/members/invite')
  @HttpCode(HttpStatus.CREATED)
  invite(@Param('id') id: string, @Body() dto: InviteMemberDto, @CurrentUser('id') userId: string) {
    return this.workspaces.inviteMember(id, userId, dto);
  }

  @Post('invitations/:token/accept')
  acceptInvitation(@Param('token') token: string, @CurrentUser('id') userId: string) {
    return this.workspaces.acceptInvitation(token, userId);
  }

  @Patch(':id/members/:userId')
  updateMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @Body() dto: UpdateMemberRoleDto,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.workspaces.updateMemberRole(id, requesterId, targetUserId, dto.role);
  }

  @Delete(':id/members/:userId')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMember(
    @Param('id') id: string,
    @Param('userId') targetUserId: string,
    @CurrentUser('id') requesterId: string,
  ) {
    return this.workspaces.removeMember(id, requesterId, targetUserId);
  }
}
