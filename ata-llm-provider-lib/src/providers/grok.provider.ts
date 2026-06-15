import OpenAI from 'openai';
import {
  LLMProvider,
  LLMCompletionParams,
  LLMCompletionResult,
} from '../interfaces/llm-provider.interface';

export class GrokProvider implements LLMProvider {
  readonly name = 'grok';
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(apiKey: string, model = 'grok-2-1212') {
    this.client = new OpenAI({
      apiKey,
      baseURL: 'https://api.x.ai/v1',
    });
    this.model = model;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const startTime = Date.now();
    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: params.systemPrompt },
          { role: 'user', content: params.userPrompt },
        ],
        // Note: x.ai api supports json_object or standard text.
        response_format: params.responseFormat === 'json' ? { type: 'json_object' } : undefined,
        max_tokens: params.maxTokens,
        temperature: params.temperature ?? 0,
      });

      const latencyMs = Date.now() - startTime;
      const rawText = response.choices[0]?.message?.content ?? '';
      let parsedJson: any = null;
      try {
        parsedJson = JSON.parse(rawText);
      } catch (err) {
        // Leave parsedJson as null
      }

      return {
        rawText,
        parsedJson,
        promptTokens: response.usage?.prompt_tokens ?? 0,
        completionTokens: response.usage?.completion_tokens ?? 0,
        latencyMs,
        model: this.model,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      throw new Error(`Grok Provider error: ${error?.message || error}. Latency: ${latencyMs}ms`);
    }
  }
}
