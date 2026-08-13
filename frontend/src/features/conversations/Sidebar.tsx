import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, Pin, Trash2, MoreHorizontal, Settings, X } from 'lucide-react';
import { useConversations } from './useConversations';

export default function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { conversations, rename, togglePin, remove } = useConversations();
  const [search, setSearch] = useState('');
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const navigate = useNavigate();
  const { id: activeId } = useParams();

  const filtered = conversations.filter((c) => c.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <>
      {open && <div className="fixed inset-0 bg-black/40 z-30 md:hidden" onClick={onClose} />}
      <aside
        className={`fixed md:static z-40 top-0 left-0 h-full w-72 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-surface flex flex-col transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-3 flex items-center justify-between">
          <button
            onClick={() => navigate('/chat')}
            className="flex-1 flex items-center gap-2 rounded-lg border border-neutral-200 dark:border-neutral-800 px-3 py-2 text-sm hover:bg-surface-raised transition-colors"
          >
            <Plus size={16} /> New chat
          </button>
          <button onClick={onClose} className="md:hidden ml-2 p-2 text-neutral-400">
            <X size={18} />
          </button>
        </div>

        <div className="px-3">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              placeholder="Search conversations"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2 py-1.5 text-sm rounded-lg bg-surface-raised outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-2 py-3 space-y-0.5">
          {filtered.map((c) => (
            <div key={c.id} className="group relative">
              <Link
                to={`/chat/${c.id}`}
                onClick={onClose}
                className={`flex items-center gap-1.5 px-2.5 py-2 rounded-lg text-sm truncate transition-colors ${
                  activeId === c.id ? 'bg-surface-raised' : 'hover:bg-surface-raised'
                }`}
              >
                {c.pinned && <Pin size={11} className="shrink-0 text-accent" />}
                <span className="truncate flex-1">{c.title}</span>
              </Link>
              <button
                onClick={() => setMenuOpenId(menuOpenId === c.id ? null : c.id)}
                className="absolute right-1.5 top-1.5 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-neutral-200 dark:hover:bg-neutral-700"
              >
                <MoreHorizontal size={14} />
              </button>
              {menuOpenId === c.id && (
                <div className="absolute right-1.5 top-8 z-10 w-36 bg-surface-raised border border-neutral-200 dark:border-neutral-700 rounded-lg shadow-lg py-1 text-sm animate-fadeIn">
                  <button
                    onClick={() => {
                      togglePin(c.id, !c.pinned);
                      setMenuOpenId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-center gap-2"
                  >
                    <Pin size={13} /> {c.pinned ? 'Unpin' : 'Pin'}
                  </button>
                  <button
                    onClick={() => {
                      const title = prompt('Rename conversation', c.title);
                      if (title) rename(c.id, title);
                      setMenuOpenId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                  >
                    Rename
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Delete this conversation? This cannot be undone.')) remove(c.id);
                      setMenuOpenId(null);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 flex items-center gap-2"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {filtered.length === 0 && (
            <p className="text-center text-xs text-neutral-400 mt-8 px-4">No conversations yet. Start your first one!</p>
          )}
        </nav>

        <div className="p-2 border-t border-neutral-200 dark:border-neutral-800">
          <Link to="/settings" className="flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm hover:bg-surface-raised">
            <Settings size={16} /> Settings
          </Link>
        </div>
      </aside>
    </>
  );
}
