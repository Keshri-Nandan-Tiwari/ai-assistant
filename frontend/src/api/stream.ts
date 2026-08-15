import { API_URL } from './client';

export interface StreamHandlers {
  onConversationId?: (id: string) => void;
  onDelta: (text: string) => void;
  onDone: () => void;
  onError: (message: string) => void;
}

/**
 * Streams a chat response from our backend via SSE. The browser never
 * talks to the AI provider directly — only to our own API.
 */
export async function streamChatMessage(
  payload: { conversationId?: string; message: string; model: string; useKnowledgeBase?: boolean; attachmentIds?: string[] },
  handlers: StreamHandlers,
  signal?: AbortSignal
) {
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  if (!res.ok || !res.body) {
    handlers.onError('Failed to reach the assistant. Please try again.');
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split('\n\n');
    buffer = events.pop() ?? '';

    for (const raw of events) {
      const lines = raw.split('\n');
      const eventLine = lines.find((l) => l.startsWith('event:'));
      const dataLine = lines.find((l) => l.startsWith('data:'));
      if (!eventLine || !dataLine) continue;

      const eventType = eventLine.replace('event:', '').trim();
      const data = JSON.parse(dataLine.replace('data:', '').trim());

      if (eventType === 'conversation') handlers.onConversationId?.(data.conversationId);
      if (eventType === 'delta') handlers.onDelta(data.delta);
      if (eventType === 'done') handlers.onDone();
      if (eventType === 'error') handlers.onError(data.message);
    }
  }
}
