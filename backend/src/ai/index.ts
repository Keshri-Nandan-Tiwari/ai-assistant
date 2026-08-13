import { env } from '../config/env.js';
import { OpenAIProvider } from './OpenAIProvider.js';
import { AnthropicProvider } from './AnthropicProvider.js';
import type { AIProvider, ModelInfo } from './AIProvider.js';

/**
 * Provider selection: any provider whose API key is set gets registered,
 * regardless of AI_PROVIDER (that var now only picks the *default* when
 * a request doesn't specify one). This lets both OpenAI and Anthropic be
 * configured at once — the frontend model picker lets the user choose
 * per-conversation, sending a "provider:modelId" string (e.g. "anthropic:balanced").
 * A bare model id (e.g. "balanced") falls back to the default provider.
 *
 * No AI API key is ever sent to or read by the frontend — the frontend
 * only ever talks to our own backend, which then talks to the provider.
 */
const registry = new Map<string, AIProvider>();

if (env.OPENAI_API_KEY) registry.set('openai', new OpenAIProvider(env.OPENAI_API_KEY));
if (env.ANTHROPIC_API_KEY) registry.set('anthropic', new AnthropicProvider(env.ANTHROPIC_API_KEY));

function defaultProviderName(): string | null {
  if (env.AI_PROVIDER === 'openai' || env.AI_PROVIDER === 'anthropic') {
    return registry.has(env.AI_PROVIDER) ? env.AI_PROVIDER : null;
  }
  // 'both' or 'none' (but a key was set anyway) -> just use whichever is registered first
  const [first] = registry.keys();
  return first ?? null;
}

export function getProvider(name?: string | null): AIProvider | null {
  if (name) return registry.get(name) ?? null;
  const fallback = defaultProviderName();
  return fallback ? registry.get(fallback)! : null;
}

export function listAllModels(): { provider: string; models: ModelInfo[] }[] {
  return Array.from(registry.entries()).map(([provider, p]) => ({ provider, models: p.listModels() }));
}

export const hasAnyProvider = registry.size > 0;
export const defaultProvider = defaultProviderName();

export type { AIProvider, ChatMessage, StreamChunk, ModelInfo } from './AIProvider.js';
