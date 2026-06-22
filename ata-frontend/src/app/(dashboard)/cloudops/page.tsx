'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cloudopsApi } from '@/lib/api/cloudops.api';
import { deploymentsApi } from '@/lib/api/deployments.api';
import { toast } from 'sonner';
import { Sparkles, Send, RefreshCw, TrendingUp, Lightbulb } from 'lucide-react';

const SUGGESTIONS = [
  'Why is my AWS bill increasing?',
  'Which resources are unused?',
  'Show unhealthy EC2 instances.',
  'Recommend cost optimizations.',
  'Are any buckets public?',
];

export default function CloudOpsPage() {
  const qc = useQueryClient();
  const [accountId, setAccountId] = useState<string>('');
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  const { data: accounts } = useQuery({ queryKey: ['cloud-accounts'], queryFn: deploymentsApi.listAccounts });

  useEffect(() => {
    if (!accountId && accounts?.length) setAccountId(accounts[0].id);
  }, [accounts, accountId]);

  const { data: messages } = useQuery({
    queryKey: ['cloudops-messages', conversationId],
    queryFn: () => cloudopsApi.getMessages(conversationId!),
    enabled: !!conversationId,
  });

  const { data: trends } = useQuery({
    queryKey: ['cloudops-trends', accountId],
    queryFn: () => cloudopsApi.costTrends(accountId, 30),
    enabled: !!accountId,
  });

  const { data: recs } = useQuery({ queryKey: ['cloudops-recs'], queryFn: cloudopsApi.recommendations });

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const ensureConversation = async (): Promise<string> => {
    if (conversationId) return conversationId;
    const conv = await cloudopsApi.startConversation(accountId);
    setConversationId(conv.id);
    return conv.id;
  };

  const ask = useMutation({
    mutationFn: async (message: string) => {
      const id = await ensureConversation();
      await cloudopsApi.ask(id, message);
      return id;
    },
    onSuccess: (id) => {
      setInput('');
      qc.invalidateQueries({ queryKey: ['cloudops-messages', id] });
    },
    onError: () => toast.error('Assistant failed to respond'),
  });

  const refresh = useMutation({
    mutationFn: () => cloudopsApi.refreshInventory(accountId),
    onSuccess: () => {
      toast.success('Inventory refreshed');
      qc.invalidateQueries({ queryKey: ['cloudops-recs'] });
      qc.invalidateQueries({ queryKey: ['cloudops-trends', accountId] });
    },
  });

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            <Sparkles className="h-7 w-7" /> CloudOps Assistant
          </h1>
          <p className="text-sm text-slate-500">Ask about cost, health, waste, and security across your cloud.</p>
        </div>
        <div className="flex gap-2">
          <select className="rounded-md border bg-transparent px-2 text-sm" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
            {accounts?.map((a: any) => <option key={a.id} value={a.id}>{a.roleArn ?? a.id.slice(0, 8)}</option>)}
          </select>
          <Button variant="outline" size="sm" onClick={() => refresh.mutate()} disabled={!accountId}>
            <RefreshCw className="h-4 w-4 mr-1" /> Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat */}
        <Card className="lg:col-span-2 flex flex-col h-[34rem]">
          <CardHeader><CardTitle>Chat</CardTitle></CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-3">
            {!messages?.length && (
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((s) => (
                  <button key={s} onClick={() => ask.mutate(s)} disabled={!accountId}
                    className="rounded-full border px-3 py-1 text-xs hover:bg-slate-50">{s}</button>
                ))}
              </div>
            )}
            {messages?.map((m: any) => (
              <div key={m.id} className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${m.role === 'user' ? 'ml-auto bg-indigo-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {m.content}
                {m.citations?.length > 0 && (
                  <div className="mt-1 text-[10px] opacity-70">refs: {m.citations.slice(0, 4).join(', ')}</div>
                )}
              </div>
            ))}
            {ask.isPending && <div className="text-xs text-slate-400">Assistant is thinking…</div>}
            <div ref={endRef} />
          </CardContent>
          <div className="flex gap-2 border-t p-3">
            <Input placeholder="Ask a question…" value={input} onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' && input.trim()) ask.mutate(input.trim()); }} />
            <Button onClick={() => input.trim() && ask.mutate(input.trim())} disabled={!accountId || ask.isPending}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </Card>

        {/* Insights */}
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><TrendingUp className="h-4 w-4" /> Cost trend (30d)</CardTitle></CardHeader>
            <CardContent>
              {trends ? (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between"><span>This period</span><span className="font-medium">${trends.totalCurrent}</span></div>
                  <div className="flex justify-between text-slate-500"><span>Previous</span><span>${trends.totalPrevious}</span></div>
                  <div className={`font-medium ${trends.deltaPct >= 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {trends.deltaPct >= 0 ? '▲' : '▼'} {Math.abs(trends.deltaPct)}%
                  </div>
                  <div className="pt-2 space-y-1">
                    {trends.drivers?.slice(0, 3).map((d: any) => (
                      <div key={d.service} className="flex justify-between text-xs">
                        <span>{d.service}</span><span>{d.deltaPct >= 0 ? '+' : ''}{d.deltaPct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-sm text-slate-400">Select an account.</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Lightbulb className="h-4 w-4" /> Recommendations</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recs?.length ? recs.slice(0, 5).map((r: any) => (
                <div key={r.id} className="rounded-md border p-2 text-xs">
                  <div className="font-medium">{r.title}</div>
                  <div className="text-slate-500">{r.rationale}</div>
                  {r.estSavings && <div className="text-green-600">~${r.estSavings}/mo</div>}
                </div>
              )) : <p className="text-sm text-slate-400">Refresh inventory to generate recommendations.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
