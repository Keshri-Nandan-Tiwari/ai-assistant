import { prisma } from '../config/prisma.js';
import { AppError } from '../utils/AppError.js';

export async function listConversations(userId: string, opts: { search?: string; archived?: boolean }) {
  return prisma.conversation.findMany({
    where: {
      userId,
      archived: opts.archived ?? false,
      ...(opts.search
        ? { title: { contains: opts.search, mode: 'insensitive' as const } }
        : {}),
    },
    orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }],
    select: { id: true, title: true, model: true, pinned: true, archived: true, createdAt: true, updatedAt: true },
  });
}

export async function getConversationForUser(userId: string, conversationId: string) {
  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (!convo) throw AppError.notFound('Conversation not found');
  if (convo.userId !== userId) throw AppError.forbidden(); // prevents IDOR
  return convo;
}

export async function createConversation(userId: string, title = 'New conversation', model = 'balanced') {
  return prisma.conversation.create({ data: { userId, title, model } });
}

export async function renameConversation(userId: string, id: string, title: string) {
  await getConversationForUser(userId, id);
  return prisma.conversation.update({ where: { id }, data: { title } });
}

export async function togglePin(userId: string, id: string, pinned: boolean) {
  await getConversationForUser(userId, id);
  return prisma.conversation.update({ where: { id }, data: { pinned } });
}

export async function toggleArchive(userId: string, id: string, archived: boolean) {
  await getConversationForUser(userId, id);
  return prisma.conversation.update({ where: { id }, data: { archived } });
}

export async function deleteConversation(userId: string, id: string) {
  await getConversationForUser(userId, id);
  await prisma.conversation.delete({ where: { id } });
}

/** Cursor-based pagination — never load an entire long conversation at once. */
export async function getMessages(
  userId: string,
  conversationId: string,
  opts: { cursor?: string; limit?: number }
) {
  await getConversationForUser(userId, conversationId);
  const limit = Math.min(opts.limit ?? 30, 100);

  const messages = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: limit + 1,
    ...(opts.cursor ? { cursor: { id: opts.cursor }, skip: 1 } : {}),
  });

  const hasMore = messages.length > limit;
  const page = hasMore ? messages.slice(0, limit) : messages;

  return { messages: page.reverse(), nextCursor: hasMore ? page[0]?.id : null };
}

export async function appendMessage(
  conversationId: string,
  role: 'USER' | 'ASSISTANT' | 'SYSTEM',
  content: string,
  extra?: { model?: string; inputTokens?: number; outputTokens?: number }
) {
  return prisma.message.create({
    data: { conversationId, role, content, ...extra },
  });
}

/** Auto-titles a fresh conversation from the first user message. */
export async function maybeAutoTitle(conversationId: string, firstUserMessage: string) {
  const convo = await prisma.conversation.findUnique({ where: { id: conversationId } });
  if (convo && convo.title === 'New conversation') {
    const title = firstUserMessage.trim().slice(0, 60) || 'New conversation';
    await prisma.conversation.update({ where: { id: conversationId }, data: { title } });
  }
}
