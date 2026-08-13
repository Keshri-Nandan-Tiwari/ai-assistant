import { useCallback, useEffect, useState } from 'react';
import { api } from '../../api/client';

export interface Conversation {
  id: string;
  title: string;
  model: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
}

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await api.get<{ data: { conversations: Conversation[] } }>(`/api/conversations${query}`);
      setConversations(res.data.conversations);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function rename(id: string, title: string) {
    await api.patch(`/api/conversations/${id}`, { title });
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }

  async function togglePin(id: string, pinned: boolean) {
    await api.patch(`/api/conversations/${id}/pin`, { pinned });
    refresh();
  }

  async function remove(id: string) {
    await api.delete(`/api/conversations/${id}`);
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }

  return { conversations, loading, refresh, rename, togglePin, remove };
}
