import { prisma } from '../config/prisma.js';

/**
 * Minimal, dependency-free RAG retrieval.
 *
 * This uses PostgreSQL full-text search over stored knowledge chunks —
 * no external embedding API required, so it works out of the box.
 *
 * To upgrade to vector/semantic search:
 *   1. `CREATE EXTENSION vector;` in Postgres (pgvector)
 *   2. Add an `embedding vector(1536)` column to knowledge_chunks via a raw SQL migration
 *   3. Generate embeddings when chunks are created (e.g. OpenAI text-embedding-3-small)
 *   4. Replace the query below with an ORDER BY embedding <-> $queryEmbedding
 */
export async function retrieveRelevantChunks(userId: string, query: string, limit = 5) {
  if (!query.trim()) return [];

  const chunks = await prisma.knowledgeChunk.findMany({
    where: {
      source: { userId, status: 'indexed' },
      content: { contains: query, mode: 'insensitive' },
    },
    take: limit,
    include: { source: { select: { title: true } } },
  });

  // Fallback: naive keyword overlap scoring across all indexed chunks
  if (chunks.length === 0) {
    const words = query.toLowerCase().split(/\s+/).filter((w) => w.length > 3);
    if (words.length === 0) return [];

    const all = await prisma.knowledgeChunk.findMany({
      where: { source: { userId, status: 'indexed' } },
      include: { source: { select: { title: true } } },
      take: 200,
    });

    return all
      .map((c: (typeof all)[number]) => ({
        chunk: c,
        score: words.filter((w) => c.content.toLowerCase().includes(w)).length,
      }))
      .filter((x: { score: number }) => x.score > 0)
      .sort((a: { score: number }, b: { score: number }) => b.score - a.score)
      .slice(0, limit)
      .map((x: { chunk: (typeof all)[number] }) => x.chunk);
  }

  return chunks;
}

export function buildRagContext(chunks: { content: string; source: { title: string } }[]): string | null {
  if (chunks.length === 0) return null;
  return (
    'Relevant context retrieved from the user\'s knowledge base:\n\n' +
    chunks.map((c, i) => `[${i + 1}] (from "${c.source.title}")\n${c.content}`).join('\n\n') +
    '\n\nUse this context to answer if relevant. Cite sources by their [number] when you use them.'
  );
}
