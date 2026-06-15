'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/lib/store/auth.store';
import { toast } from 'sonner';
import { Settings, User, Cloud, Cpu, Sliders, Key, Save, Check } from 'lucide-react';

export default function SettingsPage() {
  const user = useAuthStore((state) => state.user);
  const [activeTab, setActiveTab] = useState<'profile' | 'provider' | 'ai' | 'preferences'>('profile');

  // Input states
  const [awsKeyId, setAwsKeyId] = useState('AKIAIOSFODNN7EXAMPLE');
  const [awsSecret, setAwsSecret] = useState('••••••••••••••••••••••••••••••••••••••••');
  const [openaiKey, setOpenaiKey] = useState('sk-proj-••••••••••••••••••••••••');
  const [anthropicKey, setAnthropicKey] = useState('sk-ant-••••••••••••••••••••••••');
  const [llmProvider, setLlmProvider] = useState<'openai' | 'claude' | 'ollama'>('openai');

  const handleSave = () => {
    toast.success('Settings saved successfully', {
      description: 'Your modifications have been applied to your account preferences.',
    });
  };

  const tabs = [
    { id: 'profile', label: 'User Profile', icon: User },
    { id: 'provider', label: 'Cloud Credentials', icon: Cloud },
    { id: 'ai', label: 'AI Engine Settings', icon: Cpu },
    { id: 'preferences', label: 'Preferences', icon: Sliders },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
          Settings & Integrations
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Manage your cloud secrets, compiler configurations, and profile preferences.
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Sidebar Nav */}
        <aside className="w-full md:w-56 flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/10' 
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </aside>

        {/* Content Panel */}
        <div className="flex-1 w-full">
          {activeTab === 'profile' && (
            <Card className="dark:bg-slate-900/40 dark:border-slate-800/80">
              <CardHeader>
                <CardTitle className="text-sm font-bold">User Profile</CardTitle>
                <CardDescription className="text-xs">Your account credentials and current plan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs">Full Name</Label>
                  <Input defaultValue={user?.fullName || 'Ata User'} className="text-xs dark:bg-slate-950" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Email Address</Label>
                  <Input defaultValue={user?.email || 'user@ataplatform.com'} disabled className="text-xs opacity-70 dark:bg-slate-950" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Subscription Plan</Label>
                  <div className="flex items-center justify-between p-3 rounded-lg border border-indigo-500/20 bg-indigo-500/5">
                    <span className="text-xs font-semibold text-indigo-400 capitalize">{user?.subscriptionTier || 'Developer Free'}</span>
                    <Button variant="outline" size="sm" className="text-[10px] h-7 dark:border-indigo-500/30 dark:hover:bg-indigo-950/20">Upgrade Plan</Button>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t border-slate-100 dark:border-slate-850 pt-4">
                <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  <Save className="mr-2 h-3.5 w-3.5" /> Save Changes
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeTab === 'provider' && (
            <Card className="dark:bg-slate-900/40 dark:border-slate-800/80">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Cloud Credentials</CardTitle>
                <CardDescription className="text-xs">Configure access keys for sandboxed module integrations (stored locally in-memory)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs">AWS Access Key ID</Label>
                  <Input value={awsKeyId} onChange={(e) => setAwsKeyId(e.target.value)} className="text-xs dark:bg-slate-950" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">AWS Secret Access Key</Label>
                  <Input type="password" value={awsSecret} onChange={(e) => setAwsSecret(e.target.value)} className="text-xs dark:bg-slate-950" />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Default Region</Label>
                  <Input defaultValue="us-east-1" className="text-xs dark:bg-slate-950" />
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t border-slate-100 dark:border-slate-850 pt-4">
                <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  <Save className="mr-2 h-3.5 w-3.5" /> Save Credentials
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeTab === 'ai' && (
            <Card className="dark:bg-slate-900/40 dark:border-slate-800/80">
              <CardHeader>
                <CardTitle className="text-sm font-bold">AI Engines Configuration</CardTitle>
                <CardDescription className="text-xs">Manage AI translation models and credentials</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-2">
                  <Label className="text-xs">Preferred AI Provider</Label>
                  <select 
                    value={llmProvider} 
                    onChange={(e) => setLlmProvider(e.target.value as any)}
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-xs shadow-sm transition-colors dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="openai">OpenAI (GPT-4o)</option>
                    <option value="claude">Anthropic (Claude 3.5 Sonnet)</option>
                    <option value="ollama">Ollama (Local Llama 3)</option>
                  </select>
                </div>
                {llmProvider === 'openai' && (
                  <div className="grid gap-2">
                    <Label className="text-xs">OpenAI API Key</Label>
                    <Input type="password" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} className="text-xs dark:bg-slate-950" />
                  </div>
                )}
                {llmProvider === 'claude' && (
                  <div className="grid gap-2">
                    <Label className="text-xs">Anthropic API Key</Label>
                    <Input type="password" value={anthropicKey} onChange={(e) => setAnthropicKey(e.target.value)} className="text-xs dark:bg-slate-950" />
                  </div>
                )}
                {llmProvider === 'ollama' && (
                  <div className="grid gap-2">
                    <Label className="text-xs">Local Ollama Endpoint</Label>
                    <Input defaultValue="http://localhost:11434" className="text-xs dark:bg-slate-950" />
                  </div>
                )}
              </CardContent>
              <CardFooter className="justify-end border-t border-slate-100 dark:border-slate-850 pt-4">
                <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  <Save className="mr-2 h-3.5 w-3.5" /> Save AI Keys
                </Button>
              </CardFooter>
            </Card>
          )}

          {activeTab === 'preferences' && (
            <Card className="dark:bg-slate-900/40 dark:border-slate-800/80">
              <CardHeader>
                <CardTitle className="text-sm font-bold">Platform Preferences</CardTitle>
                <CardDescription className="text-xs">Tweak validation modes and auto-format preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Auto-format (terraform fmt)</Label>
                    <p className="text-[10px] text-slate-500">Run formatter on files immediately after compilation</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                  <div className="space-y-0.5">
                    <Label className="text-xs">Sandboxed Validation Gate</Label>
                    <p className="text-[10px] text-slate-500">Run terraform validate in an isolated shell prior to check-in</p>
                  </div>
                  <input type="checkbox" defaultChecked className="h-4 w-4 text-indigo-600" />
                </div>
              </CardContent>
              <CardFooter className="justify-end border-t border-slate-100 dark:border-slate-850 pt-4">
                <Button size="sm" onClick={handleSave} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs">
                  <Save className="mr-2 h-3.5 w-3.5" /> Save Preferences
                </Button>
              </CardFooter>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
