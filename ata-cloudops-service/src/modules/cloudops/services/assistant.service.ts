import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CloudOpsRepository } from '../repositories/cloudops.repository';
import { InventoryService } from './inventory.service';
import { CostAnalysisEngine } from '../engines/cost-analysis.engine';
import { RecommendationEngine } from '../engines/recommendation.engine';
import { TELEMETRY_PORT, TelemetryPort } from '../ports/telemetry.port';
import { LLM_PORT, LlmPort } from '../ports/llm.port';
import { classifyIntent } from '../engines/intent-router';

export interface AskResult {
  answer: string;
  intent: string;
  citations: unknown[];
  data?: unknown;
}

@Injectable()
export class AssistantService {
  constructor(
    private readonly repo: CloudOpsRepository,
    private readonly inventory: InventoryService,
    private readonly costEngine: CostAnalysisEngine,
    private readonly recommender: RecommendationEngine,
    @Inject(TELEMETRY_PORT) private readonly telemetry: TelemetryPort,
    @Inject(LLM_PORT) private readonly llm: LlmPort,
  ) {}

  async startConversation(organizationId: string, userId: string, cloudAccountId: string) {
    return this.repo.createConversation({ organizationId, userId, cloudAccountId, title: 'New conversation' });
  }

  listConversations(userId: string) {
    return this.repo.listConversations(userId);
  }

  async getMessages(conversationId: string) {
    return this.repo.listMessages(conversationId);
  }

  async ask(conversationId: string, question: string): Promise<AskResult> {
    const conversation = await this.repo.getConversation(conversationId);
    if (!conversation) throw new NotFoundException('Conversation not found');

    await this.repo.addMessage({ conversationId, role: 'user', content: question });

    const result = await this.answer(
      conversation.organizationId,
      conversation.cloudAccountId,
      question,
    );

    const synthesized = await this.llm.synthesize(question, {
      intent: result.intent,
      ...((result.data as object) ?? {}),
    });

    await this.repo.addMessage({
      conversationId,
      role: 'assistant',
      content: synthesized,
      citations: result.citations,
    });

    return { ...result, answer: synthesized };
  }

  private async answer(
    organizationId: string,
    cloudAccountId: string,
    question: string,
  ): Promise<AskResult> {
    const intent = classifyIntent(question);
    const { resources } = await this.inventory.getInventory(organizationId, cloudAccountId);
    const discovered = this.toDiscovered(resources);

    // Always build a concise resource summary for Ollama context
    const resourceSummary = discovered.map((r) => ({
      service: r.service,
      id: r.resourceId,
      name: (r.tags as any)?.Name ?? (r.tags as any)?.name ?? r.resourceId,
      type: r.type,
      state: r.state,
      region: r.region,
      monthlyCost: r.monthlyCost,
      tags: r.tags,
      config: r.config,
    }));

    if (intent === 'cost_trend') {
      const series = await this.telemetry.getCostSeries(cloudAccountId, 30);
      const trend = this.costEngine.analyze(series);
      return {
        answer: '',
        intent,
        citations: trend.drivers.slice(0, 3),
        data: { trend, resources: resourceSummary },
      };
    }

    if (intent === 'cost_optimize' || intent === 'unused_resources') {
      const recs = this.recommender.generate(discovered);
      return {
        answer: '',
        intent,
        citations: recs.map((r) => r.resourceRef),
        data: { recommendations: recs, resources: resourceSummary },
      };
    }

    if (intent === 'unhealthy_resources') {
      const stopped = resourceSummary.filter((r) => r.state === 'stopped');
      return {
        answer: '',
        intent,
        citations: stopped.map((r) => r.id),
        data: { stoppedResources: stopped, allResources: resourceSummary },
      };
    }

    if (intent === 'security') {
      const recs = this.recommender.generate(discovered).filter((r) => r.category === 'security');
      // Include raw resource configs so Ollama can inspect public access, IAM policies etc.
      const s3Buckets = resourceSummary.filter((r) => r.service === 's3');
      const iamRoles = resourceSummary.filter((r) => r.service === 'iam');
      const publicBuckets = s3Buckets.filter((r) => (r.config as any)?.publicAccess === true);
      const publicRds = resourceSummary.filter(
        (r) => r.service === 'rds' && (r.config as any)?.publiclyAccessible === true,
      );
      return {
        answer: '',
        intent,
        citations: recs.map((r) => r.resourceRef),
        data: {
          securityRecommendations: recs,
          s3Buckets,
          publicBuckets,
          publicRds,
          iamRoles,
          allResources: resourceSummary,
        },
      };
    }

    // general — pass full inventory so Ollama can answer any specific question
    return {
      answer: '',
      intent,
      citations: [],
      data: {
        totalResources: resources.length,
        resources: resourceSummary,
        byService: {
          ec2: resourceSummary.filter((r) => r.service === 'ec2'),
          rds: resourceSummary.filter((r) => r.service === 'rds'),
          s3: resourceSummary.filter((r) => r.service === 's3'),
          iam: resourceSummary.filter((r) => r.service === 'iam'),
        },
      },
    };
  }

  private toDiscovered(resources: any[]) {
    return resources.map((r) => ({
      service: r.service,
      resourceId: r.resourceId,
      region: r.region,
      type: r.type,
      state: r.state,
      monthlyCost: r.monthlyCost != null ? Number(r.monthlyCost) : undefined,
      tags: r.tags,
      config: r.config,
    }));
  }
}
