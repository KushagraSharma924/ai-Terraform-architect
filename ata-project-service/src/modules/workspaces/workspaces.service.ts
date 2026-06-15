import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, sql } from 'drizzle-orm';
import {
  workspaces,
  workspaceMembers,
  workspaceInvitations,
  projects,
} from '../../database/schema';
import type { CreateWorkspaceDto, UpdateWorkspaceDto, InviteMemberDto } from './dto/workspace.dto';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const ROLE_HIERARCHY: Record<string, number> = { owner: 3, editor: 2, viewer: 1 };

@Injectable()
export class WorkspacesService {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  // ─── CRUD ─────────────────────────────────────────────────────────────────

  async create(userId: string, dto: CreateWorkspaceDto) {
    const baseSlug = slugify(dto.name);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const result = await this.db.transaction(async (tx) => {
      const [workspace] = await tx
        .insert(workspaces)
        .values({ name: dto.name, slug, ownerId: userId })
        .returning();

      await tx.insert(workspaceMembers).values({
        workspaceId: workspace.id,
        userId,
        role: 'owner',
      });

      return workspace;
    });

    return { ...result, role: 'owner' };
  }

  async findAllForUser(userId: string) {
    const rows = await this.db
      .select({
        workspace: workspaces,
        role: workspaceMembers.role,
      })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(eq(workspaceMembers.userId, userId));

    return rows.map((r) => ({ ...r.workspace, role: r.role }));
  }

  async findOne(workspaceId: string, userId: string) {
    const [row] = await this.db
      .select({ workspace: workspaces, role: workspaceMembers.role })
      .from(workspaceMembers)
      .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
      .limit(1);

    if (!row) throw new NotFoundException({ error: 'WORKSPACE_NOT_FOUND' });
    return { ...row.workspace, role: row.role };
  }

  async update(workspaceId: string, userId: string, dto: UpdateWorkspaceDto) {
    await this.requireRole(workspaceId, userId, 'owner');
    const slug = `${slugify(dto.name)}-${Date.now().toString(36)}`;
    const [updated] = await this.db
      .update(workspaces)
      .set({ name: dto.name, slug, updatedAt: new Date() })
      .where(eq(workspaces.id, workspaceId))
      .returning();
    return updated;
  }

  async remove(workspaceId: string, userId: string) {
    await this.requireRole(workspaceId, userId, 'owner');
    await this.db.delete(workspaces).where(eq(workspaces.id, workspaceId));
  }

  // ─── Members ───────────────────────────────────────────────────────────────

  async getMembers(workspaceId: string, userId: string) {
    await this.requireRole(workspaceId, userId, 'viewer');
    return this.db
      .select()
      .from(workspaceMembers)
      .where(eq(workspaceMembers.workspaceId, workspaceId));
  }

  async inviteMember(workspaceId: string, inviterId: string, dto: InviteMemberDto) {
    await this.requireRole(workspaceId, inviterId, 'editor');

    // Check not already a member (we don't have email in workspace_members, so check invitations)
    const [existing] = await this.db
      .select()
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.workspaceId, workspaceId),
          eq(workspaceInvitations.email, dto.email),
          eq(workspaceInvitations.status, 'pending'),
        ),
      )
      .limit(1);

    if (existing) throw new ConflictException({ error: 'ALREADY_INVITED' });

    const rawToken = generateSecureToken(32);
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const [invitation] = await this.db
      .insert(workspaceInvitations)
      .values({
        workspaceId,
        email: dto.email,
        role: dto.role,
        tokenHash,
        invitedBy: inviterId,
        expiresAt,
      })
      .returning();

    return { ...invitation, invitationToken: rawToken };
  }

  async acceptInvitation(rawToken: string, userId: string) {
    const tokenHash = hashToken(rawToken);
    const [invitation] = await this.db
      .select()
      .from(workspaceInvitations)
      .where(
        and(
          eq(workspaceInvitations.tokenHash, tokenHash),
          eq(workspaceInvitations.status, 'pending'),
        ),
      )
      .limit(1);

    if (!invitation || invitation.expiresAt < new Date()) {
      throw new BadRequestException({ error: 'INVALID_OR_EXPIRED_INVITATION' });
    }

    await this.db.transaction(async (tx) => {
      await tx
        .insert(workspaceMembers)
        .values({ workspaceId: invitation.workspaceId, userId, role: invitation.role })
        .onConflictDoNothing();

      await tx
        .update(workspaceInvitations)
        .set({ status: 'accepted' })
        .where(eq(workspaceInvitations.id, invitation.id));
    });

    return { workspaceId: invitation.workspaceId, role: invitation.role };
  }

  async updateMemberRole(
    workspaceId: string,
    requesterId: string,
    targetUserId: string,
    role: 'editor' | 'viewer',
  ) {
    await this.requireRole(workspaceId, requesterId, 'owner');

    const [member] = await this.db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      )
      .limit(1);

    if (!member) throw new NotFoundException({ error: 'MEMBER_NOT_FOUND' });
    if (member.role === 'owner') throw new BadRequestException({ error: 'CANNOT_MODIFY_OWNER' });

    const [updated] = await this.db
      .update(workspaceMembers)
      .set({ role })
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      )
      .returning();

    return updated;
  }

  async removeMember(workspaceId: string, requesterId: string, targetUserId: string) {
    await this.requireRole(workspaceId, requesterId, 'owner');
    await this.db
      .delete(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, targetUserId),
        ),
      );
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────

  async getMemberRole(workspaceId: string, userId: string): Promise<string | null> {
    const [row] = await this.db
      .select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, workspaceId),
          eq(workspaceMembers.userId, userId),
        ),
      )
      .limit(1);
    return row?.role ?? null;
  }

  async requireRole(workspaceId: string, userId: string, minimumRole: string) {
    const role = await this.getMemberRole(workspaceId, userId);
    if (!role) throw new ForbiddenException({ error: 'FORBIDDEN' });
    if ((ROLE_HIERARCHY[role] ?? 0) < (ROLE_HIERARCHY[minimumRole] ?? 0)) {
      throw new ForbiddenException({ error: 'INSUFFICIENT_PERMISSIONS' });
    }
  }
}

function generateSecureToken(length: number): string {
  const { randomBytes } = require('crypto');
  return randomBytes(length).toString('hex');
}

function hashToken(token: string): string {
  const { createHash } = require('crypto');
  return createHash('sha256').update(token).digest('hex');
}
