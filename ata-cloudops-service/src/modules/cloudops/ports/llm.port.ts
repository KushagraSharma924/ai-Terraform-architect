import { Injectable } from '@nestjs/common';

export const LLM_PORT = 'LLM_PORT';

export interface LlmPort {
  /**
   * Synthesize a grounded natural-language answer from a question and the
   * structured context the engines produced. Implementations MUST only use the
   * provided context (no fabricated resource ids).
   */
  synthesize(question: string, context: Record<string, unknown>): Promise<string>;
}

/**
 * Deterministic, template-based synthesizer used by default. Produces readable,
 * grounded answers without an LLM API key. Swap for an Anthropic-backed adapter
 * (via ata-llm-provider-lib) by binding LLM_PORT in the module.
 */
@Injectable()
export class MockLlmAdapter implements LlmPort {
  async synthesize(question: string, context: Record<string, unknown>): Promise<string> {
    const summary = (context.answer as string) ?? 'Here is what I found based on your cloud data.';
    return summary;
  }
}
