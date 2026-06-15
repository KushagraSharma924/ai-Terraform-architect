import Anthropic from '@anthropic-ai/sdk';
import {
  LLMProvider,
  LLMCompletionParams,
  LLMCompletionResult,
} from '../interfaces/llm-provider.interface';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude';
  private readonly client: Anthropic;
  private readonly model: string;

  constructor(apiKey: string, model = 'claude-3-5-sonnet-20240620') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async complete(params: LLMCompletionParams): Promise<LLMCompletionResult> {
    const startTime = Date.now();
    try {
      const response = await this.client.messages.create({
        model: this.model,
        system: params.systemPrompt,
        messages: [{ role: 'user', content: params.userPrompt }],
        max_tokens: params.maxTokens ?? 4000,
        temperature: params.temperature ?? 0,
      });

      const latencyMs = Date.now() - startTime;
      const rawText = response.content[0]?.type === 'text' ? response.content[0].text : '';
      let parsedJson: any = null;
      try {
        // Find JSON block if Claude wrapped it in markdown code block
        let jsonStr = rawText.trim();
        if (jsonStr.startsWith('```json')) {
          jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        } else if (jsonStr.startsWith('```')) {
          jsonStr = jsonStr.substring(3, jsonStr.length - 3).trim();
        }
        parsedJson = JSON.parse(jsonStr);
      } catch (err) {
        // Leave parsedJson as null
      }

      return {
        rawText,
        parsedJson,
        promptTokens: response.usage?.input_tokens ?? 0,
        completionTokens: response.usage?.output_tokens ?? 0,
        latencyMs,
        model: this.model,
      };
    } catch (error: any) {
      const latencyMs = Date.now() - startTime;
      throw new Error(`Claude Provider error: ${error?.message || error}. Latency: ${latencyMs}ms`);
    }
  }
}
