'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { projectsApi } from '@/lib/api/projects.api';
import { workspacesApi } from '@/lib/api/workspaces.api';
import { toast } from 'sonner';
import { FolderKanban, Plus, Settings, Users, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function WorkspacePage() {
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  const queryClient = useQueryClient();
  
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { data: workspace, isLoading: isLoadingWorkspace } = useQuery({
    queryKey: ['workspaces', workspaceId],
    queryFn: () => workspacesApi.get(workspaceId),
  });

  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects', workspaceId],
    queryFn: () => projectsApi.listByWorkspace(workspaceId),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => 
      projectsApi.create({ workspaceId, ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects', workspaceId] });
      toast.success('Project created successfully');
      setNewProjectName('');
      setNewProjectDescription('');
      setIsCreating(false);
    },
    onError: () => {
      toast.error('Failed to create project');
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    createMutation.mutate({ 
      name: newProjectName, 
      description: newProjectDescription || undefined 
    });
  };

  const isEditor = workspace?.role === 'owner' || workspace?.role === 'editor';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link href="/workspaces" className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Workspaces
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isLoadingWorkspace ? '...' : workspace?.name}
          </h1>
          <p className="text-muted-foreground">
            {isLoadingWorkspace ? '...' : `Slug: ${workspace?.slug}`}
          </p>
        </div>
        <div className="flex gap-2">
          {isEditor && (
            <Button variant="outline" asChild>
              <Link href={`/workspaces/${workspaceId}/settings`}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </Link>
            </Button>
          )}
          <Button variant="outline" asChild>
            <Link href={`/workspaces/${workspaceId}/members`}>
              <Users className="mr-2 h-4 w-4" />
              Members
            </Link>
          </Button>
          {isEditor && !isCreating && (
            <Button onClick={() => setIsCreating(true)}>
              <Plus className="mr-2 h-4 w-4" />
              New Project
            </Button>
          )}
        </div>
      </div>

      {isCreating && (
        <Card className="border-primary/50 shadow-sm">
          <form onSubmit={handleCreate}>
            <CardHeader>
              <CardTitle className="text-lg">Create New Project</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Project Name</label>
                <Input
                  placeholder="e.g., Marketing Website"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  autoFocus
                  disabled={createMutation.isPending}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Description (Optional)</label>
                <Input
                  placeholder="What is this project about?"
                  value={newProjectDescription}
                  onChange={(e) => setNewProjectDescription(e.target.value)}
                  disabled={createMutation.isPending}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end gap-2">
              <Button 
                variant="outline" 
                type="button" 
                onClick={() => {
                  setIsCreating(false);
                  setNewProjectName('');
                  setNewProjectDescription('');
                }}
                disabled={createMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={!newProjectName.trim() || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      )}

      {isLoadingProjects ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="h-24 bg-slate-100 dark:bg-slate-800 rounded-t-xl" />
              <CardContent className="py-6" />
            </Card>
          ))}
        </div>
      ) : projectsData?.data?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-xl bg-slate-50/50 dark:bg-slate-900/50 border-dashed">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
            <FolderKanban className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold">No projects</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
            Create a project to start building in this workspace.
          </p>
          {isEditor && !isCreating && (
            <Button onClick={() => setIsCreating(true)} variant="outline">
              Create your first project
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {projectsData?.data?.map((project: any) => (
            <Card key={project.id} className="hover:shadow-md transition-shadow flex flex-col">
              <CardHeader>
                <CardTitle className="text-xl truncate" title={project.name}>
                  {project.name}
                </CardTitle>
                <CardDescription className="line-clamp-2 min-h-10">
                  {project.description || 'No description provided.'}
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 text-sm text-muted-foreground">
                Created: {new Date(project.createdAt).toLocaleDateString()}
              </CardContent>
              <CardFooter className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <Button variant="secondary" className="w-full" asChild>
                  <Link href={`/projects/${project.id}`}>
                    Open Project
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
