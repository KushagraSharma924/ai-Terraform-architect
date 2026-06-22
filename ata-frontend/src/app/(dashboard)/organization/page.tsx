'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { orgApi, Organization } from '@/lib/api/org.api';
import { toast } from 'sonner';
import { Building2, Users, History, Plus, UserPlus } from 'lucide-react';

const ROLE_COLORS: Record<string, string> = {
  owner: 'bg-purple-100 text-purple-700',
  admin: 'bg-blue-100 text-blue-700',
  member: 'bg-green-100 text-green-700',
  viewer: 'bg-slate-100 text-slate-600',
  billing: 'bg-amber-100 text-amber-700',
};

export default function OrganizationPage() {
  const qc = useQueryClient();
  const [orgId, setOrgId] = useState<string>('');
  const [newOrg, setNewOrg] = useState('');
  const [inviteUser, setInviteUser] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [teamName, setTeamName] = useState('');

  const { data: orgs } = useQuery<{ org: Organization; role: string }[]>({ queryKey: ['orgs'], queryFn: orgApi.listMine });

  useEffect(() => { if (!orgId && orgs?.length) setOrgId(orgs[0].org.id); }, [orgs, orgId]);

  const { data: members } = useQuery({ queryKey: ['org-members', orgId], queryFn: () => orgApi.members(orgId), enabled: !!orgId });
  const { data: teams } = useQuery({ queryKey: ['org-teams', orgId], queryFn: () => orgApi.teams(orgId), enabled: !!orgId });
  const { data: audit } = useQuery({ queryKey: ['org-audit', orgId], queryFn: () => orgApi.audit(orgId), enabled: !!orgId });

  const createOrg = useMutation({
    mutationFn: () => orgApi.create(newOrg),
    onSuccess: () => { setNewOrg(''); toast.success('Organization created'); qc.invalidateQueries({ queryKey: ['orgs'] }); },
  });
  const invite = useMutation({
    mutationFn: () => orgApi.invite(orgId, { userId: inviteUser, role: inviteRole }),
    onSuccess: () => { setInviteUser(''); toast.success('Member invited'); qc.invalidateQueries({ queryKey: ['org-members', orgId] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Invite failed'),
  });
  const createTeam = useMutation({
    mutationFn: () => orgApi.createTeam(orgId, teamName),
    onSuccess: () => { setTeamName(''); toast.success('Team created'); qc.invalidateQueries({ queryKey: ['org-teams', orgId] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Failed (needs admin)'),
  });
  const updateRole = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: string }) => orgApi.updateRole(orgId, uid, role),
    onSuccess: () => { toast.success('Role updated'); qc.invalidateQueries({ queryKey: ['org-members', orgId] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? 'Update failed'),
  });

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2"><Building2 className="h-7 w-7" /> Organization</h1>
          <p className="text-sm text-slate-500">Manage members, roles, teams, and audit trail.</p>
        </div>
        {orgs && orgs.length > 0 && (
          <select className="rounded-md border bg-transparent px-2 text-sm" value={orgId} onChange={(e) => setOrgId(e.target.value)}>
            {orgs.map((o) => <option key={o.org.id} value={o.org.id}>{o.org.name} ({o.role})</option>)}
          </select>
        )}
      </div>

      {(!orgs || orgs.length === 0) && (
        <Card>
          <CardHeader><CardTitle>Create your organization</CardTitle><CardDescription>You become the owner.</CardDescription></CardHeader>
          <CardContent className="flex gap-2">
            <Input placeholder="Acme Inc" value={newOrg} onChange={(e) => setNewOrg(e.target.value)} />
            <Button onClick={() => createOrg.mutate()} disabled={!newOrg}><Plus className="h-4 w-4 mr-1" /> Create</Button>
          </CardContent>
        </Card>
      )}

      {orgId && (
        <>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" /> Members</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="User id to invite" value={inviteUser} onChange={(e) => setInviteUser(e.target.value)} />
                <select className="rounded-md border bg-transparent px-2 text-sm" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  <option value="admin">admin</option><option value="member">member</option>
                  <option value="viewer">viewer</option><option value="billing">billing</option>
                </select>
                <Button onClick={() => invite.mutate()} disabled={!inviteUser}><UserPlus className="h-4 w-4 mr-1" /> Invite</Button>
              </div>
              {members?.map((m: any) => (
                <div key={m.userId} className="flex items-center justify-between rounded-md border p-2 text-sm">
                  <span className="font-mono text-xs">{m.userId}</span>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${ROLE_COLORS[m.role]}`}>{m.role}</span>
                    {m.role !== 'owner' && (
                      <select className="rounded border bg-transparent text-xs px-1" value={m.role}
                        onChange={(e) => updateRole.mutate({ uid: m.userId, role: e.target.value })}>
                        <option value="admin">admin</option><option value="member">member</option>
                        <option value="viewer">viewer</option><option value="billing">billing</option>
                      </select>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Teams</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input placeholder="Team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                <Button onClick={() => createTeam.mutate()} disabled={!teamName}>Create team</Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {teams?.map((t: any) => <span key={t.id} className="rounded-full border px-3 py-1 text-sm">{t.name}</span>)}
                {!teams?.length && <p className="text-sm text-slate-400">No teams yet.</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5" /> Audit log</CardTitle></CardHeader>
            <CardContent className="space-y-1">
              {audit?.map((a: any) => (
                <div key={a.id} className="flex justify-between text-xs border-b py-1">
                  <span className="font-medium">{a.action}</span>
                  <span className="text-slate-400">{new Date(a.createdAt).toLocaleString()}</span>
                </div>
              ))}
              {!audit?.length && <p className="text-sm text-slate-400">No audit events yet.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
