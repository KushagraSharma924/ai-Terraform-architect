import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectDrizzle } from '../../database/drizzle.decorator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { eq } from 'drizzle-orm';
import { generations, llmCallLogs } from '../../database/schema';
import { InputValidatorService } from './input-validator/input-validator.service';
import { PromptBuilderService } from './prompt-builder/prompt-builder.service';
import { SchemaValidatorService } from './schema-validator/schema-validator.service';
import { AmbiguityScorerService } from './ambiguity-scorer/ambiguity-scorer.service';
import { LLMProviderFactory } from '@ata/llm-provider-lib';
import { ProjectServiceClient } from '../../common/clients/project-service.client';
import { computePromptHash } from '../../common/utils/prompt-hash.util';
import { redactObjectPii } from '../../common/utils/pii-redaction.util';
import Redis from 'ioredis';

@Injectable()
export class PipelineOrchestratorService implements OnApplicationShutdown {
  private readonly logger = new Logger(PipelineOrchestratorService.name);
  private readonly redis: Redis | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly inputValidator: InputValidatorService,
    private readonly promptBuilder: PromptBuilderService,
    private readonly schemaValidator: SchemaValidatorService,
    private readonly ambiguityScorer: AmbiguityScorerService,
    private readonly projectClient: ProjectServiceClient,
    @InjectDrizzle() private readonly db: NodePgDatabase,
  ) {
    const redisUrl = this.config.get<string>('app.redisUrl');
    if (redisUrl) {
      try {
        this.redis = new Redis(redisUrl, {
          maxRetriesPerRequest: 1,
          lazyConnect: true,
        });
        // Silent error handler to avoid crashing if Redis is down
        this.redis.on('error', () => {});
      } catch (err) {
        this.redis = null;
      }
    }
  }

  async process(generationId: string, userId: string): Promise<void> {
    const startTime = Date.now();
    this.logger.log(`Starting parsing pipeline for generation ${generationId}`);

    // Retrieve the generation record
    const [record] = await this.db
      .select()
      .from(generations)
      .where(eq(generations.id, generationId))
      .limit(1);

    if (!record) {
      this.logger.error(`Generation record ${generationId} not found`);
      return;
    }

    try {
      // 1. Re-validate defensively
      this.inputValidator.validate(record.promptText);

      // Update status to parsing
      await this.db
        .update(generations)
        .set({ status: 'parsing' })
        .where(eq(generations.id, generationId));

      // 2. Cache Lookup
      const cacheKey = `spec-cache:${record.promptHash}`;
      let cachedSpec: any = null;
      if (this.redis) {
        try {
          const cached = await this.redis.get(cacheKey);
          if (cached) {
            cachedSpec = JSON.parse(cached);
            this.logger.log(`Cache hit for prompt hash ${record.promptHash}`);
          }
        } catch (err) {
          this.logger.warn('Redis cache lookup failed (Redis might be down)');
        }
      }

      if (cachedSpec) {
        // Complete immediately using cached result
        await this.db
          .update(generations)
          .set({
            status: 'completed',
            infrastructureSpec: cachedSpec,
            confidenceScore: String(cachedSpec.confidenceScore || 1.0),
            completedAt: new Date(),
          })
          .where(eq(generations.id, generationId));

        // Decrement quota
        await this.projectClient.decrementQuota(userId, record.cloudProviderHint || 'aws');
        return;
      }

      // 3. Prompt Construction & Refinement Check
      let systemPrompt = this.promptBuilder.buildSystemPrompt();
      let userPrompt = record.promptText;

      if (record.parentGenerationId) {
        // Refinement flow: load parent generation
        const [parentRecord] = await this.db
          .select()
          .from(generations)
          .where(eq(generations.id, record.parentGenerationId))
          .limit(1);

        if (parentRecord && parentRecord.infrastructureSpec) {
          userPrompt = this.promptBuilder.buildRefinementUserPrompt(
            record.promptText,
            parentRecord.infrastructureSpec,
          );
        }
      }

      // 4. LLM provider client factory setup
      const rawLlmConfig = this.config.get('app.llm')!;
      const factory = new LLMProviderFactory({
        primary: rawLlmConfig.primaryProvider,
        fallbackChain: rawLlmConfig.fallbackChain || [],
        openaiApiKey: rawLlmConfig.openai?.apiKey,
        openaiModel: rawLlmConfig.openai?.model,
        claudeApiKey: rawLlmConfig.claude?.apiKey,
        claudeModel: rawLlmConfig.claude?.model,
        geminiApiKey: rawLlmConfig.gemini?.apiKey,
        geminiModel: rawLlmConfig.gemini?.model,
        grokApiKey: rawLlmConfig.grok?.apiKey,
        grokModel: rawLlmConfig.grok?.model,
        ollamaBaseUrl: rawLlmConfig.ollama?.baseUrl,
        ollamaModel: rawLlmConfig.ollama?.model,
        mockMode: rawLlmConfig.mockMode,
      });

      let attempts = 0;
      let maxAttempts = 3; // 1 initial + max 2 retries
      let spec: any = null;
      let errors: string[] = [];
      let lastResult: any = null;
      let finalProviderUsed: any = 'openai';

      // Update status to validating
      await this.db
        .update(generations)
        .set({ status: 'validating' })
        .where(eq(generations.id, generationId));

      while (attempts < maxAttempts) {
        attempts++;
        const attemptStartTime = Date.now();
        this.logger.log(`LLM Invocation Attempt ${attempts}`);

        let responseText = '';
        let parsedResponse: any = null;
        let promptTokens = 0;
        let completionTokens = 0;
        let latencyMs = 0;
        let providerName: any = 'openai';

        try {
          const invokeParams = {
            systemPrompt,
            userPrompt,
            responseFormat: 'json' as const,
          };

          const preferredProvider = (record.llmProvider === 'openai' || record.llmProvider === 'claude' || record.llmProvider === 'gemini' || record.llmProvider === 'grok' || record.llmProvider === 'ollama')
            ? record.llmProvider
            : undefined;

          const { result, providerUsed } = await factory.completeWithFallback(
            invokeParams,
            preferredProvider,
          );

          responseText = result.rawText;
          parsedResponse = result.parsedJson;
          promptTokens = result.promptTokens;
          completionTokens = result.completionTokens;
          latencyMs = result.latencyMs;
          providerName = providerUsed;
          finalProviderUsed = providerUsed;

          lastResult = result;
        } catch (err: any) {
          this.logger.error(`LLM Call failed on attempt ${attempts}`, err);
          errors.push(err?.message || String(err));
          // If the provider call fails completely, break or continue retry
          continue;
        }

        // 5. Schema Validation & Auto-repair
        if (parsedResponse) {
          // Attempt auto-repair on common missing fields
          const repaired = this.schemaValidator.autoRepair(parsedResponse);
          const validation = this.schemaValidator.validate(repaired);

          // Save call logs (redacted)
          await this.db.insert(llmCallLogs).values({
            generationId,
            attemptNumber: attempts,
            provider: providerName,
            model: lastResult?.model || 'unknown',
            requestRedacted: redactObjectPii({ systemPrompt, userPrompt }),
            responseRedacted: redactObjectPii(parsedResponse),
            promptTokens,
            completionTokens,
            latencyMs,
            validationErrors: validation.errors.length ? validation.errors : null,
          });

          if (validation.valid) {
            spec = repaired;
            break; // Success!
          } else {
            this.logger.warn(`Schema validation failed on attempt ${attempts}: ${validation.errors.join(', ')}`);
            errors = validation.errors;
            // Build corrective retry prompt for next attempt
            userPrompt = this.promptBuilder.buildCorrectiveUserPrompt(validation.errors);
          }
        } else {
          errors.push('LLM returned malformed JSON');
          userPrompt = this.promptBuilder.buildCorrectiveUserPrompt(['Returned output was not valid JSON']);
        }
      }

      if (!spec) {
        // Validation failed or retry exhausted
        throw new Error(
          errors.length ? errors.join('; ') : 'LLM retry loop exhausted without generating valid spec',
        );
      }

      // 6. Ambiguity Resolution & Confidence Scoring
      spec = this.ambiguityScorer.scoreAndEnforceDefaults(spec);

      // 7. Persist & Decrement Quota
      const totalLatency = Date.now() - startTime;
      await this.db
        .update(generations)
        .set({
          status: 'completed',
          infrastructureSpec: spec,
          confidenceScore: String(spec.confidenceScore || 1.0),
          llmProvider: finalProviderUsed,
          llmModel: lastResult?.model || 'unknown',
          promptTokens: lastResult?.promptTokens || 0,
          completionTokens: lastResult?.completionTokens || 0,
          latencyMs: totalLatency,
          retryCount: attempts - 1,
          completedAt: new Date(),
        })
        .where(eq(generations.id, generationId));

      // Decrement usage quota in project-service
      await this.projectClient.decrementQuota(userId, record.cloudProviderHint || 'aws');

      // Set Cache
      if (this.redis) {
        try {
          await this.redis.set(cacheKey, JSON.stringify(spec), 'EX', 86400); // cache for 24h
        } catch {
          // ignore cache set errors
        }
      }

      this.logger.log(`Generation ${generationId} parsing completed successfully`);
    } catch (err: any) {
      this.logger.error(`Generation ${generationId} failed: ${err.message}`);
      await this.db
        .update(generations)
        .set({
          status: 'failed',
          errorCode: 'PIPELINE_ERROR',
          errorMessage: err.message || String(err),
          completedAt: new Date(),
        })
        .where(eq(generations.id, generationId));
    }
  }

  async onApplicationShutdown() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // ignore errors on quit
      }
    }
  }
}
