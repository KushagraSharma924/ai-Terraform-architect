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

/**
 * AI orchestration layer. For each question it: classifies intent (tool select)
 * → calls the relevant engine(s) over real account data → synthesizes a grounded
 * answer with citations. Never invents resource ids — everything comes from the
 * fetched context.
 */
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
      answer: result.answer,
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

  /** Tool-routing + grounding. Returns a draft answer + citations + raw data. */
  private async answer(
    organizationId: string,
    cloudAccountId: string,
    question: string,
  ): Promise<AskResult> {
    const intent = classifyIntent(question);

    if (intent === 'cost_trend') {
      const series = await this.telemetry.getCostSeries(cloudAccountId, 30);
      const trend = this.costEngine.analyze(series);
      const top = trend.drivers[0];
      const dir = trend.deltaPct >= 0 ? 'up' : 'down';
      const answer =
        `Your spend is ${dir} ${Math.abs(trend.deltaPct)}% this period ` +
        `($${trend.totalPrevious} → $${trend.totalCurrent}). ` +
        (top ? `The biggest driver is ${top.service} (${top.deltaPct >= 0 ? '+' : ''}${top.deltaPct}%, now $${top.current}).` : '');
      return { answer, intent, citations: trend.drivers.slice(0, 3), data: { trend } };
    }

    if (intent === 'cost_optimize' || intent === 'unused_resources') {
      const { resources } = await this.inventory.getInventory(organizationId, cloudAccountId);
      const recs = this.recommender.generate(this.toDiscovered(resources));
      const savings = recs.reduce((s, r) => s + (r.estSavings ?? 0), 0);
      const answer = recs.length
        ? `I found ${recs.length} optimization opportunities worth ~$${savings}/mo. ` +
          `Top: ${recs.slice(0, 3).map((r) => r.title).join('; ')}.`
        : 'No optimization opportunities found in the latest inventory.';
      return { answer, intent, citations: recs.map((r) => r.resourceRef), data: { recommendations: recs } };
    }

    if (intent === 'unhealthy_resources') {
      const { resources } = await this.inventory.getInventory(organizationId, cloudAccountId);
      const unhealthy = resources.filter(
        (r) => r.state === 'stopped' || (r.config as any)?.cpuUtilizationAvg === 0,
      );
      const answer = unhealthy.length
        ? `${unhealthy.length} resource(s) look unhealthy/idle: ${unhealthy.map((r) => r.resourceId).join(', ')}.`
        : 'All resources appear healthy in the latest snapshot.';
      return { answer, intent, citations: unhealthy.map((r) => r.resourceId), data: { unhealthy } };
    }

    if (intent === 'security') {
      const { resources } = await this.inventory.getInventory(organizationId, cloudAccountId);
      const recs = this.recommender.generate(this.toDiscovered(resources)).filter((r) => r.category === 'security');
      const answer = recs.length
        ? `${recs.length} security issue(s): ${recs.map((r) => r.title).join('; ')}.`
        : 'No security issues detected in the latest inventory.';
      return { answer, intent, citations: recs.map((r) => r.resourceRef), data: { security: recs } };
    }

    const { resources } = await this.inventory.getInventory(organizationId, cloudAccountId);
    return {
      answer: `You have ${resources.length} discovered resources. Ask me about cost trends, unused resources, security, or optimizations.`,
      intent,
      citations: [],
      data: { resourceCount: resources.length },
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
