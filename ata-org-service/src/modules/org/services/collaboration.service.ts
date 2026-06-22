import { Injectable } from '@nestjs/common';
import { OrgRepository } from '../repositories/org.repository';
import { AuthorizationService } from './authorization.service';

export interface ApprovalDecision {
  pass: boolean;
  required: number;
  approvals: number;
}

@Injectable()
export class CollaborationService {
  constructor(
    private readonly repo: OrgRepository,
    private readonly authz: AuthorizationService,
  ) {}

  // ---- comments ----
  async comment(organizationId: string, userId: string, projectId: string, body: string, parentId?: string) {
    await this.authz.authorize(organizationId, userId, 'project:comment');
    const comment = await this.repo.addComment({ organizationId, projectId, authorId: userId, body, parentId });
    await this.repo.activity({ organizationId, projectId, actorId: userId, type: 'comment.added', payload: { commentId: comment.id } });
    return comment;
  }

  listComments(projectId: string) {
    return this.repo.listComments(projectId);
  }

  // ---- approvals ----
  async setApprovalPolicy(organizationId: string, userId: string, requiredApprovers: number, projectId?: string) {
    await this.authz.authorize(organizationId, userId, 'org:update');
    return this.repo.upsertApprovalPolicy({ organizationId, projectId, requiredApprovers });
  }

  /** Record an approve/reject and return whether the policy is now satisfied. */
  async decide(
    organizationId: string,
    userId: string,
    deploymentId: string,
    decision: 'approved' | 'rejected',
    comment?: string,
  ): Promise<ApprovalDecision> {
    await this.authz.authorize(organizationId, userId, 'deployment:approve');
    await this.repo.recordApproval({ organizationId, deploymentId, approverId: userId, decision, comment });
    await this.repo.audit({ organizationId, actorId: userId, action: `deployment.${decision}`, targetType: 'deployment', targetId: deploymentId });
    return this.status(organizationId, deploymentId);
  }

  /** Gate verdict consumed by the deployment service before apply. */
  async status(organizationId: string, deploymentId: string): Promise<ApprovalDecision> {
    const policy = await this.repo.getApprovalPolicy(organizationId, null);
    const required = policy?.requiredApprovers ?? 1;
    const all = await this.repo.listApprovals(deploymentId);
    if (all.some((a) => a.decision === 'rejected')) {
      return { pass: false, required, approvals: 0 };
    }
    const approvals = new Set(all.filter((a) => a.decision === 'approved').map((a) => a.approverId)).size;
    return { pass: approvals >= required, required, approvals };
  }

  // ---- notifications ----
  listNotifications(userId: string) {
    return this.repo.listNotifications(userId);
  }
  markRead(id: string) {
    return this.repo.markNotificationRead(id);
  }
}
