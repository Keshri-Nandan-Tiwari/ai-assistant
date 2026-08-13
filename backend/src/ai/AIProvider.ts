export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface StreamChunk {
  delta: string;
  done: boolean;
  usage?: { inputTokens: number; outputTokens: number };
}

export interface ModelInfo {
  id: string;
  label: string;
  description: string;
  speed: 'fast' | 'balanced' | 'advanced' | 'reasoning';
  supportsVision: boolean;
  contextWindow: number;
}

/**
 * Every AI provider (OpenAI, Anthropic, local models, etc.) implements
 * this interface. The rest of the app never talks to a provider SDK
 * directly — it only knows about AIProvider. Swapping providers is a
 * one-line config change (AI_PROVIDER env var), not a code change.
 */
export interface AIProvider {
  readonly name: string;
  listModels(): ModelInfo[];
  streamChat(
    messages: ChatMessage[],
    opts: { model: string; signal?: AbortSignal }
  ): AsyncGenerator<StreamChunk>;
}
