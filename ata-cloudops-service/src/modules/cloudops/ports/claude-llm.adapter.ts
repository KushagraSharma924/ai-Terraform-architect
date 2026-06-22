import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { LlmPort } from './llm.port';

@Injectable()
export class ClaudeLlmAdapter implements LlmPort {
  private readonly logger = new Logger(ClaudeLlmAdapter.name);
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = 'claude-haiku-4-5-20251001') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async synthesize(question: string, context: Record<string, unknown>): Promise<string> {
    const contextText = this.buildContextText(context);

    const systemPrompt = `You are a CloudOps AI assistant with real-time access to the user's AWS account data.
Answer questions directly, specifically, and concisely using only the data provided.
Never say you lack access — the data is right here. Be factual and helpful.`;

    const userPrompt = `${contextText}\n\nUser question: ${question}`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
        max_tokens: 1024,
      });

      const text = response.content[0]?.type === 'text' ? response.content[0].text.trim() : '';
      this.logger.log(`Claude responded (in: ${response.usage.input_tokens}, out: ${response.usage.output_tokens} tokens)`);
      return text;
    } catch (err: any) {
      this.logger.error(`Claude failed: ${err.message}`);
      return 'Sorry, I could not generate a response right now.';
    }
  }

  private buildContextText(context: Record<string, unknown>): string {
    const lines: string[] = ['=== AWS Account Data ==='];

    const ec2List = (context as any)?.byService?.ec2 ?? this.fromResources(context, 'ec2');
    if (ec2List?.length) {
      lines.push(`\nEC2 Instances (${ec2List.length}):`);
      for (const i of ec2List) {
        const name = i.tags?.Name ?? i.name ?? 'unnamed';
        lines.push(`  - ${i.id} | name: ${name} | type: ${i.type ?? '?'} | state: ${i.state} | region: ${i.region ?? '?'}`);
      }
    }

    const s3List = (context as any)?.byService?.s3 ?? this.fromResources(context, 's3');
    if (s3List?.length) {
      lines.push(`\nS3 Buckets (${s3List.length}):`);
      for (const b of s3List) {
        const pub = b.config?.publicAccess ? 'PUBLIC ⚠️' : 'private';
        lines.push(`  - ${b.id} | access: ${pub}`);
      }
    }

    const rdsList = (context as any)?.byService?.rds ?? this.fromResources(context, 'rds');
    if (rdsList?.length) {
      lines.push(`\nRDS Instances (${rdsList.length}):`);
      for (const db of rdsList) {
        lines.push(`  - ${db.id} | class: ${db.type} | state: ${db.state} | public: ${db.config?.publiclyAccessible ?? false}`);
      }
    }

    const iamList = (context as any)?.byService?.iam ?? this.fromResources(context, 'iam');
    if (iamList?.length) {
      lines.push(`\nIAM Roles (${iamList.length}):`);
      for (const r of iamList) lines.push(`  - ${r.id}`);
    }

    const trend = (context as any)?.trend;
    if (trend) {
      lines.push(`\nCost Trend (30 days):`);
      lines.push(`  Previous: $${trend.totalPrevious} → Current: $${trend.totalCurrent} (${trend.deltaPct >= 0 ? '+' : ''}${trend.deltaPct}%)`);
      for (const d of (trend.drivers ?? []).slice(0, 5)) {
        lines.push(`  - ${d.service}: $${d.current} (${d.deltaPct >= 0 ? '+' : ''}${d.deltaPct}%)`);
      }
    }

    const secRecs = (context as any)?.securityRecommendations ?? [];
    const publicBuckets = (context as any)?.publicBuckets ?? [];
    if (secRecs.length || publicBuckets.length) {
      lines.push('\nSecurity Issues:');
      for (const r of secRecs) lines.push(`  - [${r.severity}] ${r.title}`);
      for (const b of publicBuckets) lines.push(`  - [critical] Bucket "${b.id}" is publicly accessible`);
    }

    const recs = (context as any)?.recommendations ?? [];
    if (recs.length) {
      lines.push(`\nOptimization Recommendations (${recs.length}):`);
      for (const r of recs.slice(0, 10)) {
        lines.push(`  - [${r.category}] ${r.title}${r.estSavings ? ` — saves ~$${r.estSavings}/mo` : ''}`);
      }
    }

    const stopped = (context as any)?.stoppedResources ?? [];
    if (stopped.length) {
      lines.push('\nStopped/Unhealthy Resources:');
      for (const r of stopped) lines.push(`  - ${r.service.toUpperCase()} ${r.id} (${r.state})`);
    }

    if (lines.length === 1) lines.push('No resource data available.');
    return lines.join('\n');
  }

  private fromResources(context: Record<string, unknown>, service: string): any[] {
    return ((context as any)?.resources ?? []).filter((r: any) => r.service === service);
  }
}
