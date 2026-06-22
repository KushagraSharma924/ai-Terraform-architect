import { Injectable } from '@nestjs/common';
import { InjectDrizzle } from '../../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq, and, desc } from 'drizzle-orm';
import {
  organizations,
  organizationMembers,
  teams,
  teamMembers,
  comments,
  approvalPolicies,
  deploymentApprovals,
  auditLogs,
  activityEvents,
  notifications,
} from '../../../database/schema';

@Injectable()
export class OrgRepository {
  constructor(@InjectDrizzle() private readonly db: NodePgDatabase) {}

  // organizations
  async createOrg(data: typeof organizations.$inferInsert) {
    const [row] = await this.db.insert(organizations).values(data).returning();
    return row;
  }
  async findOrg(id: string) {
    const [row] = await this.db.select().from(organizations).where(eq(organizations.id, id)).limit(1);
    return row || null;
  }
  async updateOrg(id: string, data: Partial<typeof organizations.$inferInsert>) {
    const [row] = await this.db.update(organizations).set(data).where(eq(organizations.id, id)).returning();
    return row;
  }
  async listOrgsForUser(userId: string) {
    return this.db
      .select({ org: organizations, role: organizationMembers.role })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
      .where(eq(organizationMembers.userId, userId));
  }

  // members
  async addMember(data: typeof organizationMembers.$inferInsert) {
    const [row] = await this.db
      .insert(organizationMembers)
      .values(data)
      .onConflictDoUpdate({
        target: [organizationMembers.organizationId, organizationMembers.userId],
        set: { role: data.role, status: data.status ?? 'active' },
      })
      .returning();
    return row;
  }
  async getMember(organizationId: string, userId: string) {
    const [row] = await this.db
      .select()
      .from(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)))
      .limit(1);
    return row || null;
  }
  async listMembers(organizationId: string) {
    return this.db.select().from(organizationMembers).where(eq(organizationMembers.organizationId, organizationId));
  }
  async updateMemberRole(organizationId: string, userId: string, role: string) {
    const [row] = await this.db
      .update(organizationMembers)
      .set({ role })
      .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)))
      .returning();
    return row;
  }
  async removeMember(organizationId: string, userId: string) {
    await this.db
      .delete(organizationMembers)
      .where(and(eq(organizationMembers.organizationId, organizationId), eq(organizationMembers.userId, userId)));
  }

  // teams
  async createTeam(data: typeof teams.$inferInsert) {
    const [row] = await this.db.insert(teams).values(data).returning();
    return row;
  }
  async listTeams(organizationId: string) {
    return this.db.select().from(teams).where(eq(teams.organizationId, organizationId));
  }
  async addTeamMember(data: typeof teamMembers.$inferInsert) {
    await this.db.insert(teamMembers).values(data).onConflictDoNothing();
  }

  // comments
  async addComment(data: typeof comments.$inferInsert) {
    const [row] = await this.db.insert(comments).values(data).returning();
    return row;
  }
  async listComments(projectId: string) {
    return this.db.select().from(comments).where(eq(comments.projectId, projectId)).orderBy(comments.createdAt);
  }

  // approvals
  async upsertApprovalPolicy(data: typeof approvalPolicies.$inferInsert) {
    const [row] = await this.db.insert(approvalPolicies).values(data).returning();
    return row;
  }
  async getApprovalPolicy(organizationId: string, projectId: string | null) {
    const [row] = await this.db
      .select()
      .from(approvalPolicies)
      .where(eq(approvalPolicies.organizationId, organizationId))
      .limit(1);
    return row || null;
  }
  async recordApproval(data: typeof deploymentApprovals.$inferInsert) {
    const [row] = await this.db.insert(deploymentApprovals).values(data).returning();
    return row;
  }
  async listApprovals(deploymentId: string) {
    return this.db.select().from(deploymentApprovals).where(eq(deploymentApprovals.deploymentId, deploymentId));
  }

  // audit + activity + notifications
  async audit(data: typeof auditLogs.$inferInsert) {
    await this.db.insert(auditLogs).values(data);
  }
  async listAudit(organizationId: string, limit = 100) {
    return this.db
      .select()
      .from(auditLogs)
      .where(eq(auditLogs.organizationId, organizationId))
      .orderBy(desc(auditLogs.createdAt))
      .limit(limit);
  }
  async activity(data: typeof activityEvents.$inferInsert) {
    await this.db.insert(activityEvents).values(data);
  }
  async listActivity(organizationId: string, limit = 100) {
    return this.db
      .select()
      .from(activityEvents)
      .where(eq(activityEvents.organizationId, organizationId))
      .orderBy(desc(activityEvents.createdAt))
      .limit(limit);
  }
  async notify(data: typeof notifications.$inferInsert) {
    const [row] = await this.db.insert(notifications).values(data).returning();
    return row;
  }
  async listNotifications(userId: string) {
    return this.db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(50);
  }
  async markNotificationRead(id: string) {
    await this.db.update(notifications).set({ readAt: new Date(), status: 'read' }).where(eq(notifications.id, id));
  }
}
