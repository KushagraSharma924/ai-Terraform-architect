'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { deploymentsApi, CloudAccount } from '@/lib/api/deployments.api';
import { toast } from 'sonner';
import { Rocket, Cloud, ShieldCheck, Plus, CheckCircle2 } from 'lucide-react';

const STATE_COLORS: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-700',
  planning: 'bg-blue-100 text-blue-700',
  plan_ready: 'bg-indigo-100 text-indigo-700',
  awaiting_approval: 'bg-amber-100 text-amber-700',
  applying: 'bg-blue-100 text-blue-700',
  applied: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700',
  destroyed: 'bg-slate-200 text-slate-600',
  rolled_back: 'bg-purple-100 text-purple-700',
};

export default function DeploymentsPage() {
  const qc = useQueryClient();
  const [roleArn, setRoleArn] = useState('');
  const [region, setRegion] = useState('us-east-1');
  const [versionId, setVersionId] = useState('');
  const [accountId, setAccountId] = useState('');
  const [deploymentId, setDeploymentId] = useState<string | null>(null);

  const { data: accounts } = useQuery<CloudAccount[]>({
    queryKey: ['cloud-accounts'],
    queryFn: deploymentsApi.listAccounts,
  });

  const { data: deployment } = useQuery({
    queryKey: ['deployment', deploymentId],
    queryFn: () => deploymentsApi.get(deploymentId!),
    enabled: !!deploymentId,
    refetchInterval: deploymentId ? 3000 : false,
  });

  const connect = useMutation({
    mutationFn: () => deploymentsApi.connectAccount({ authMethod: 'assume_role', roleArn, defaultRegion: region }),
    onSuccess: (acc) => {
      toast.success(`Account connected. ExternalId: ${acc.externalId?.slice(0, 12)}…`);
      setRoleArn('');
      qc.invalidateQueries({ queryKey: ['cloud-accounts'] });
    },
    onError: () => toast.error('Failed to connect account'),
  });

  const verify = useMutation({
    mutationFn: (id: string) => deploymentsApi.verifyAccount(id),
    onSuccess: () => {
      toast.success('Account verified');
      qc.invalidateQueries({ queryKey: ['cloud-accounts'] });
    },
    onError: () => toast.error('Verification failed'),
  });

  const createDeployment = useMutation({
    mutationFn: () => deploymentsApi.create({ cloudAccountId: accountId, projectVersionId: versionId }),
    onSuccess: (d) => {
      setDeploymentId(d.id);
      toast.success('Deployment created');
    },
    onError: () => toast.error('Could not create deployment (account must be verified)'),
  });

  const makeAction = (fn: (id: string) => Promise<unknown>, label: string) => ({
    mutationFn: () => fn(deploymentId!),
    onSuccess: () => {
      toast.success(`${label} triggered`);
      qc.invalidateQueries({ queryKey: ['deployment', deploymentId] });
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? `${label} failed`),
  });

  const plan = useMutation(makeAction(deploymentsApi.plan, 'Plan'));
  const approve = useMutation(makeAction(deploymentsApi.approve, 'Approval'));
  const apply = useMutation(makeAction(deploymentsApi.apply, 'Apply'));
  const destroy = useMutation(makeAction(deploymentsApi.destroy, 'Destroy'));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <Rocket className="h-7 w-7" /> Cloud Deployments
        </h1>
        <p className="text-sm text-slate-500">Connect a cloud account, plan, approve, and apply your Terraform.</p>
      </div>

      {/* Connect account */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Cloud className="h-5 w-5" /> Connect AWS account</CardTitle>
          <CardDescription>Uses AssumeRole — no long-lived keys are stored.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="arn:aws:iam::123456789012:role/AtaDeployRole" value={roleArn} onChange={(e) => setRoleArn(e.target.value)} />
            <Input className="w-40" value={region} onChange={(e) => setRegion(e.target.value)} />
            <Button onClick={() => connect.mutate()} disabled={!roleArn || connect.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Connect
            </Button>
          </div>
          <div className="space-y-2">
            {accounts?.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
                <div>
                  <div className="font-mono text-xs">{a.roleArn ?? a.id}</div>
                  <div className="text-slate-500">{a.defaultRegion} · {a.authMethod}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs ${a.status === 'verified' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{a.status}</span>
                  {a.status !== 'verified' && (
                    <Button size="sm" variant="outline" onClick={() => verify.mutate(a.id)}>
                      <ShieldCheck className="h-4 w-4 mr-1" /> Verify
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setAccountId(a.id)}>Use</Button>
                </div>
              </div>
            ))}
            {!accounts?.length && <p className="text-sm text-slate-400">No accounts connected yet.</p>}
          </div>
        </CardContent>
      </Card>

      {/* New deployment */}
      <Card>
        <CardHeader>
          <CardTitle>New deployment</CardTitle>
          <CardDescription>Deploy a generated Terraform version.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input placeholder="Cloud account id" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
            <Input placeholder="Terraform version id" value={versionId} onChange={(e) => setVersionId(e.target.value)} />
            <Button onClick={() => createDeployment.mutate()} disabled={!accountId || !versionId}>Create</Button>
          </div>
        </CardContent>
      </Card>

      {/* Lifecycle */}
      {deployment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Deployment
              <span className={`rounded-full px-2 py-0.5 text-xs ${STATE_COLORS[deployment.state] ?? 'bg-slate-100'}`}>{deployment.state}</span>
            </CardTitle>
            <CardDescription className="font-mono text-xs">{deployment.id}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {deployment.planSummary && (
              <div className="flex gap-4 text-sm">
                <span className="text-green-600">+{deployment.planSummary.add} add</span>
                <span className="text-amber-600">~{deployment.planSummary.change} change</span>
                <span className="text-red-600">-{deployment.planSummary.destroy} destroy</span>
                {deployment.costEstimate && <span className="ml-auto font-medium">~${deployment.costEstimate.monthlyUsd}/mo</span>}
              </div>
            )}
            {deployment.error && <p className="text-sm text-red-600">{deployment.error}</p>}
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={() => plan.mutate()}>Plan</Button>
              <Button size="sm" variant="outline" onClick={() => approve.mutate()}>Approve</Button>
              <Button size="sm" onClick={() => apply.mutate()}><CheckCircle2 className="h-4 w-4 mr-1" /> Apply</Button>
              <Button size="sm" variant="destructive" onClick={() => destroy.mutate()}>Destroy</Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
