import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { OrgRepository } from '../repositories/org.repository';
import { AuthorizationService } from './authorization.service';
import { atLeast, Role } from '../rbac/rbac';

function slugify(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'org';
}

@Injectable()
export class OrgService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly authz: AuthorizationService,
  ) {}

  async create(userId: string, name: string) {
    const org = await this.repo.createOrg({
      name,
      slug: `${slugify(name)}-${Date.now().toString(36)}`,
      createdBy: userId,
    });
    await this.repo.addMember({ organizationId: org.id, userId, role: 'owner', status: 'active' });
    await this.repo.audit({ organizationId: org.id, actorId: userId, action: 'org.created', targetType: 'org', targetId: org.id });
    await this.repo.activity({ organizationId: org.id, actorId: userId, type: 'org.created', payload: { name } });
    return org;
  }

  listMine(userId: string) {
    return this.repo.listOrgsForUser(userId);
  }

  async get(organizationId: string, userId: string) {
    await this.authz.authorize(organizationId, userId, 'org:read');
    const org = await this.repo.findOrg(organizationId);
    if (!org) throw new NotFoundException('Organization not found');
    return org;
  }

  // ---- members ----
  async invite(organizationId: string, actorId: string, inviteeUserId: string, role: Role) {
    await this.authz.authorize(organizationId, actorId, 'member:invite');
    if (role === 'owner') throw new BadRequestException('Cannot invite a second owner');
    const member = await this.repo.addMember({
      organizationId,
      userId: inviteeUserId,
      role,
      status: 'active',
      invitedBy: actorId,
    });
    await this.repo.audit({ organizationId, actorId, action: 'member.invited', targetType: 'user', targetId: inviteeUserId, metadata: { role } });
    await this.repo.notify({ organizationId, userId: inviteeUserId, type: 'member.invited', payload: { organizationId, role } });
    return member;
  }

  async listMembers(organizationId: string, userId: string) {
    await this.authz.authorize(organizationId, userId, 'org:read');
    return this.repo.listMembers(organizationId);
  }

  async updateRole(organizationId: string, actorId: string, userId: string, role: Role) {
    await this.authz.authorize(organizationId, actorId, 'member:role:update');
    const updated = await this.repo.updateMemberRole(organizationId, userId, role);
    if (!updated) throw new NotFoundException('Member not found');
    await this.repo.audit({ organizationId, actorId, action: 'member.role_updated', targetType: 'user', targetId: userId, metadata: { role } });
    return updated;
  }

  async removeMember(organizationId: string, actorId: string, userId: string) {
    await this.authz.authorize(organizationId, actorId, 'member:remove');
    await this.repo.removeMember(organizationId, userId);
    await this.repo.audit({ organizationId, actorId, action: 'member.removed', targetType: 'user', targetId: userId });
  }

  // ---- teams ----
  async createTeam(organizationId: string, actorId: string, name: string) {
    await this.authz.authorize(organizationId, actorId, 'team:manage');
    const team = await this.repo.createTeam({ organizationId, name });
    await this.repo.audit({ organizationId, actorId, action: 'team.created', targetType: 'team', targetId: team.id });
    return team;
  }

  async listTeams(organizationId: string, userId: string) {
    await this.authz.authorize(organizationId, userId, 'org:read');
    return this.repo.listTeams(organizationId);
  }

  async addTeamMember(organizationId: string, actorId: string, teamId: string, userId: string) {
    await this.authz.authorize(organizationId, actorId, 'team:manage');
    await this.repo.addTeamMember({ teamId, userId });
    return { teamId, userId };
  }

  // ---- audit / activity / notifications ----
  async audit(organizationId: string, userId: string) {
    await this.authz.authorize(organizationId, userId, 'audit:read');
    return this.repo.listAudit(organizationId);
  }
  async activity(organizationId: string, userId: string) {
    await this.authz.authorize(organizationId, userId, 'org:read');
    return this.repo.listActivity(organizationId);
  }
}
