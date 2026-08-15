import type { Response } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/errorHandler.js';
import type { AuthedRequest } from '../middleware/auth.js';
import { AppError } from '../utils/AppError.js';
import { getProvider, listAllModels, hasAnyProvider } from '../ai/index.js';
import * as conversationService from '../services/conversationService.js';
import { retrieveRelevantChunks, buildRagContext } from '../services/ragService.js';
import { prisma } from '../config/prisma.js';
import { logger } from '../config/logger.js';

const chatSchema = z.object({
  conversationId: z.string().uuid().optional(),
  message: z.string().min(1).max(16000),
  // Either a bare model id ("balanced") which uses the default provider,
  // or "provider:modelId" (e.g. "anthropic:reasoning") to pick explicitly.
  model: z.string().default('balanced'),
  useKnowledgeBase: z.boolean().optional().default(false),
  // Files uploaded via /api/attachments that the user wants read for this
  // specific message — their extracted text is injected directly, which is
  // far more reliable than fuzzy retrieval for "read this file I just gave you".
  attachmentIds: z.array(z.string().uuid()).max(5).optional().default([]),
});

function resolveProvider(modelField: string) {
  const [maybeProvider, ...rest] = modelField.split(':');
  if (rest.length > 0) {
    return { provider: getProvider(maybeProvider), modelId: rest.join(':') };
  }
  return { provider: getProvider(), modelId: modelField };
}

const SYSTEM_PROMPT =
  'You are Keshri, a helpful, precise AI assistant. If asked your name, say you are Keshri. Respond in the same language the user writes or speaks in — English, Hindi, or any other language, including regional Indian languages. Format responses in Markdown when helpful (code blocks, lists, tables), but keep sentences natural to read aloud since responses may be spoken back to the user. Be concise unless asked for depth.';

/**
 * POST /api/chat  — streams the AI response back as Server-Sent Events.
 * Frontend -> our backend -> AI provider -> our backend -> Frontend.
 * The AI API key never leaves the server.
 */
export const streamChat = asyncHandler(async (req: AuthedRequest, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const input = chatSchema.parse(req.body);
  const { provider: aiProvider, modelId } = resolveProvider(input.model);

  if (!aiProvider) {
    throw AppError.badRequest(
      'No AI provider is configured (or an unknown provider was requested). Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY in your .env file.',
      'AI_NOT_CONFIGURED'
    );
  }

  // Resolve or create the conversation, verifying ownership
  const conversation = input.conversationId
    ? await conversationService.getConversationForUser(req.user.id, input.conversationId)
    : await conversationService.createConversation(req.user.id, 'New conversation', input.model);

  const { messages: history } = await conversationService.getMessages(req.user.id, conversation.id, {
    limit: 20,
  });

  await conversationService.appendMessage(conversation.id, 'USER', input.message);
  await conversationService.maybeAutoTitle(conversation.id, input.message);

  let systemPrompt = SYSTEM_PROMPT;

  if (input.attachmentIds.length > 0) {
    const attachments = await prisma.attachment.findMany({
      where: { id: { in: input.attachmentIds }, userId: req.user.id }, // ownership check
      include: { knowledgeSource: { include: { chunks: { orderBy: { chunkIndex: 'asc' } } } } },
    });
    const MAX_CHARS_PER_FILE = 12000;
    const fileBlocks = attachments.map((a: (typeof attachments)[number]) => {
      const text = a.knowledgeSource?.chunks.map((c: { content: string }) => c.content).join('') ?? null;
      if (!text) return `File "${a.fileName}": (could not read this file's content — it may be an image or unsupported format)`;
      const truncated = text.length > MAX_CHARS_PER_FILE;
      return `File "${a.fileName}":\n${text.slice(0, MAX_CHARS_PER_FILE)}${truncated ? '\n[...truncated, file is longer]' : ''}`;
    });
    if (fileBlocks.length > 0) {
      systemPrompt += `\n\nThe user has attached the following file(s) to this message — read and use their content to answer:\n\n${fileBlocks.join('\n\n---\n\n')}`;
    }
  }

  if (input.useKnowledgeBase) {
    const chunks = await retrieveRelevantChunks(req.user.id, input.message);
    const ctx = buildRagContext(chunks as any);
    if (ctx) systemPrompt += `\n\n${ctx}`;
  }

  const chatMessages = [
    { role: 'system' as const, content: systemPrompt },
    ...history.map((m: { role: string; content: string }) => ({
      role: m.role.toLowerCase() as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user' as const, content: input.message },
  ];

  // --- SSE setup ---
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no',
  });
  res.write(`event: conversation\ndata: ${JSON.stringify({ conversationId: conversation.id })}\n\n`);

  const controller = new AbortController();
  req.on('close', () => controller.abort());

  let fullText = '';
  try {
    for await (const chunk of aiProvider.streamChat(chatMessages, {
      model: modelId,
      signal: controller.signal,
    })) {
      if (chunk.delta) {
        fullText += chunk.delta;
        res.write(`event: delta\ndata: ${JSON.stringify({ delta: chunk.delta })}\n\n`);
      }
      if (chunk.done) break;
    }

    await conversationService.appendMessage(conversation.id, 'ASSISTANT', fullText, {
      model: input.model,
    });

    await prisma.usageRecord.create({
      data: { userId: req.user.id, model: input.model, requestCount: 1 },
    });

    res.write(`event: done\ndata: ${JSON.stringify({ done: true })}\n\n`);
  } catch (err) {
    logger.error({ err }, 'AI streaming error');
    // Persist whatever partial text we got so it's not silently lost
    if (fullText) {
      await conversationService.appendMessage(conversation.id, 'ASSISTANT', fullText, {
        model: input.model,
      });
    }
    res.write(
      `event: error\ndata: ${JSON.stringify({ message: 'The AI provider returned an error. Please try again.' })}\n\n`
    );
  } finally {
    res.end();
  }
});

export const listModels = asyncHandler(async (_req: AuthedRequest, res: Response) => {
  if (!hasAnyProvider) {
    return res.json({ success: true, data: { providers: [] } });
  }
  // Each model id returned is already prefixed, e.g. "openai:balanced",
  // so the frontend can send it straight back on /api/chat.
  const providers = listAllModels().map(({ provider, models }) => ({
    provider,
    models: models.map((m) => ({ ...m, id: `${provider}:${m.id}` })),
  }));
  res.json({ success: true, data: { providers } });
});
