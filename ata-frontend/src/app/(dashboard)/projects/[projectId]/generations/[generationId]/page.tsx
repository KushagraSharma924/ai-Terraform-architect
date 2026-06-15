'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { generationsApi } from '@/lib/api/generations.api';
import { toast } from 'sonner';
import { TerraformView } from '@/components/terraform-view';
import {
  ArrowLeft,
  Sparkles,
  Loader2,
  AlertOctagon,
  Cpu,
  ShieldAlert,
  Network,
  Code,
  Send,
  Database,
  Cloud,
  CheckCircle2,
  Clock,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';

export default function GenerationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const generationId = params.generationId as string;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'visual' | 'compute' | 'network' | 'json' | 'terraform'>('visual');
  const [refinementPrompt, setRefinementPrompt] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Poll status endpoint
  const { data: generation, error: fetchError } = useQuery({
    queryKey: ['generation', generationId],
    queryFn: () => generationsApi.get(generationId),
    refetchInterval: (query) => {
      const state = query.state.data as any;
      if (state && (state.status === 'completed' || state.status === 'failed')) {
        return false; // Stop polling
      }
      return 2000; // Poll every 2s
    },
  });

  const refineMutation = useMutation({
    mutationFn: (text: string) =>
      generationsApi.refine(generationId, {
        prompt: text,
        provider: generation?.llmProvider || 'openai',
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['generations', projectId] });
      toast.success('Refinement parsed successfully');
      setRefinementPrompt('');
      router.push(`/projects/${projectId}/generations/${data.generationId}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to submit refinement prompt';
      toast.error(msg);
    },
  });

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [generation]);

  const handleRefine = (e: React.FormEvent) => {
    e.preventDefault();
    if (!refinementPrompt.trim()) return;
    if (refinementPrompt.trim().length < 5) {
      toast.error('Refinement prompt must be at least 5 characters');
      return;
    }
    refineMutation.mutate(refinementPrompt);
  };

  if (fetchError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <AlertOctagon className="h-16 w-16 mx-auto text-rose-500 animate-bounce" />
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Generation Not Found</h1>
        <p className="text-muted-foreground">The requested generation record could not be loaded.</p>
        <Button variant="outline" asChild>
          <Link href={`/projects/${projectId}`}>Back to Project</Link>
        </Button>
      </div>
    );
  }

  const status = generation?.status || 'pending';
  const spec = generation?.infrastructureSpec;

  // Render Loading / Progress state
  if (status === 'pending' || status === 'parsing' || status === 'validating') {
    const getLoadingMessage = () => {
      switch (status) {
        case 'parsing':
          return 'LLM is translating your prompts to standard resources...';
        case 'validating':
          return 'Running AJV validation schema and enforcing defaults...';
        case 'pending':
        default:
          return 'Waiting in queue for processing worker...';
      }
    };

    return (
      <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-8">
        <div className="relative inline-flex items-center justify-center">
          <Loader2 className="h-24 w-24 text-indigo-500 animate-spin" />
          <Sparkles className="h-8 w-8 text-purple-500 absolute animate-pulse" />
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold tracking-tight uppercase bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
            AI Architect in Progress
          </h2>
          <p className="text-sm text-slate-500 font-medium">Status: <span className="text-indigo-600 dark:text-indigo-400 capitalize font-bold">{status}</span></p>
          <p className="text-muted-foreground text-sm max-w-md mx-auto pt-2">{getLoadingMessage()}</p>
        </div>

        <Card className="border-dashed max-w-sm mx-auto shadow-sm">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-left text-xs text-muted-foreground">
              <Info className="h-4 w-4 text-indigo-500 flex-shrink-0" />
              <span>We process schema corrections in multiple self-healing retry cycles. This usually takes 5-15 seconds.</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Render Failed state
  if (status === 'failed') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 space-y-6">
        <Card className="border-rose-500/50 shadow-md">
          <CardHeader className="bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 rounded-t-xl">
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertOctagon className="h-6 w-6" />
              Requirements Parsing Failed
            </CardTitle>
            <CardDescription className="text-rose-600 dark:text-rose-500">
              The AI was unable to construct a valid architecture spec from your input.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-2">
              <span className="text-xs uppercase font-bold text-muted-foreground">Error Code</span>
              <p className="font-mono text-sm bg-slate-100 dark:bg-slate-900 px-3 py-1.5 rounded">{generation.errorCode || 'PIPELINE_ERROR'}</p>
            </div>
            <div className="space-y-2">
              <span className="text-xs uppercase font-bold text-muted-foreground">Error Details</span>
              <p className="text-sm bg-rose-50/20 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30 p-3 rounded text-rose-700 dark:text-rose-300">
                {generation.errorMessage || 'No error details provided.'}
              </p>
            </div>
            {generation.promptText && (
              <div className="space-y-2 pt-2">
                <span className="text-xs uppercase font-bold text-muted-foreground">Original Prompt</span>
                <p className="text-xs text-muted-foreground italic bg-slate-50 dark:bg-slate-900 p-3 rounded max-h-36 overflow-y-auto">
                  &ldquo;{generation.promptText}&rdquo;
                </p>
              </div>
            )}
          </CardContent>
          <CardFooter className="border-t border-slate-100 dark:border-slate-800 flex justify-between pt-4">
            <Button variant="outline" asChild>
              <Link href={`/projects/${projectId}`}>Back to Project</Link>
            </Button>
            <Button className="bg-rose-600 hover:bg-rose-500 text-white font-medium" asChild>
              <Link href={`/projects/${projectId}/generate`}>Try Again</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // Render Completed / Spec view state
  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 py-6">
      {/* Back Link */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/projects/${projectId}`} className="hover:text-foreground flex items-center gap-1 transition-colors">
            <ArrowLeft className="h-4 w-4" />
            Back to Project
          </Link>
          <ChevronRight className="h-3 w-3" />
          <span>v{generation?.versionNumber || 1} Design</span>
        </div>
        <div className="flex items-center gap-2 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-3 py-1 rounded-full font-semibold">
          <CheckCircle2 className="h-4 w-4" />
          <span>Schema Verified</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* Left Column: Conversational / Refinement Log */}
        {activeTab !== 'terraform' && (
          <div className="lg:col-span-5 space-y-6">
            <Card className="flex flex-col h-[650px] shadow-sm border-slate-100 dark:border-slate-800">
              <CardHeader className="border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/20">
                <CardTitle className="text-md font-bold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-indigo-500" />
                  Iterative Refiner
                </CardTitle>
                <CardDescription>Chat style prompt updates to modify this infrastructure design</CardDescription>
              </CardHeader>
              {/* Scrollable Conversation area */}
              <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="space-y-4">
                  {/* Initial prompt */}
                  <div className="bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 p-3 rounded-2xl rounded-tl-none max-w-[85%] text-xs shadow-sm">
                    <span className="font-bold text-[10px] uppercase text-indigo-500 block mb-1">Architect Request</span>
                    {generation?.promptText}
                  </div>
                  {/* Response / spec meta */}
                  <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-100/30 text-indigo-900 dark:text-indigo-300 p-3 rounded-2xl rounded-tr-none ml-auto max-w-[85%] text-xs shadow-sm">
                    <span className="font-bold text-[10px] uppercase text-indigo-600 dark:text-indigo-400 block mb-1">Architecture Generated</span>
                    Successfully compiled specification v{generation?.versionNumber || 1} using {generation.llmProvider} ({generation.llmModel || 'gpt-4o-mini'}).
                    <span className="block mt-2 font-semibold">Confidence score: {(Number(generation.confidenceScore || 0) * 100).toFixed(0)}%</span>
                  </div>
                  {/* Anchor for scroll */}
                  <div ref={chatEndRef} />
                </div>
              </CardContent>

              <form onSubmit={handleRefine} className="p-4 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10">
                <div className="flex gap-2">
                  <textarea
                    placeholder="e.g., Update database storage to 100GB and enable NAT Gateway..."
                    value={refinementPrompt}
                    onChange={(e) => setRefinementPrompt(e.target.value)}
                    disabled={refineMutation.isPending}
                    className="flex-1 min-h-[50px] max-h-[100px] p-2 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-foreground resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleRefine(e);
                      }
                    }}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={!refinementPrompt.trim() || refineMutation.isPending}
                    className="h-10 w-10 flex-shrink-0 self-end shadow bg-indigo-600 hover:bg-indigo-500 text-white"
                  >
                    {refineMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Right Column: Spec display */}
        <div className={activeTab === 'terraform' ? "lg:col-span-12 space-y-6" : "lg:col-span-7 space-y-6"}>
          <div className="flex gap-2 border-b border-slate-100 dark:border-slate-800 pb-2 overflow-x-auto">
            <button
              onClick={() => setActiveTab('visual')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'visual' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900'}`}
            >
              <Layers className="h-4 w-4" />
              Overview
            </button>
            <button
              onClick={() => setActiveTab('compute')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'compute' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900'}`}
            >
              <Cpu className="h-4 w-4" />
              Compute & DB
            </button>
            <button
              onClick={() => setActiveTab('network')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'network' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900'}`}
            >
              <Network className="h-4 w-4" />
              Networking & Security
            </button>
            <button
              onClick={() => setActiveTab('json')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'json' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900'}`}
            >
              <Code className="h-4 w-4" />
              JSON Spec
            </button>
            <button
              onClick={() => setActiveTab('terraform')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-all flex items-center gap-1.5 ${activeTab === 'terraform' ? 'bg-indigo-600 text-white shadow-sm' : 'text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-900'}`}
            >
              <Code className="h-4 w-4" />
              Terraform HCL
            </button>
          </div>

          {/* Tab Content Panels */}
          {activeTab === 'visual' && (
            <div className="space-y-6">
              <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">General Info</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-lg bg-slate-50/30 dark:bg-slate-950/20">
                    <span className="font-bold text-muted-foreground block mb-1">Target Cloud</span>
                    <span className="font-semibold text-foreground flex items-center gap-1 capitalize">
                      <Cloud className="h-4 w-4 text-indigo-500" />
                      {spec?.cloudProvider || 'AWS'}
                    </span>
                  </div>
                  <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-lg bg-slate-50/30 dark:bg-slate-950/20">
                    <span className="font-bold text-muted-foreground block mb-1">Architecture Style</span>
                    <span className="font-semibold text-foreground capitalize">
                      {spec?.architecturePattern || 'Three-Tier Web App'}
                    </span>
                  </div>
                  <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-lg bg-slate-50/30 dark:bg-slate-950/20">
                    <span className="font-bold text-muted-foreground block mb-1">Application Runtime</span>
                    <span className="font-semibold text-foreground uppercase">
                      {spec?.applicationType || 'Node.js'}
                    </span>
                  </div>
                  <div className="border border-slate-100 dark:border-slate-800 p-3 rounded-lg bg-slate-50/30 dark:bg-slate-950/20">
                    <span className="font-bold text-muted-foreground block mb-1">Est. Monthly Traffic</span>
                    <span className="font-semibold text-foreground">
                      {spec?.estimatedMonthlyTraffic ? `${spec.estimatedMonthlyTraffic} Requests` : 'Not specified'}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Ambiguities Resolved */}
              {spec?.ambiguities && spec.ambiguities.length > 0 && (
                <Card className="border-amber-200 dark:border-amber-900/30 bg-amber-50/20 dark:bg-amber-950/10 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-bold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                      <ShieldAlert className="h-5 w-5" />
                      Design Decisions & Ambiguities Resolved
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="divide-y divide-amber-100 dark:divide-amber-900/30 text-xs">
                    {spec.ambiguities.map((a: any, idx: number) => (
                      <div key={idx} className="py-2.5 first:pt-0 last:pb-0">
                        <div className="flex justify-between font-semibold">
                          <span className="text-amber-800 dark:text-amber-300 font-mono">{a.field}</span>
                          <span className={`uppercase text-[10px] px-1.5 py-0.5 rounded ${a.confidence === 'high' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : a.confidence === 'medium' ? 'bg-amber-50 text-amber-700 dark:bg-amber-955/40 dark:text-amber-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-955/40 dark:text-rose-400'}`}>{a.confidence || 'low'} confidence</span>
                        </div>
                        <p className="text-muted-foreground mt-1">{a.reason}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'compute' && (
            <div className="space-y-6">
              {/* Compute Spec */}
              <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Cpu className="h-5 w-5 text-indigo-500" />
                    Compute Service ({spec?.compute?.type || 'EC2'})
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg">
                    <span className="font-bold text-muted-foreground block mb-1">Instance Type</span>
                    <span className="font-semibold text-foreground font-mono">{spec?.compute?.instanceType || 't3.medium'}</span>
                  </div>
                  <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg">
                    <span className="font-bold text-muted-foreground block mb-1">Instance Count</span>
                    <span className="font-semibold text-foreground">{spec?.compute?.instanceCount || 2}</span>
                  </div>
                  {spec?.compute?.autoScaling && (
                    <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg sm:col-span-2">
                      <span className="font-bold text-muted-foreground block mb-1">Auto Scaling Config</span>
                      <div className="grid grid-cols-3 gap-2 mt-1">
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Min Instances</span>
                          <span className="font-semibold text-foreground">{spec.compute.autoScaling.minInstances || 2}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">Max Instances</span>
                          <span className="font-semibold text-foreground">{spec.compute.autoScaling.maxInstances || 6}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground block">CPU Target</span>
                          <span className="font-semibold text-foreground">{spec.compute.autoScaling.targetCpuUtilization || 70}%</span>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Database Spec */}
              {spec?.database && (
                <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <Database className="h-5 w-5 text-indigo-500" />
                      Database Cluster ({spec.database.type || 'PostgreSQL'})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 text-xs">
                    <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg">
                      <span className="font-bold text-muted-foreground block mb-1">Multi-AZ Deployment</span>
                      <span className="font-semibold text-foreground">{spec.database.multiAz ? 'Enabled (Highly Available)' : 'Disabled (Single Instance)'}</span>
                    </div>
                    <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg">
                      <span className="font-bold text-muted-foreground block mb-1">Allocated Storage</span>
                      <span className="font-semibold text-foreground">{spec.database.storageGb || 20} GB</span>
                    </div>
                    {spec.database.engineVersion && (
                      <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg sm:col-span-2">
                        <span className="font-bold text-muted-foreground block mb-1">Engine Version</span>
                        <span className="font-semibold text-foreground">{spec.database.engineVersion}</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'network' && (
            <div className="space-y-6">
              {/* Networking */}
              <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                    <Network className="h-5 w-5 text-indigo-500" />
                    VPC & Subnets Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2 text-xs">
                  <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg">
                    <span className="font-bold text-muted-foreground block mb-1">VPC CIDR Range</span>
                    <span className="font-semibold text-foreground font-mono">{spec?.networking?.vpcCidr || '10.0.0.0/16'}</span>
                  </div>
                  <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg">
                    <span className="font-bold text-muted-foreground block mb-1">Availability Zones</span>
                    <span className="font-semibold text-foreground">{spec?.networking?.availabilityZones || 2} Zones</span>
                  </div>
                  <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg">
                    <span className="font-bold text-muted-foreground block mb-1">NAT Gateway</span>
                    <span className="font-semibold text-foreground">{spec?.networking?.natGateway ? 'Required (Outbound connectivity for private subnets)' : 'Not Required'}</span>
                  </div>
                  <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg">
                    <span className="font-bold text-muted-foreground block mb-1">Subnet Separation</span>
                    <span className="font-semibold text-foreground">
                      {spec?.networking?.privateSubnets ? 'Private' : 'Public'} & {spec?.networking?.publicSubnets ? 'Public' : 'No Public'} Subnets
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Security */}
              {spec?.security && (
                <Card className="shadow-sm border-slate-100 dark:border-slate-800">
                  <CardHeader>
                    <CardTitle className="text-sm font-bold flex items-center gap-1.5">
                      <ShieldAlert className="h-5 w-5 text-indigo-500" />
                      Security Guards & Access Control
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="grid gap-4 sm:grid-cols-2 text-xs">
                    <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg">
                      <span className="font-bold text-muted-foreground block mb-1">Encryption at Rest</span>
                      <span className="font-semibold text-foreground">{spec.security.encryptionAtRest ? 'Enforced (AES-256)' : 'Disabled'}</span>
                    </div>
                    <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg">
                      <span className="font-bold text-muted-foreground block mb-1">Security Isolation</span>
                      <span className="font-semibold text-foreground">Isolated Subnets & SG Chains</span>
                    </div>
                    {spec.security.securityGroups && (
                      <div className="border border-slate-50 dark:border-slate-900 p-3 rounded-lg sm:col-span-2">
                        <span className="font-bold text-muted-foreground block mb-1">Security Groups Created</span>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {spec.security.securityGroups.map((sg: string) => (
                            <span key={sg} className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-mono text-[10px] text-foreground uppercase">{sg}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {activeTab === 'json' && (
            <Card className="shadow-sm border-slate-100 dark:border-slate-800">
              <CardHeader className="pb-3 border-b border-slate-50 dark:border-slate-800">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">JSON Structure Blueprint</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <pre className="p-4 bg-slate-950 text-slate-100 font-mono text-xs overflow-auto max-h-[500px] leading-relaxed rounded-b-xl">
                  {JSON.stringify(spec, null, 2)}
                </pre>
              </CardContent>
            </Card>
          )}

          {activeTab === 'terraform' && (
            <TerraformView
              projectId={projectId}
              generationId={generationId}
              projectName={generation?.projectName || 'Project'}
              cloudProvider={spec?.cloudProvider || 'aws'}
              spec={spec}
            />
          )}
        </div>
      </div>
    </div>
  );
}
