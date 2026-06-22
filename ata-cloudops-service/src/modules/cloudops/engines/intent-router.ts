export type CloudOpsIntent =
  | 'cost_trend'
  | 'cost_optimize'
  | 'unhealthy_resources'
  | 'unused_resources'
  | 'security'
  | 'general';

/**
 * Lightweight intent classifier (the "tool selection" step). In production an
 * LLM with function-calling picks the tool; this keyword router keeps the
 * default path deterministic and testable.
 */
export function classifyIntent(question: string): CloudOpsIntent {
  const q = question.toLowerCase();

  // Cost trends — broad: any question about spending, billing, costs over time
  if (/(bill|cost|spend|spending|expenditure|expensive|pric|charg).*(increas|rising|up|higher|why|trend|history|last|past|month|week)/.test(q)) return 'cost_trend';
  if (/(why|what|how).*(bill|cost|spend|expensive|charg)/.test(q)) return 'cost_trend';
  if (/(trend|breakdown|analys|summary|overview).*(cost|spend|bill)/.test(q)) return 'cost_trend';
  if (/cost.*(trend|breakdown|analys|summary|overview|report)/.test(q)) return 'cost_trend';
  if (/how much.*(spend|cost|pay|charg|bill)/.test(q)) return 'cost_trend';
  if (/(show|display|give|what).*(cost|spend|bill|expenditure)/.test(q)) return 'cost_trend';
  if (/my (aws|cloud|infra).*(cost|bill|spend)/.test(q)) return 'cost_trend';

  // Cost optimization — reducing spend, savings, right-sizing
  if (/(optimi|save|saving|reduce|lower|cut|cheaper|right.?siz|recommend)/.test(q)) return 'cost_optimize';
  if (/(how|way|tip).*(save|cheap|less|lower|reduce)/.test(q)) return 'cost_optimize';
  if (/(waste|wasteful|overprovisioned|overspend)/.test(q)) return 'cost_optimize';

  // Unhealthy / stopped resources
  if (/(unhealthy|down|failing|failed|degraded|status check|alarm|error|crash|problem|issue)/.test(q)) return 'unhealthy_resources';
  if (/(stopped|terminated|not running|offline)/.test(q)) return 'unhealthy_resources';
  if (/(health|status).*(resource|instance|server|ec2|rds|service)/.test(q)) return 'unhealthy_resources';
  if (/(resource|instance|server).*(health|status|running|alive|up)/.test(q)) return 'unhealthy_resources';

  // Unused / idle resources
  if (/(unused|idle|orphan|not used|stale|abandoned|zombie|inactive)/.test(q)) return 'unused_resources';
  if (/(which|what|show|list|find).*(unused|idle|not used|stale|wasted|dormant)/.test(q)) return 'unused_resources';

  // Security
  if (/(secur|public|exposed|iam|encrypt|vulnerab|compliance|risk|misconfigur|access|permissive|open|bucket)/.test(q)) return 'security';
  if (/(who|what).*(access|permiss|can read|can write)/.test(q)) return 'security';

  // Catch-all for resource listing / inventory questions → cost_trend gives a useful overview
  if (/(resource|inventory|infrastructure|infra|what do i have|what.*(running|deployed|provisioned))/.test(q)) return 'cost_trend';

  return 'general';
}
