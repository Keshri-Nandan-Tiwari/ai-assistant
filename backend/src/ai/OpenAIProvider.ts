import type { AIProvider, ChatMessage, StreamChunk, ModelInfo } from './AIProvider.js';
import { AppError } from '../utils/AppError.js';

const MODELS: ModelInfo[] = [
  { id: 'fast', label: 'Fast', description: 'Quick, lightweight answers', speed: 'fast', supportsVision: false, contextWindow: 128000 },
  { id: 'balanced', label: 'Balanced', description: 'Great for everyday tasks', speed: 'balanced', supportsVision: true, contextWindow: 128000 },
  { id: 'advanced', label: 'Advanced', description: 'Deeper reasoning and longer context', speed: 'advanced', supportsVision: true, contextWindow: 128000 },
];

// Maps our internal model ids to real OpenAI model names.
// Update these to match whatever models your OpenAI account has access to.
const MODEL_MAP: Record<string, string> = {
  fast: 'gpt-4o-mini',
  balanced: 'gpt-4o',
  advanced: 'gpt-4o',
};

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';
  constructor(private apiKey: string) {}

  listModels(): ModelInfo[] {
    return MODELS;
  }

  async *streamChat(
    messages: ChatMessage[],
    opts: { model: string; signal?: AbortSignal }
  ): AsyncGenerator<StreamChunk> {
    const model = MODEL_MAP[opts.model] ?? MODEL_MAP.balanced;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({ model, messages, stream: true }),
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
        if (data === '[DONE]') {
          yield { delta: '', done: true };
          return;
        }
        try {
          const parsed = JSON.parse(data);
          const delta = parsed.choices?.[0]?.delta?.content ?? '';
          if (delta) yield { delta, done: false };
        } catch {
          // Ignore malformed SSE keep-alive lines
        }
      }
    }
    yield { delta: '', done: true };
  }
}
