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
  if (/(bill|cost|spend|expensive).*(increas|rising|up|higher|why)/.test(q) || /why.*(bill|cost)/.test(q))
    return 'cost_trend';
  if (/(optimi|save|saving|reduce cost|cheaper|right.?siz)/.test(q)) return 'cost_optimize';
  if (/(unhealthy|down|failing|degraded|status check|alarm)/.test(q)) return 'unhealthy_resources';
  if (/(unused|idle|orphan|waste|not used)/.test(q)) return 'unused_resources';
  if (/(secur|public|exposed|iam|encrypt|vulnerab)/.test(q)) return 'security';
  return 'general';
}
