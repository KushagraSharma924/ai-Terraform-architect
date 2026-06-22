import { Injectable, Logger } from '@nestjs/common';
import { LlmPort } from './llm.port';

@Injectable()
export class OllamaLlmAdapter implements LlmPort {
  private readonly logger = new Logger(OllamaLlmAdapter.name);
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(baseUrl = 'http://localhost:11434', model = 'qwen2.5:3b') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async synthesize(question: string, context: Record<string, unknown>): Promise<string> {
    const contextText = this.buildContextText(context);

    const systemPrompt = `You are a CloudOps AI assistant. You have access to real AWS account data listed below.
Answer questions directly and specifically using only the data provided.
Be concise. Never say you "don't have access" — use the data given to you.`;

    const userPrompt = `${contextText}

User question: ${question}

Answer directly using the data above:`;

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          options: { temperature: 0.2 },
          stream: false,
        }),
      });

      if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);

      const data = (await response.json()) as any;
      const text = data.message?.content?.trim();
      if (!text) throw new Error('Empty response from Ollama');

      this.logger.log(`Ollama responded (${data.eval_count ?? '?'} tokens)`);
      return text;
    } catch (err: any) {
      this.logger.error(`Ollama failed: ${err.message}`);
      return this.fallbackAnswer(question, context);
    }
  }

  /** Convert structured context into plain readable text for small models */
  private buildContextText(context: Record<string, unknown>): string {
    const lines: string[] = ['=== AWS Account Data ==='];

    // EC2 instances
    const ec2 = this.extractList(context, ['byService.ec2', 'ec2', 'resources'])
      .filter((r: any) => r.service === 'ec2' || context['byService']);
    const ec2List = (context as any)?.byService?.ec2 ?? this.extractList(context, ['resources']).filter((r: any) => r.service === 'ec2');
    if (ec2List?.length) {
      lines.push(`\nEC2 Instances (${ec2List.length} total):`);
      for (const i of ec2List) {
        const name = i.name !== i.id ? i.name : (i.tags?.Name ?? 'unnamed');
        lines.push(`  - ${i.id} | name: ${name} | type: ${i.type ?? 'unknown'} | state: ${i.state} | region: ${i.region ?? 'unknown'}`);
      }
    }

    // S3 buckets
    const s3List = (context as any)?.byService?.s3 ?? this.extractList(context, ['resources', 's3Buckets']).filter((r: any) => r.service === 's3');
    if (s3List?.length) {
      lines.push(`\nS3 Buckets (${s3List.length} total):`);
      for (const b of s3List) {
        const pub = b.config?.publicAccess ? 'PUBLIC ⚠️' : 'private';
        lines.push(`  - ${b.id} | access: ${pub}`);
      }
    }

    // RDS
    const rdsList = (context as any)?.byService?.rds ?? this.extractList(context, ['resources']).filter((r: any) => r.service === 'rds');
    if (rdsList?.length) {
      lines.push(`\nRDS Instances (${rdsList.length} total):`);
      for (const db of rdsList) {
        lines.push(`  - ${db.id} | class: ${db.type} | state: ${db.state} | public: ${db.config?.publiclyAccessible ?? false}`);
      }
    }

    // IAM roles
    const iamList = (context as any)?.byService?.iam ?? this.extractList(context, ['resources', 'iamRoles']).filter((r: any) => r.service === 'iam');
    if (iamList?.length) {
      lines.push(`\nIAM Roles (${iamList.length} total):`);
      for (const r of iamList.slice(0, 20)) {
        lines.push(`  - ${r.id} | arn: ${r.config?.arn ?? 'n/a'}`);
      }
    }

    // Cost trend
    const trend = (context as any)?.trend;
    if (trend) {
      lines.push(`\nCost Trend (30 days):`);
      lines.push(`  Previous period: $${trend.totalPrevious}`);
      lines.push(`  Current period:  $${trend.totalCurrent}`);
      lines.push(`  Change:          ${trend.deltaPct >= 0 ? '+' : ''}${trend.deltaPct}%`);
      if (trend.drivers?.length) {
        lines.push('  Top cost drivers:');
        for (const d of trend.drivers.slice(0, 5)) {
          lines.push(`    - ${d.service}: $${d.current} (${d.deltaPct >= 0 ? '+' : ''}${d.deltaPct}%)`);
        }
      }
    }

    // Security issues
    const secRecs = (context as any)?.securityRecommendations ?? [];
    const publicBuckets = (context as any)?.publicBuckets ?? [];
    if (secRecs.length || publicBuckets.length) {
      lines.push(`\nSecurity Issues:`);
      for (const r of secRecs) lines.push(`  - [${r.severity}] ${r.title}: ${r.rationale}`);
      for (const b of publicBuckets) lines.push(`  - [critical] Bucket ${b.id} is publicly accessible`);
    }

    // Recommendations
    const recs = (context as any)?.recommendations ?? [];
    if (recs.length) {
      lines.push(`\nOptimization Recommendations (${recs.length} total):`);
      for (const r of recs.slice(0, 10)) {
        lines.push(`  - [${r.category}] ${r.title}${r.estSavings ? ` — saves ~$${r.estSavings}/mo` : ''}`);
      }
    }

    // Stopped resources
    const stopped = (context as any)?.stoppedResources ?? [];
    if (stopped.length) {
      lines.push(`\nStopped/Unhealthy Resources:`);
      for (const r of stopped) lines.push(`  - ${r.service.toUpperCase()} ${r.id} (${r.state})`);
    }

    if (lines.length === 1) {
      lines.push('No specific resource data available.');
    }

    return lines.join('\n');
  }

  private extractList(context: Record<string, unknown>, keys: string[]): any[] {
    for (const key of keys) {
      const val = (context as any)[key];
      if (Array.isArray(val)) return val;
    }
    return [];
  }

  private fallbackAnswer(question: string, context: Record<string, unknown>): string {
    const ec2List = (context as any)?.byService?.ec2 ?? [];
    if (ec2List.length && /ec2|instance/i.test(question)) {
      return `You have ${ec2List.length} EC2 instances: ${ec2List.map((i: any) => i.id).join(', ')}.`;
    }
    return 'I could not generate a response. Please try again.';
  }
}
