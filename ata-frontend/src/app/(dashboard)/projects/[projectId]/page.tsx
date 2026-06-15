'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { projectsApi } from '@/lib/api/projects.api';
import { generationsApi } from '@/lib/api/generations.api';
import { ArrowLeft, Sparkles, AlertCircle, History, Cloud, Clock, CheckCircle, XCircle } from 'lucide-react';

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;

  const { data: projectRes, isLoading: isLoadingProject } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectsApi.get(projectId),
  });

  const { data: generations, isLoading: isLoadingGenerations, refetch: refetchGenerations } = useQuery({
    queryKey: ['generations', projectId],
    queryFn: () => generationsApi.listByProject(projectId),
    refetchInterval: 15000, // Poll list every 15s
  });

  const { data: quota, isLoading: isLoadingQuota } = useQuery({
    queryKey: ['usage-quota'],
    queryFn: () => projectsApi.getUsageQuota(),
  });

  const project = projectRes?.data || projectRes;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-emerald-500" />;
      case 'failed':
        return <XCircle className="h-5 w-5 text-rose-500" />;
      case 'parsing':
      case 'validating':
      case 'pending':
        return <Clock className="h-5 w-5 text-amber-500 animate-pulse" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const baseClass = "text-xs font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider ";
    switch (status) {
      case 'completed':
        return <span className={baseClass + "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"}>Completed</span>;
      case 'failed':
        return <span className={baseClass + "bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400"}>Failed</span>;
      case 'parsing':
        return <span className={baseClass + "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 animate-pulse"}>Parsing</span>;
      case 'validating':
        return <span className={baseClass + "bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 animate-pulse"}>Validating</span>;
      case 'pending':
      default:
        return <span className={baseClass + "bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 animate-pulse"}>Pending</span>;
    }
  };

  const workspaceId = project?.workspaceId;

  return (
    <div className="space-y-8 max-w-6xl mx-auto px-4 py-6">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {workspaceId ? (
          <Link href={`/workspaces/${workspaceId}`} className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Workspace
          </Link>
        ) : (
          <Link href="/dashboard" className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Link>
        )}
      </div>

      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            {isLoadingProject ? 'Loading Project...' : project?.name}
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            {isLoadingProject ? 'Fetching description...' : project?.description || 'No description provided.'}
          </p>
        </div>
        <Button size="lg" className="shadow-lg bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium" asChild>
          <Link href={`/projects/${projectId}/generate`}>
            <Sparkles className="mr-2 h-5 w-5" />
            Generate Infrastructure
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-sm border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quota Remaining</CardDescription>
            <CardTitle className="text-3xl font-bold mt-1">
              {isLoadingQuota ? '...' : `${(quota?.generationsLimit || 10) - (quota?.generationsUsed || 0)} / ${quota?.generationsLimit || 10}`}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Generations reset monthly. Upgrade tier for more quota.</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-sm border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active Architecture</CardDescription>
            <CardTitle className="text-3xl font-bold mt-1">
              {isLoadingGenerations ? '...' : generations?.length ? `v${generations[0].versionNumber || 1}` : 'None'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {generations?.length ? `Last updated ${new Date(generations[0].createdAt).toLocaleDateString()}` : 'Generate your first specification.'}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 shadow-sm border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Runs</CardDescription>
            <CardTitle className="text-3xl font-bold mt-1">
              {isLoadingGenerations ? '...' : generations?.length || 0}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Includes all parent runs and iterative prompt refinement cycles.</p>
          </CardContent>
        </Card>
      </div>

      {/* Generations History list */}
      <Card className="shadow-sm border-slate-100 dark:border-slate-800">
        <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-slate-50 dark:border-slate-800">
          <div>
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <History className="h-5 w-5 text-indigo-500" />
              Generation History
            </CardTitle>
            <CardDescription>View status and history of parsed architecture designs</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={() => refetchGenerations()}>Refresh</Button>
        </CardHeader>
        <CardContent className="p-0">
          {isLoadingGenerations ? (
            <div className="p-8 text-center text-muted-foreground">Loading history...</div>
          ) : !generations || generations.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground space-y-4">
              <Cloud className="h-12 w-12 mx-auto text-slate-300 dark:text-slate-700" />
              <p className="text-sm">No architecture designs generated yet for this project.</p>
              <Button size="sm" variant="outline" asChild>
                <Link href={`/projects/${projectId}/generate`}>Generate First Spec</Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {generations.map((g: any) => (
                <div
                  key={g.id}
                  onClick={() => router.push(`/projects/${projectId}/generations/${g.id}`)}
                  className="p-4 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-900/30 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex-shrink-0">
                      {getStatusIcon(g.status)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">Version {g.versionNumber || 1}</span>
                        {getStatusBadge(g.status)}
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-1 max-w-[300px] sm:max-w-[500px]" title={g.promptExcerpt}>
                        &ldquo;{g.promptExcerpt}&rdquo;
                      </p>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0 text-xs text-muted-foreground flex flex-col items-end gap-1">
                    <span>{new Date(g.createdAt).toLocaleDateString()}</span>
                    <span>{new Date(g.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
