import { InfrastructureSpecification, CloudProvider } from './infrastructure-spec.types';

export type GenerationStatus =
  | 'pending'
  | 'parsing'
  | 'validating'
  | 'completed'
  | 'failed';

export type LLMProviderName = 'openai' | 'claude' | 'gemini' | 'grok';

export interface Generation {
  id: string;
  projectId: string;
  userId: string;
  parentGenerationId: string | null;
  versionNumber: number;
  promptText: string;
  promptHash: string;
  status: GenerationStatus;
  cloudProviderHint?: CloudProvider;
  infrastructureSpec: InfrastructureSpecification | null;
  confidenceScore: number | null;
  llmProvider?: LLMProviderName;
  llmModel?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs?: number;
  retryCount: number;
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: any;
  createdAt: Date;
  completedAt?: Date | null;
}
