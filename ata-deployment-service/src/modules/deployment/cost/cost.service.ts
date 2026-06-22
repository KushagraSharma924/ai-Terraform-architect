import { Injectable } from '@nestjs/common';
import type { CostGuardrailRecord } from '../../../database/schema';

export interface CostEstimate {
  monthlyUsd: number;
  currency: string;
  breakdown?: Record<string, number>;
}

export interface GuardrailDecision {
  allowed: boolean;
  action: 'allow' | 'warn' | 'block';
  reason?: string;
}

/**
 * Cost estimation + guardrail evaluation (Phase 6 §8).
 *
 * `estimate` is the Infracost integration seam (mock heuristic by default).
 * `evaluateGuardrails` is fully implemented and is consulted by the orchestrator
 * before allowing a deployment to proceed past plan.
 */
@Injectable()
export class CostService {
  /** Placeholder estimator — replace with an Infracost adapter. */
  async estimate(planSummary?: { add: number; change: number }): Promise<CostEstimate> {
    const resources = (planSummary?.add ?? 0) + (planSummary?.change ?? 0);
    // ~$25/resource/month rough heuristic; real numbers come from Infracost.
    return { monthlyUsd: resources * 25, currency: 'USD' };
  }

  evaluateGuardrails(
    estimate: CostEstimate,
    guardrail: CostGuardrailRecord | null,
  ): GuardrailDecision {
    if (!guardrail) return { allowed: true, action: 'allow' };

    const limit = guardrail.perDeployLimitUsd;
    if (limit != null && estimate.monthlyUsd > limit) {
      if (guardrail.action === 'block') {
        return {
          allowed: false,
          action: 'block',
          reason: `Estimated $${estimate.monthlyUsd}/mo exceeds per-deploy limit $${limit}`,
        };
      }
      return {
        allowed: true,
        action: 'warn',
        reason: `Estimated $${estimate.monthlyUsd}/mo exceeds per-deploy limit $${limit}`,
      };
    }
    return { allowed: true, action: 'allow' };
  }
}
