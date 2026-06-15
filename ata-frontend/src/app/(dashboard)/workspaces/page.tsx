'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { workspacesApi } from '@/lib/api/workspaces.api';
import { toast } from 'sonner';
import { FolderKanban, Plus } from 'lucide-react';
import Link from 'next/link';

export default function WorkspacesPage() {
  const queryClient = useQueryClient();
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: workspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspacesApi.list,
  });

  const createMutation = useMutation({
    mutationFn: (name: string) => workspacesApi.create(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      toast.success('Workspace created successfully');
      setNewWorkspaceName('');
      setIsCreating(false);
    },
    onError: () => {
      toast.error('Failed to create workspace');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWorkspaceName.trim()) return;
    createMutation.mutate(newWorkspaceName);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
          <p className="text-muted-foreground">
            Manage your workspaces and projects
          </p>
        </div>
        {!isCreating && (
          <Button onClick={() => setIsCreating(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Workspace
          </Button>
        )}
      </div>

      {isCreating && (
        <Card className="border-primary/50 shadow-sm">
          <form onSubmit={handleCreate}>
            <CardHeader>
              <CardTitle className="text-lg">Create New Workspace</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                placeholder="Workspace name"
                value={newWorkspaceName}
                onChange={(e) => setNewWorkspaceName(e.target.value)}
                autoFocus
                disabled={createMutation.isPending}
              />
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => {
                  setIsCreating(false);
                  setNewWorkspaceName('');
                }}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newWorkspaceName.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-slate-100 dark:bg-slate-800 rounded-t-xl" />
              <CardContent className="py-6" />
            </Card>
          ))}
        </div>
      ) : workspaces?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <FolderKanban className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold">No workspaces</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
            Get started by creating a new workspace to organize your projects and team.
          </p>
          {!isCreating && (
            <Button onClick={() => setIsCreating(true)} variant="outline">
              Create your first workspace
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {workspaces?.map((workspace: any) => (
            <Card key={workspace.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-xl truncate pr-4" title={workspace.name}>
                    {workspace.name}
                  </CardTitle>
                  <span className="text-xs px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-full font-medium text-slate-600 dark:text-slate-300 capitalize">
                    {workspace.role}
                  </span>
                </div>
                <CardDescription className="truncate">
                  {workspace.slug}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                {/* Could show project count here later */}
              </CardContent>
              <CardFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="secondary" className="w-full" asChild>
                  <Link href={`/workspaces/${workspace.id}`}>
                    View Workspace
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
