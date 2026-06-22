import { Injectable } from '@nestjs/common';
import { RawFinding, Severity } from '../scanners/scanner.port';

const WEIGHTS: Record<Severity, number> = {
  critical: 40,
  high: 20,
  medium: 8,
  low: 3,
  info: 0,
};

export interface RiskResult {
  score: number; // 0 (worst) .. 100 (clean)
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  counts: Record<Severity, number>;
}

/**
 * Severity-weighted risk score. Starts at 100 (clean) and subtracts weighted
 * penalties, with diminishing returns so one critical doesn't instantly zero a
 * project while a swarm of lows still matters. Deterministic + unit-tested.
 */
@Injectable()
export class RiskScoringEngine {
  score(findings: RawFinding[]): RiskResult {
    const counts: Record<Severity, number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };
    for (const f of findings) counts[f.severity]++;

    const penalty = (Object.keys(WEIGHTS) as Severity[]).reduce((sum, sev) => {
      // sqrt scaling → diminishing marginal penalty per additional finding.
      return sum + WEIGHTS[sev] * Math.sqrt(counts[sev]);
    }, 0);

    const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
    return { score, grade: this.grade(score, counts.critical), counts };
  }

  private grade(score: number, criticals: number): RiskResult['grade'] {
    // Any unresolved critical caps the grade at C.
    if (criticals > 0 && score > 70) return 'C';
    if (score >= 90) return 'A';
    if (score >= 75) return 'B';
    if (score >= 60) return 'C';
    if (score >= 40) return 'D';
    return 'F';
  }
}
