import Link from 'next/link';
import { Sparkles, Terminal, ShieldCheck, GitCompare, ArrowRight, Layers, Cpu, Network, Check, HelpCircle, CheckCircle2 } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Navbar */}
      <header className="border-b border-slate-900 bg-slate-950/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Terminal className="h-5 w-5 text-white" />
            </div>
            <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
              ATA
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <Link href="/docs" className="hover:text-white transition-colors">Documentation</Link>
            <Link href="/security" className="hover:text-white transition-colors">Security</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-white transition-colors">Workflow</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              href="/login"
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/10 hover:shadow-indigo-600/20"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 overflow-hidden">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-4xl mx-auto px-6 text-center space-y-8 relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-400 text-xs font-semibold animate-pulse">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Next-Gen Terraform Automation</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-tight bg-gradient-to-b from-white via-slate-100 to-slate-500 bg-clip-text text-transparent">
            Translate Requirements into <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text">
              Vetted Terraform Code
            </span>
          </h1>

          <p className="text-slate-400 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Input natural language specifications and compile them into complete, secure, and fully validated HCL modules. Stop writing boilerplate and start designing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-semibold text-white transition-all shadow-lg shadow-indigo-600/20 hover:scale-[1.02]"
            >
              Start Designing Now
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto inline-flex items-center justify-center px-6 py-3 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-sm font-semibold text-slate-300 transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section id="how-it-works" className="py-20 border-t border-slate-900 bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">How Ata Works</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Four steps from abstract requirements to deployable HCL</p>
          </div>

          <div className="grid gap-6 md:grid-cols-4">
            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl relative space-y-4">
              <span className="absolute top-4 right-4 text-4xl font-extrabold text-indigo-500/10">01</span>
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-semibold text-sm">
                Spec
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Describe Intent</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Provide natural language descriptions of your infrastructure tier, e.g., "A private multi-AZ VPC with ECS Fargate services and alb."
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl relative space-y-4">
              <span className="absolute top-4 right-4 text-4xl font-extrabold text-purple-500/10">02</span>
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 font-semibold text-sm">
                Build
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Deterministic Compilation</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                The compilation engine parses intent parameters, pulls verified child modules verbatim, and generates root HCL configs.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl relative space-y-4">
              <span className="absolute top-4 right-4 text-4xl font-extrabold text-pink-500/10">03</span>
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 font-semibold text-sm">
                Gate
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Sandboxed Validation</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Your HCL project is ran through a background sandboxed shell. We run <code className="text-[10px] bg-slate-950 px-1 py-0.5 rounded text-pink-300">terraform validate</code> prior to release.
              </p>
            </div>

            <div className="bg-slate-900/40 border border-slate-900 p-6 rounded-2xl relative space-y-4">
              <span className="absolute top-4 right-4 text-4xl font-extrabold text-emerald-500/10">04</span>
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-semibold text-sm">
                Ship
              </div>
              <h3 className="font-bold text-slate-200 text-sm">Version Explorer</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Inspect code versions inside a custom file explorer, view code diffs side-by-side, download packages, and apply refinements.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-20 border-t border-slate-900 bg-slate-950/50">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Ecosystem Architecture</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Deterministic generation without unverified AI boilerplate</p>
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {/* Card 1 */}
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-4 hover:border-slate-800 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                <BrainCircuit className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-200">AI Intent Translation</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Translate plain English requests into highly structured, schema-compliant JSON specifications with multi-stage correction loops.
              </p>
            </div>

            {/* Card 2 */}
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-4 hover:border-slate-800 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-200">Vetted Local Modules</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Source configurations are copied verbatim from a pre-vetted module library. Keeps resource definitions standard and secure.
              </p>
            </div>

            {/* Card 3 */}
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-4 hover:border-slate-800 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-200">Sandboxed CLI Gates</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Spawns sandboxed subprocesses running <code className="text-[10px] bg-slate-900 px-1 py-0.5 rounded font-mono text-pink-300">terraform fmt</code> and <code className="text-[10px] bg-slate-900 px-1 py-0.5 rounded font-mono text-pink-300">terraform validate</code> prior to release.
              </p>
            </div>

            {/* Card 4 */}
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-4 hover:border-slate-800 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                <GitCompare className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-200">Version Diff Explorer</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Compare iterations file-by-file with a side-by-side content viewer. Trace refinements, added components, and parameter changes.
              </p>
            </div>

            {/* Card 5 */}
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-4 hover:border-slate-800 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-200">Multi-AZ Configurations</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Supports ECS Fargate container tiers, RDS database configurations, public/private VPC partitions, and load balancer setups.
              </p>
            </div>

            {/* Card 6 */}
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-4 hover:border-slate-800 transition-colors">
              <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400">
                <Network className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-slate-200">Microservice Orchestration</h3>
              <p className="text-slate-400 text-xs leading-relaxed">
                Powered by a high-performance NestJS microservice mesh on port 3005 with BullMQ queue worker pools.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-slate-900 bg-slate-950/20">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Flexible Developer Plans</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Start generating and verifying configs immediately</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Free */}
            <div className="bg-slate-900/20 border border-slate-900 p-8 rounded-3xl space-y-6 relative flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-200 text-lg">Developer Free</h3>
                <p className="text-slate-400 text-xs mt-1">For experimenting and local testing.</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">$0</span>
                  <span className="text-xs text-slate-500">/ forever</span>
                </div>
                <ul className="mt-6 space-y-3.5 text-xs text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>20 generation cycles / month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Access to standard AWS modules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Basic sandboxed CLI validations</span>
                  </li>
                </ul>
              </div>
              <Link href="/register" className="block text-center py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs font-semibold text-white transition-all">
                Get Started
              </Link>
            </div>

            {/* Pro */}
            <div className="bg-gradient-to-b from-indigo-950/20 to-indigo-900/10 border-2 border-indigo-500/30 p-8 rounded-3xl space-y-6 relative flex flex-col justify-between shadow-2xl shadow-indigo-500/5">
              <span className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-indigo-600 text-white font-bold text-[10px] tracking-wider uppercase">Most Popular</span>
              <div>
                <h3 className="font-bold text-slate-200 text-lg">Pro Architect</h3>
                <p className="text-indigo-300 text-xs mt-1">For professional DevOps teams and developers.</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">$49</span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>
                <ul className="mt-6 space-y-3.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-indigo-400" />
                    <span>Unlimited generations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-indigo-400" />
                    <span>Advanced Custom Modules</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-indigo-400" />
                    <span>Priority background validation queues</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-indigo-400" />
                    <span>Version comparison / side-by-side diffs</span>
                  </li>
                </ul>
              </div>
              <Link href="/register" className="block text-center py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-all shadow-md shadow-indigo-600/20">
                Upgrade to Pro
              </Link>
            </div>

            {/* Enterprise */}
            <div className="bg-slate-900/20 border border-slate-900 p-8 rounded-3xl space-y-6 relative flex flex-col justify-between">
              <div>
                <h3 className="font-bold text-slate-200 text-lg">Enterprise</h3>
                <p className="text-slate-400 text-xs mt-1">For large-scale security-conscious organizations.</p>
                <div className="mt-4 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold">Custom</span>
                </div>
                <ul className="mt-6 space-y-3.5 text-xs text-slate-400">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Self-hosted code verification gateways</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Custom provider modules mapping</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>SAML Single Sign-On (SSO)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Dedicated SLA and engineering support</span>
                  </li>
                </ul>
              </div>
              <a href="mailto:support@ataplatform.com" className="block text-center py-2.5 rounded-xl border border-slate-800 bg-slate-950 hover:bg-slate-900 text-xs font-semibold text-white transition-all">
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 border-t border-slate-900 bg-slate-950/50">
        <div className="max-w-4xl mx-auto px-6 space-y-12">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Frequently Asked Questions</h2>
            <p className="text-slate-400 text-xs sm:text-sm">Get answers to technical and architecture questions</p>
          </div>

          <div className="space-y-6">
            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-2">
              <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                Is the output generated directly by an LLM?
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed pl-6">
                No. AI parses your natural language requirements into a structured JSON configuration layout. The compilation phase of HCL matches modules and creates files deterministically using templates, ensuring zero raw AI boilerplate or syntax bugs in production code.
              </p>
            </div>

            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-2">
              <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                How does sandboxed CLI validation work?
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed pl-6">
                Ata spawns an isolated subprocess with network capabilities disabled, runs <code className="text-[10px] bg-slate-900 px-1 py-0.5 rounded">terraform init -backend=false</code> followed by <code className="text-[10px] bg-slate-900 px-1 py-0.5 rounded">terraform validate</code>. This ensures variables and attributes match provider constraints before you download the config.
              </p>
            </div>

            <div className="border border-slate-900 bg-slate-950 p-6 rounded-2xl space-y-2">
              <h4 className="font-bold text-slate-200 text-sm flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                Are cloud credentials required to compile the Terraform?
              </h4>
              <p className="text-slate-400 text-xs leading-relaxed pl-6">
                Absolutely not. All code generation and validation runs are fully static. We do not store or request cloud credentials during code translation. Security policies prevent plaintext credentials inside tfvars.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-12 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <span>&copy; {new Date().getFullYear()} ATA Platform. All rights reserved.</span>
          <div className="flex gap-4">
            <Link href="/security" className="hover:text-slate-400 transition-colors">Security Policy</Link>
            <Link href="/docs" className="hover:text-slate-400 transition-colors">Documentation</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

// Temporary component fallback mapping for Lucide icon
function BrainCircuit(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M12 5V3M12 21v-2M19 12h2M3 12h2" />
      <path d="m18.36 5.64-1.42 1.42M7.05 16.95l-1.42 1.42M18.36 18.36l-1.42-1.42M7.05 7.05 5.64 5.64" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}
