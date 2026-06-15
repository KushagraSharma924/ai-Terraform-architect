'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { projectsApi } from '@/lib/api/projects.api';
import { workspacesApi } from '@/lib/api/workspaces.api';
import { useAuthStore } from '@/lib/store/auth.store';
import Link from 'next/link';
import { Plus, Terminal, Settings, ShieldAlert, BookOpen, Activity, Play, CheckCircle } from 'lucide-react';

export default function DashboardPage() {
  const user = useAuthStore((state) => state.user);

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.list,
  });

  const { data: quota, isLoading: isLoadingQuota } = useQuery({
    queryKey: ['quota'],
    queryFn: projectsApi.getUsageQuota,
  });

  // Mock list of recent runs with realistic statuses
  const recentRuns = [
    {
      id: 'gen-1',
      projectName: 'Multi-AZ Web Service',
      spec: 'AWS ECS Fargate tier, multi-subnet public/private VPC, RDS Postgres',
      status: 'success',
      timestamp: '2 hours ago',
    },
    {
      id: 'gen-2',
      projectName: 'S3 Data Lake Config',
      spec: 'AWS S3 bucket with lifecycle rules, SSE encryption, private subnets',
      status: 'success',
      timestamp: '1 day ago',
    },
    {
      id: 'gen-3',
      projectName: 'Legacy Migration Block',
      spec: 'VPC subnets validation and security group mappings',
      status: 'failed',
      timestamp: '3 days ago',
    }
  ];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Header welcome */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 dark:from-white dark:via-slate-200 dark:to-slate-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Welcome back, {user?.fullName || 'Developer'}. Orchestrate and validate your HCL modules deterministically.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild size="sm" className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold">
            <Link href="/workspaces">
              <Plus className="mr-2 h-4 w-4" /> Create Workspace
            </Link>
          </Button>
        </div>
      </div>

      {/* Connectivity Status widgets */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Auth Service</span>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">Connected</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Project Service</span>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">Connected</span>
        </div>
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Activity className="h-4 w-4 text-emerald-500" />
            <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Generator Daemon</span>
          </div>
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-500">Connected</span>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="dark:bg-slate-900/40 dark:border-slate-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoadingWorkspaces ? '...' : workspaces?.length || 0}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Active projects & directories
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900/40 dark:border-slate-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Subscription Tier</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold capitalize">
              {isLoadingQuota ? '...' : quota?.tier || user?.subscriptionTier || 'Free'}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Limits refresh monthly
            </p>
          </CardContent>
        </Card>

        <Card className="dark:bg-slate-900/40 dark:border-slate-800/80">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-slate-400 uppercase tracking-wider">Usage Quota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {isLoadingQuota 
                ? '...' 
                : `${quota?.generationsUsed || 0} / ${quota?.generationsLimit || 0}`}
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Generations completed
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action shortcuts */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="col-span-2 space-y-6">
          <Card className="dark:bg-slate-900/40 dark:border-slate-800/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Recent HCL Generations</CardTitle>
              <CardDescription className="text-xs">Your last runs through the deterministic compiler</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {recentRuns.map((run) => (
                  <div key={run.id} className="py-3.5 flex items-center justify-between gap-4">
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-800 dark:text-slate-200">{run.projectName}</span>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          run.status === 'success' 
                            ? 'bg-emerald-500/10 text-emerald-500 dark:text-emerald-400' 
                            : 'bg-red-500/10 text-red-500 dark:text-red-400'
                        }`}>
                          {run.status === 'success' ? 'Validated' : 'Failed'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate max-w-md">{run.spec}</p>
                    </div>
                    <span className="text-[10px] text-slate-500 whitespace-nowrap">{run.timestamp}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Shortcuts */}
        <div className="space-y-6">
          <Card className="dark:bg-slate-900/40 dark:border-slate-800/80">
            <CardHeader>
              <CardTitle className="text-sm font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2.5">
              <Button asChild variant="outline" className="w-full text-xs justify-start gap-2.5 h-9 dark:border-slate-800 dark:hover:bg-slate-800">
                <Link href="/workspaces">
                  <Terminal className="h-4 w-4 text-slate-500" />
                  Code Workspace Explorer
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full text-xs justify-start gap-2.5 h-9 dark:border-slate-800 dark:hover:bg-slate-800">
                <Link href="/docs">
                  <BookOpen className="h-4 w-4 text-slate-500" />
                  Documentation Hub
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full text-xs justify-start gap-2.5 h-9 dark:border-slate-800 dark:hover:bg-slate-800">
                <Link href="/settings">
                  <Settings className="h-4 w-4 text-slate-500" />
                  Integrations & Settings
                </Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
