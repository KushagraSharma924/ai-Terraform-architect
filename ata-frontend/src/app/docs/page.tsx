'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Terminal, BookOpen, Code2, ShieldAlert, Cpu, ArrowLeft, ArrowRight, Menu } from 'lucide-react';

export default function DocsPage() {
  const [activeSection, setActiveSection] = useState<'getting-started' | 'modules' | 'sandbox' | 'refinements'>('getting-started');

  const navigation = [
    { id: 'getting-started', label: 'Getting Started', icon: BookOpen },
    { id: 'modules', label: 'Curated Modules catalog', icon: Code2 },
    { id: 'sandbox', label: 'CLI Validation Sandbox', icon: ShieldAlert },
    { id: 'refinements', label: 'Applying Refinements', icon: Cpu },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Header */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ATA Docs
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xs font-semibold text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row gap-10">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 flex-shrink-0 space-y-1">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-3 mb-3">Documentation</p>
          {navigation.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as any)}
                className={`flex w-full items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  isActive 
                    ? 'bg-indigo-600 text-white' 
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </aside>

        {/* Documentation Content Area */}
        <main className="flex-1 max-w-3xl prose prose-invert">
          {activeSection === 'getting-started' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-extrabold text-white">Getting Started</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Welcome to the Ata Platform documentation. Ata translates your architectural requirements into verified, standard, and secure Terraform configurations.
              </p>

              <div className="p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs">
                <strong>No AI Hallucinations:</strong> The engine converts your requests into structural JSON. Files are assembled using pre-vetted modules, leaving no room for AI syntax errors.
              </div>

              <h2 className="text-xl font-bold text-white pt-4">Workflow Overview</h2>
              <ol className="list-decimal list-inside space-y-2 text-xs text-slate-400 leading-relaxed">
                <li>Create a workspace and project.</li>
                <li>Input your configuration goals in plain English (e.g. "Create a public VPC with 2 subnets").</li>
                <li>Preview and review files inside our custom Code Explorer tree.</li>
                <li>Validate syntax against real provider constraints before exporting.</li>
              </ol>
            </div>
          )}

          {activeSection === 'modules' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-extrabold text-white">Curated Modules Catalog</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ata compiles infrastructure by arranging pre-defined, secure local modules. We support:
              </p>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <div className="p-4 border border-slate-900 bg-slate-950 rounded-xl space-y-2">
                  <h3 className="font-bold text-sm text-slate-200">VPC (Virtual Private Cloud)</h3>
                  <p className="text-[11px] text-slate-400">Creates public/private subnets, routes, and NAT gateways across Availability Zones.</p>
                </div>
                <div className="p-4 border border-slate-900 bg-slate-950 rounded-xl space-y-2">
                  <h3 className="font-bold text-sm text-slate-200">EC2 Auto Scaling Groups</h3>
                  <p className="text-[11px] text-slate-400">Launches auto-scaled instances inside private subnets attached to load balancers.</p>
                </div>
                <div className="p-4 border border-slate-900 bg-slate-950 rounded-xl space-y-2">
                  <h3 className="font-bold text-sm text-slate-200">ECS Fargate Tiers</h3>
                  <p className="text-[11px] text-slate-400">Serverless container tier orchestration with ALB integration.</p>
                </div>
                <div className="p-4 border border-slate-900 bg-slate-950 rounded-xl space-y-2">
                  <h3 className="font-bold text-sm text-slate-200">RDS PostgreSQL</h3>
                  <p className="text-[11px] text-slate-400">Managed databases running within private database subnets with automated security groups.</p>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'sandbox' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-extrabold text-white">CLI Validation Sandbox</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ata runs each compilation through an isolated, sandboxed background shell to check Terraform compliance.
              </p>

              <h2 className="text-xl font-bold text-white pt-2">Internal Validation Steps</h2>
              <div className="space-y-4">
                <div className="p-4 bg-slate-900 rounded-xl font-mono text-[11px] text-indigo-300 space-y-1">
                  <div>$ terraform fmt -check</div>
                  <div className="text-slate-500"># Verifies formatting complies with canonical HCL style</div>
                </div>

                <div className="p-4 bg-slate-900 rounded-xl font-mono text-[11px] text-indigo-300 space-y-1">
                  <div>$ terraform init -backend=false</div>
                  <div>$ terraform validate</div>
                  <div className="text-slate-500"># Validates module variables, dependencies, and syntax</div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'refinements' && (
            <div className="space-y-6">
              <h1 className="text-3xl font-extrabold text-white">Applying Refinements</h1>
              <p className="text-slate-400 text-sm leading-relaxed">
                Ata allows you to iteratively tweak your infrastructure configurations:
              </p>
              <ul className="list-disc list-inside space-y-2 text-xs text-slate-400 leading-relaxed">
                <li>Submit natural language refinements, e.g., "Add an RDS instance to the database tier."</li>
                <li>Compare versions file-by-file with our side-by-side Diff Viewer.</li>
                <li>Download clean, fully zipped HCL project packages ready for git repositories.</li>
              </ul>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
