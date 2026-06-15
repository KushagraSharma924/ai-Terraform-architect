import {
  LLMProvider,
  LLMCompletionParams,
  LLMCompletionResult,
} from '../interfaces/llm-provider.interface';

export class OllamaProvider implements LLMProvider {
  readonly name = 'ollama';
  private readonly baseUrl: string;
  private readonly model: string;

  constructor(baseUrl = 'http://localhost:11434', model = 'qwen2.5:3b') {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const startTime = Date.now();
    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { role: 'system', content: params.systemPrompt },
            { role: 'user', content: params.userPrompt },
          ],
          options: {
            temperature: params.temperature ?? 0,
          },
          stream: false,
          format: params.responseFormat === 'json' ? 'json' : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`Ollama responded with status: ${response.status}`);
      }

      const data = (await response.json()) as any;
      const latencyMs = Date.now() - startTime;
      const rawText = data.message?.content ?? '';
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (err) {
        // Leave parsedJson as null
      }

      return {
        rawText,
        parsedJson,
        promptTokens: data.prompt_eval_count ?? 0,
        completionTokens: data.eval_count ?? 0,
        latencyMs,
        model: this.model,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      throw new Error(`Ollama Provider error: ${error?.message || error}. Latency: ${latencyMs}ms`);
    }
  }
}
