import { atLeast, can, permissionsFor } from './rbac';

describe('RBAC matrix', () => {
  it('owner can do everything sensitive', () => {
    expect(can('owner', 'org:delete')).toBe(true);
    expect(can('owner', 'member:remove')).toBe(true);
    expect(can('owner', 'deployment:approve')).toBe(true);
    expect(can('owner', 'billing:manage')).toBe(true);
  });

  it('admin manages members but cannot delete the org', () => {
    expect(can('admin', 'member:invite')).toBe(true);
    expect(can('admin', 'org:delete')).toBe(false);
    expect(can('admin', 'billing:manage')).toBe(false);
  });

  it('member can deploy and comment but not manage members', () => {
    expect(can('member', 'deployment:create')).toBe(true);
    expect(can('member', 'project:comment')).toBe(true);
    expect(can('member', 'member:invite')).toBe(false);
    expect(can('member', 'deployment:approve')).toBe(false);
  });

  it('viewer is read + comment only', () => {
    expect(can('viewer', 'project:read')).toBe(true);
    expect(can('viewer', 'project:write')).toBe(false);
    expect(can('viewer', 'deployment:create')).toBe(false);
  });

  it('billing role is scoped to billing', () => {
    expect(can('billing', 'billing:manage')).toBe(true);
    expect(can('billing', 'project:read')).toBe(false);
  });

  it('rank ordering via atLeast', () => {
    expect(atLeast('owner', 'admin')).toBe(true);
    expect(atLeast('member', 'admin')).toBe(false);
    expect(atLeast('admin', 'member')).toBe(true);
  });

  it('permissionsFor returns the role grant set', () => {
    expect(permissionsFor('viewer')).toContain('project:read');
    expect(permissionsFor('viewer')).not.toContain('project:write');
  });
});
