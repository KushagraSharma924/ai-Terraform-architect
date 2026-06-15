'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { generationsApi } from '@/lib/api/generations.api';
import { toast } from 'sonner';
import { ArrowLeft, Sparkles, Cloud, BrainCircuit, AlertTriangle } from 'lucide-react';

export default function GenerateInfrastructurePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState('');
  const [cloudProvider, setCloudProvider] = useState<'aws' | 'azure' | 'gcp'>('aws');
  const [llmProvider, setLlmProvider] = useState<'openai' | 'claude' | 'gemini' | 'grok' | 'ollama'>('ollama');

  const createMutation = useMutation({
    mutationFn: () =>
      generationsApi.create({
        projectId,
        prompt,
        cloudProviderHint: cloudProvider,
        provider: llmProvider,
      }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['generations', projectId] });
      toast.success('Requirements parsing started successfully');
      router.push(`/projects/${projectId}/generations/${data.generationId}`);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to initiate requirements parser';
      toast.error(msg);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim().length < 10) {
      toast.error('Prompt must be at least 10 characters long.');
      return;
    }
    if (prompt.trim().length > 4000) {
      toast.error('Prompt must not exceed 4000 characters.');
      return;
    }
    createMutation.mutate();
  };

  const handleSuggestionClick = (suggestion: string) => {
    setPrompt(suggestion);
  };

  const suggestions = [
    {
      title: 'Three-tier Web App',
      desc: 'EC2 servers, public/private VPC subnets, RDS PostgreSQL, Auto Scaling, and Application Load Balancer.',
      text: 'Deploy a secure, auto-scaling three-tier web application on AWS. It needs public subnet load balancers, EC2 servers running the Node.js backend in private subnets, and a PostgreSQL database in a segregated DB subnet. High availability and encryption at rest are required.',
    },
    {
      title: 'Serverless REST API',
      desc: 'API Gateway, Lambda functions, DynamoDB, and CloudFront CDN for global distribution.',
      text: 'Design a serverless API backend running on AWS with DynamoDB as the persistent data store. Requests should route through API Gateway to trigger NodeJS-based Lambda executors. Subnets must be private and storage needs to be encrypted.',
    },
    {
      title: 'Containerized microservices',
      desc: 'ECS Fargate, Service Discovery, Redis cache, and Aurora MySQL database cluster.',
      text: 'Set up an ECS Fargate container cluster running multiple microservices. Integrate an Aurora MySQL cluster for relational data storage and a Redis cache for fast session handling. Security groups must restrict direct access to only authorized traffic.',
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-4 py-6">
      {/* Back Link */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link href={`/projects/${projectId}`} className="hover:text-foreground flex items-center gap-1 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Project
        </Link>
      </div>

      <div className="space-y-2">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
          Ata AI Infrastructure Architect
        </h1>
        <p className="text-muted-foreground">
          Input your system requirements in plain natural language, and we will generate a structured, production-ready infrastructure blueprint.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          {/* Cloud Provider Card */}
          <Card className="shadow-sm border-slate-100 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/50">
            <CardHeader className="pb-3 flex flex-row items-center gap-3 space-y-0">
              <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                <Cloud className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">Cloud Target</CardTitle>
                <CardDescription className="text-xs">Where will this be deployed?</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <select
                value={cloudProvider}
                onChange={(e) => setCloudProvider(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-foreground"
              >
                <option value="aws">Amazon Web Services (AWS)</option>
                <option value="gcp">Google Cloud Platform (GCP)</option>
                <option value="azure">Microsoft Azure</option>
              </select>
            </CardContent>
          </Card>

          {/* LLM Engine Card */}
          <Card className="shadow-sm border-slate-100 dark:border-slate-800 bg-gradient-to-br from-white to-slate-50/50 dark:from-slate-900 dark:to-slate-950/50">
            <CardHeader className="pb-3 flex flex-row items-center gap-3 space-y-0">
              <div className="p-2 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-sm font-bold">LLM Orchestrator</CardTitle>
                <CardDescription className="text-xs">Which engine should parse requirements?</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <select
                value={llmProvider}
                onChange={(e) => setLlmProvider(e.target.value as any)}
                className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-foreground"
              >
                <option value="ollama">Ollama (Qwen/Llama Local)</option>
                <option value="openai">OpenAI GPT-4o Mini</option>
                <option value="claude">Anthropic Claude 3.5 Sonnet</option>
                <option value="gemini">Google Gemini Flash (Stub)</option>
                <option value="grok">xAI Grok 4.3</option>
              </select>
            </CardContent>
          </Card>
        </div>

        {/* Input Text Area Card */}
        <Card className="shadow-md border-slate-100 dark:border-slate-800">
          <CardHeader className="pb-3">
            <CardTitle className="text-md font-bold flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-purple-500" />
              Describe your Infrastructure Requirements
            </CardTitle>
            <CardDescription>
              Be specific about databases, containers, auto-scaling, availability zones, and security policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <textarea
              placeholder="e.g., I need a high-availability backend cluster using containers behind a load balancer with SSL termination. The data should reside in a multi-AZ PostgreSQL instance with strict encryption and automatic backups..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full min-h-48 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-600 text-foreground focus:bg-white dark:focus:bg-slate-955 transition-all"
            />
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span className={prompt.length > 4000 ? "text-rose-500 font-semibold" : ""}>
                {prompt.length} / 4000 characters
              </span>
              <span>Minimum 10 characters</span>
            </div>
          </CardContent>
          <CardFooter className="bg-slate-50/50 dark:bg-slate-900/20 px-6 py-4 flex justify-between gap-4 border-t border-slate-50 dark:border-slate-800 rounded-b-xl">
            <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle className="h-4 w-4 flex-shrink-0" />
              <span>Defaults (private subnets, encryption at rest) will be automatically enforced.</span>
            </div>
            <Button
              type="submit"
              disabled={prompt.trim().length < 10 || prompt.trim().length > 4000 || createMutation.isPending}
              className="shadow-md bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-semibold"
            >
              {createMutation.isPending ? 'Initiating Architect...' : 'Start Generation'}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {/* Suggestion Prompts Section */}
      <div className="space-y-4 pt-4">
        <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Need Inspiration? Click to prefill:</h3>
        <div className="grid gap-4 md:grid-cols-3">
          {suggestions.map((s) => (
            <Card
              key={s.title}
              onClick={() => handleSuggestionClick(s.text)}
              className="hover:border-indigo-400/50 hover:bg-slate-50/20 dark:hover:bg-slate-900/10 cursor-pointer transition-all border-dashed"
            >
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{s.title}</CardTitle>
                <CardDescription className="text-xs line-clamp-2 mt-1">{s.desc}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
