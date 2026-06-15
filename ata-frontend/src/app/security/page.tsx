import Link from 'next/link';
import { Terminal, Shield, Lock, EyeOff, Server, ArrowLeft } from 'lucide-react';

export default function SecurityPage() {
  const policies = [
    {
      title: 'Zero Credentials Exposure',
      description: 'Ata does not request or store cloud access tokens or production secret variables. All secrets are referenced via native Terraform dynamic variables or auto-generated random passwords stored in secrets managers.',
      icon: Lock
    },
    {
      title: 'Sandboxed Validation Gates',
      description: 'Compilation reviews run in restricted sandbox spaces with network connectivity locked down. This prevents unauthorized outbound API requests during terraform validations.',
      icon: Shield
    },
    {
      title: 'Vetted Modules Compilation',
      description: 'Instead of raw code generated on-the-fly by models (which can include vulnerabilities), all child modules are copied from a vetted local repository containing secure defaults.',
      icon: Server
    },
    {
      title: 'Encryption in Transit',
      description: 'All communication between services is encrypted using TLS. Your specification inputs and intermediate build graphs are kept private and isolated by workspace permissions.',
      icon: EyeOff
    }
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
              ATA Security
            </span>
          </Link>
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-xs font-semibold text-slate-300 hover:text-indigo-400 transition-colors flex items-center gap-1.5">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-16 space-y-12">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-semibold">
            <Shield className="h-3.5 w-3.5" />
            <span>Enterprise-Grade Security Standards</span>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight bg-gradient-to-b from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
            Security & Trust Center
          </h1>
          <p className="text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
            How we protect your architecture specifications, isolate code runs, and guarantee deterministic infrastructure compilation.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 pt-6">
          {policies.map((policy, idx) => {
            const Icon = policy.icon;
            return (
              <div key={idx} className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-3.5">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="font-bold text-slate-200 text-sm">{policy.title}</h3>
                <p className="text-slate-400 text-xs leading-relaxed">{policy.description}</p>
              </div>
            );
          })}
        </div>

        {/* Detailed disclosure */}
        <div className="border border-slate-900 bg-slate-900/10 p-8 rounded-3xl space-y-4">
          <h2 className="text-lg font-bold text-white">Security Disclosures & Audits</h2>
          <p className="text-slate-400 text-xs leading-relaxed">
            Ata is designed with a strict secure software development lifecycle (SSDLC). We automatically scan target HCL outputs with static application security testing (SAST) tools like Checkov and tfsec prior to publishing modules into our local library cache, ensuring zero misconfigured resources.
          </p>
          <div className="pt-2">
            <a href="mailto:security@ataplatform.com" className="inline-flex items-center gap-1 text-xs text-indigo-400 font-semibold hover:underline">
              Submit a Security Inquiry &rarr;
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
