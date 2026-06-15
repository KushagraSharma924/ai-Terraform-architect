export interface LLMCompletionParams {
  systemPrompt: string;
  userPrompt: string;
  responseFormat: 'json';
  maxTokens?: number;
  temperature?: number;
}

export interface LLMCompletionResult {
  rawText: string;
  parsedJson: any | null; // null if JSON parsing fails
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  model: string;
}

export interface LLMProvider {
  readonly name: 'openai' | 'claude' | 'gemini' | 'grok' | 'ollama';
  complete(params: LLMCompletionParams): Promise<LLMCompletionResult>;
}
