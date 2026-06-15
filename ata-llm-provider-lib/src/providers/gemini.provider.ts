import {
  LLMProvider,
  LLMCompletionParams,
  LLMCompletionResult,
} from '../interfaces/llm-provider.interface';

export class GeminiProvider implements LLMProvider {
  readonly name = 'gemini';

  constructor(apiKey?: string, model?: string) {
    // Stub constructor
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    throw new Error('GeminiProvider is not yet implemented.');
  }
}
