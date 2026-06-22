'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { securityApi } from '@/lib/api/security.api';
import { toast } from 'sonner';
import { ShieldCheck, ShieldAlert, ScanLine } from 'lucide-react';

const SEV_COLORS: Record<string, string> = {
  critical: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  medium: 'bg-amber-100 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
  info: 'bg-slate-100 text-slate-500',
};
const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-600', B: 'text-lime-600', C: 'text-amber-600', D: 'text-orange-600', F: 'text-red-600',
};

export default function ScansPage() {
  const [versionId, setVersionId] = useState('');
  const [scanId, setScanId] = useState<string | null>(null);

  const { data: scan } = useQuery({
    queryKey: ['scan', scanId],
    queryFn: () => securityApi.getScan(scanId!),
    enabled: !!scanId,
    refetchInterval: (q) => (q.state.data?.status === 'completed' || q.state.data?.status === 'failed' ? false : 2000),
  });

  const { data: findings } = useQuery({
    queryKey: ['scan-findings', scanId],
    queryFn: () => securityApi.findings(scanId!),
    enabled: scan?.status === 'completed',
  });

  const { data: compliance } = useQuery({
    queryKey: ['scan-compliance', scanId],
    queryFn: () => securityApi.compliance(scanId!),
    enabled: scan?.status === 'completed',
  });

  const startScan = useMutation({
    mutationFn: () => securityApi.createScan({ targetType: 'project_version', targetId: versionId }),
    onSuccess: (s) => { setScanId(s.id); toast.success('Scan started'); },
    onError: () => toast.error('Could not start scan'),
  });

  const frameworks = compliance ? [...new Set(compliance.map((c: any) => c.framework))] : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <ShieldCheck className="h-7 w-7" /> Security &amp; Compliance
        </h1>
        <p className="text-sm text-slate-500">Scan a Terraform version for misconfigurations and compliance readiness.</p>
      </div>

      <Card>
        <CardHeader><CardTitle>Run a scan</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Terraform version id" value={versionId} onChange={(e) => setVersionId(e.target.value)} />
          <Button onClick={() => startScan.mutate()} disabled={!versionId || startScan.isPending}>
            <ScanLine className="h-4 w-4 mr-1" /> Scan
          </Button>
        </CardContent>
      </Card>

      {scan && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Scan result</span>
              {scan.status === 'completed' && (
                <span className="flex items-center gap-3">
                  <span className={`text-3xl font-extrabold ${GRADE_COLORS[scan.grade] ?? ''}`}>{scan.grade}</span>
                  <span className="text-sm text-slate-500">score {scan.riskScore}/100</span>
                </span>
              )}
            </CardTitle>
            <CardDescription>Status: {scan.status}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {frameworks.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {frameworks.map((f: any) => {
                  const controls = compliance.filter((c: any) => c.framework === f);
                  const pass = controls.filter((c: any) => c.status === 'pass').length;
                  const pct = Math.round((pass / controls.length) * 100);
                  return (
                    <div key={f} className="rounded-md border p-3 text-center">
                      <div className="text-xs uppercase text-slate-500">{f}</div>
                      <div className="text-2xl font-bold">{pct}%</div>
                      <div className="text-xs text-slate-400">{pass}/{controls.length} controls</div>
                    </div>
                  );
                })}
              </div>
            )}

            {findings && (
              <div className="space-y-2">
                <h3 className="font-medium flex items-center gap-2"><ShieldAlert className="h-4 w-4" /> Findings ({findings.length})</h3>
                {findings.length === 0 && <p className="text-sm text-green-600">No findings — clean.</p>}
                {findings.map((f: any) => (
                  <div key={f.id} className="rounded-md border p-3 text-sm flex items-start gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${SEV_COLORS[f.severity]}`}>{f.severity}</span>
                    <div>
                      <div className="font-medium">{f.message}</div>
                      <div className="text-xs text-slate-500">{f.resource} · {f.filePath}:{f.line} · {f.ruleId}</div>
                      {f.remediation && <div className="text-xs text-indigo-600 mt-1">{f.remediation}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
