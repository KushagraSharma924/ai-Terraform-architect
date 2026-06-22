import { CostAnalysisEngine } from './engines/cost-analysis.engine';
import { RecommendationEngine } from './engines/recommendation.engine';
import { classifyIntent } from './engines/intent-router';
import { MockTelemetryAdapter } from './ports/mock-telemetry.adapter';

describe('CostAnalysisEngine', () => {
  it('detects an upward trend and ranks drivers', () => {
    const engine = new CostAnalysisEngine();
    const points = [
      { service: 'EC2', usageDate: '2026-06-01', amount: 10 },
      { service: 'EC2', usageDate: '2026-06-02', amount: 10 },
      { service: 'EC2', usageDate: '2026-06-03', amount: 30 },
      { service: 'EC2', usageDate: '2026-06-04', amount: 30 },
    ];
    const trend = engine.analyze(points);
    expect(trend.deltaPct).toBeGreaterThan(0);
    expect(trend.drivers[0].service).toBe('EC2');
  });
});

describe('RecommendationEngine', () => {
  const engine = new RecommendationEngine();

  it('flags idle, oversized, public, and wildcard-IAM resources', () => {
    const recs = engine.generate([
      { service: 'ec2', resourceId: 'i-idle', state: 'stopped', monthlyCost: 30, config: { idleDays: 47 } },
      { service: 'ec2', resourceId: 'i-big', state: 'running', monthlyCost: 280, config: { cpuUtilizationAvg: 5 } },
      { service: 's3', resourceId: 'b-pub', config: { publicAccess: true } },
      { service: 'iam', resourceId: 'r-ci', config: { wildcardPolicy: true } },
    ]);
    const titles = recs.map((r) => r.title).join(' ');
    expect(titles).toMatch(/idle/i);
    expect(titles).toMatch(/Right-size/i);
    expect(recs.some((r) => r.category === 'security')).toBe(true);
  });
});

describe('intent router', () => {
  it('routes the design example questions', () => {
    expect(classifyIntent('Why is my AWS bill increasing?')).toBe('cost_trend');
    expect(classifyIntent('Show unhealthy EC2 instances.')).toBe('unhealthy_resources');
    expect(classifyIntent('Which resources are unused?')).toBe('unused_resources');
    expect(classifyIntent('Recommend cost optimizations.')).toBe('cost_optimize');
    expect(classifyIntent('Are any buckets public?')).toBe('security');
  });
});

describe('MockTelemetryAdapter', () => {
  it('is deterministic per account', async () => {
    const a = new MockTelemetryAdapter();
    const r1 = await a.discoverResources('acc-1');
    const r2 = await a.discoverResources('acc-1');
    expect(r1).toEqual(r2);
    expect(r1.length).toBeGreaterThan(0);
  });
});
