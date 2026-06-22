/**
 * Phase 10 — Role-Based Access Control.
 *
 * A small, explicit permission matrix. The AuthorizationService is the single
 * policy decision point consulted by every guarded action across the platform.
 */

export type Role = 'owner' | 'admin' | 'member' | 'viewer' | 'billing';

export type Permission =
  | 'org:read'
  | 'org:update'
  | 'org:delete'
  | 'member:invite'
  | 'member:remove'
  | 'member:role:update'
  | 'team:manage'
  | 'project:read'
  | 'project:write'
  | 'project:comment'
  | 'deployment:create'
  | 'deployment:approve'
  | 'billing:manage'
  | 'audit:read';

const MATRIX: Record<Role, Permission[]> = {
  owner: [
    'org:read', 'org:update', 'org:delete',
    'member:invite', 'member:remove', 'member:role:update',
    'team:manage',
    'project:read', 'project:write', 'project:comment',
    'deployment:create', 'deployment:approve',
    'billing:manage', 'audit:read',
  ],
  admin: [
    'org:read', 'org:update',
    'member:invite', 'member:remove', 'member:role:update',
    'team:manage',
    'project:read', 'project:write', 'project:comment',
    'deployment:create', 'deployment:approve',
    'audit:read',
  ],
  member: [
    'org:read',
    'project:read', 'project:write', 'project:comment',
    'deployment:create',
  ],
  viewer: ['org:read', 'project:read', 'project:comment'],
  billing: ['org:read', 'billing:manage'],
};

// Rank for "at least this role" checks.
const RANK: Record<Role, number> = { viewer: 0, billing: 1, member: 2, admin: 3, owner: 4 };

export function can(role: Role, permission: Permission): boolean {
  return MATRIX[role]?.includes(permission) ?? false;
}

export function atLeast(role: Role, min: Role): boolean {
  return RANK[role] >= RANK[min];
}

export function permissionsFor(role: Role): Permission[] {
  return MATRIX[role] ?? [];
}
