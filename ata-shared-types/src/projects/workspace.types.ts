// ─── Primitive union types ────────────────────────────────────────────────────

export type WorkspaceRole = 'owner' | 'editor' | 'viewer';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

// ─── Core records ─────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceWithRole extends Workspace {
  role: WorkspaceRole;
  memberCount: number;
  projectCount: number;
}

export interface WorkspaceMember {
  userId: string;
  email: string;
  fullName: string;
  role: WorkspaceRole;
  joinedAt: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  role: WorkspaceRole;
  status: InvitationStatus;
  expiresAt: string;
}

// ─── DTOs ─────────────────────────────────────────────────────────────────────

export interface CreateWorkspaceDto {
  name: string;
}

export interface UpdateWorkspaceDto {
  name: string;
}

export interface InviteMemberDto {
  email: string;
  role: Exclude<WorkspaceRole, 'owner'>;
}

export interface UpdateMemberRoleDto {
  role: Exclude<WorkspaceRole, 'owner'>;
}
