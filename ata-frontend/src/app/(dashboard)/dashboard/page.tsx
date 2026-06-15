'use client';

import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { projectsApi } from '@/lib/api/projects.api';
import { workspacesApi } from '@/lib/api/workspaces.api';
import { useAuthStore } from '@/lib/store/auth.store';

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {user?.fullName}. Here&apos;s an overview of your account.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Workspaces</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingWorkspaces ? '...' : workspaces?.length || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active workspaces you have access to
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Plan</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {isLoadingQuota ? '...' : quota?.tier || user?.subscriptionTier || 'Free'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Current subscription tier
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage Quota</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoadingQuota 
                ? '...' 
                : `${quota?.generationsUsed || 0} / ${quota?.generationsLimit || 0}`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Generations used this billing period
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
