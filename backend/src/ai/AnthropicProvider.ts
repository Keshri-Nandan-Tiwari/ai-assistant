import type { AIProvider, ChatMessage, StreamChunk, ModelInfo } from './AIProvider.js';
import { AppError } from '../utils/AppError.js';

const MODELS: ModelInfo[] = [
  { id: 'fast', label: 'Fast', description: 'Quick, lightweight answers', speed: 'fast', supportsVision: true, contextWindow: 200000 },
  { id: 'balanced', label: 'Balanced', description: 'Great for everyday tasks', speed: 'balanced', supportsVision: true, contextWindow: 200000 },
  { id: 'reasoning', label: 'Reasoning', description: 'Best for complex, multi-step problems', speed: 'reasoning', supportsVision: true, contextWindow: 200000 },
];

// Update to match the actual model names available on your Anthropic account.
const MODEL_MAP: Record<string, string> = {
  fast: 'claude-haiku-4-5-20251001',
  balanced: 'claude-sonnet-4-6',
  reasoning: 'claude-opus-4-6',
};

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic';
  constructor(private apiKey: string) {}

  listModels(): ModelInfo[] {
    return MODELS;
  }

  async *streamChat(
    messages: ChatMessage[],
    opts: { model: string; signal?: AbortSignal }
  ): AsyncGenerator<StreamChunk> {
    const model = MODEL_MAP[opts.model] ?? MODEL_MAP.balanced;
    const system = messages.find((m) => m.role === 'system')?.content;
    const conversation = messages.filter((m) => m.role !== 'system');

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 4096,
        system,
        messages: conversation,
        stream: true,
      }),
      signal: opts.signal,
    });

    if (!response.ok || !response.body) {
      const text = await response.text().catch(() => '');
      throw AppError.internal(`AI provider error: ${response.status} ${text.slice(0, 200)}`, 'AI_PROVIDER_ERROR');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        try {
          const parsed = JSON.parse(data);
          if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
            yield { delta: parsed.delta.text, done: false };
          }
          if (parsed.type === 'message_stop') {
            yield { delta: '', done: true };
            return;
          }
        } catch {
          // Ignore malformed SSE keep-alive lines
        }
      }
    }
    yield { delta: '', done: true };
  }
}
