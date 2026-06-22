import { ForbiddenException, Injectable } from '@nestjs/common';
import { OrgRepository } from '../repositories/org.repository';
import { can, Permission, Role } from '../rbac/rbac';

/**
 * Central Policy Decision Point. Every guarded action resolves the caller's
 * membership role and checks it against the RBAC matrix. Cross-tenant access
 * fails closed: a non-member has no role and therefore no permissions.
 */
@Injectable()
export class AuthorizationService {
  constructor(private readonly repo: OrgRepository) {}

  async roleOf(organizationId: string, userId: string): Promise<Role | null> {
    const member = await this.repo.getMember(organizationId, userId);
    return (member?.role as Role) ?? null;
  }

  async authorize(organizationId: string, userId: string, permission: Permission): Promise<Role> {
    const role = await this.roleOf(organizationId, userId);
    if (!role || !can(role, permission)) {
      throw new ForbiddenException(`Missing permission: ${permission}`);
    }
    return role;
  }
}
