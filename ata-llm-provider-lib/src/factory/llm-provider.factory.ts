import {
  LLMProvider,
  LLMCompletionParams,
  LLMCompletionResult,
} from '../interfaces/llm-provider.interface';
import { OpenAIProvider } from '../providers/openai.provider';
import { ClaudeProvider } from '../providers/claude.provider';
import { GeminiProvider } from '../providers/gemini.provider';
import { GrokProvider } from '../providers/grok.provider';
import { OllamaProvider } from '../providers/ollama.provider';

export interface LLMProviderConfig {
  primary: 'openai' | 'claude' | 'gemini' | 'grok' | 'ollama';
  fallbackChain: ('openai' | 'claude' | 'gemini' | 'grok' | 'ollama')[];
  openaiApiKey?: string;
  openaiModel?: string;
  claudeApiKey?: string;
  claudeModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
  grokApiKey?: string;
  grokModel?: string;
  ollamaBaseUrl?: string;
  ollamaModel?: string;
  mockMode?: boolean;
}

export class MockProvider implements LLMProvider {
  readonly name = 'openai';

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const mockSpec = {
      schemaVersion: '1.0',
      cloudProvider: 'aws',
      applicationType: 'nodejs',
      architecturePattern: 'three-tier',
      services: ['ec2', 'alb', 'rds', 'vpc', 'autoscaling'],
      compute: {
        type: 'ec2',
        instanceCount: 2,
        instanceType: 't3.medium',
        autoScaling: {
          enabled: true,
          minInstances: 2,
          maxInstances: 6,
          targetCpuUtilization: 70,
        },
      },
      loadBalancer: {
        type: 'alb',
        scheme: 'internet-facing',
        healthCheckPath: '/health',
      },
      database: {
        type: 'postgresql',
        engineVersion: null,
        multiAz: false,
        storageGb: 20,
      },
      networking: {
        vpcCidr: '10.0.0.0/16',
        privateSubnets: true,
        publicSubnets: true,
        natGateway: true,
        availabilityZones: 2,
      },
      security: {
        securityGroups: ['web', 'app', 'db'],
        encryptionAtRest: true,
      },
      storage: [],
      estimatedMonthlyTraffic: null,
      tags: {},
      ambiguities: [
        {
          field: 'compute.instanceType',
          reason: 'Not specified by user, defaulted to t3.medium',
          confidence: 'low',
        },
      ],
      confidenceScore: 0.87,
    };

    let rawText = JSON.stringify(mockSpec);

    if (params.userPrompt.includes('invalid_json_test')) {
      rawText = '{ invalid json here...';
    } else if (params.userPrompt.includes('schema_fail_test')) {
      const badSpec = { ...mockSpec, services: undefined };
      rawText = JSON.stringify(badSpec);
    }

    let parsedJson: any = null;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      // Leave null
    }

    return {
      rawText,
      parsedJson,
      promptTokens: 100,
      completionTokens: 200,
      latencyMs: 50,
      model: 'mock-model',
    };
  }
}

export class LLMProviderFactory {
  private readonly config: LLMProviderConfig;

  constructor(config: LLMProviderConfig) {
    this.config = config;
  }

  getProvider(name: 'openai' | 'claude' | 'gemini' | 'grok' | 'ollama'): LLMProvider {
    if (this.config.mockMode) {
      return new MockProvider();
    }

    switch (name) {
      case 'ollama':
        return new OllamaProvider(this.config.ollamaBaseUrl, this.config.ollamaModel);
      /* Commenting out other providers for now
      case 'openai':
        if (!this.config.openaiApiKey) {
          throw new Error('OpenAI API key is missing.');
        }
        return new OpenAIProvider(this.config.openaiApiKey, this.config.openaiModel);
      case 'claude':
        if (!this.config.claudeApiKey) {
          throw new Error('Claude API key is missing.');
        }
        return new ClaudeProvider(this.config.claudeApiKey, this.config.claudeModel);
      case 'gemini':
        return new GeminiProvider(this.config.geminiApiKey, this.config.geminiModel);
      case 'grok':
        if (!this.config.grokApiKey) {
          throw new Error('Grok API key is missing.');
        }
        return new GrokProvider(this.config.grokApiKey, this.config.grokModel);
      */
      default:
        throw new Error(`Unsupported LLM provider: ${name}`);
    }
  }

  async completeWithFallback(
    params: LLMCompletionParams,
    overrideProvider?: 'openai' | 'claude' | 'gemini' | 'grok' | 'ollama',
  ): Promise<{ result: LLMCompletionResult; providerUsed: 'openai' | 'claude' | 'gemini' | 'grok' | 'ollama' }> {
    const providersToTry = overrideProvider
      ? [overrideProvider]
      : [this.config.primary, ...this.config.fallbackChain];

    const errors: Error[] = [];

    for (const name of providersToTry) {
      try {
        const provider = this.getProvider(name);
        const result = await provider.complete(params);
        return { result, providerUsed: name };
      } catch (err: any) {
        errors.push(new Error(`Provider ${name} failed: ${err.message}`));
      }
    }

    throw new Error(
      `All LLM providers in the chain failed. Errors:\n${errors.map((e) => e.message).join('\n')}`,
    );
  }
}
