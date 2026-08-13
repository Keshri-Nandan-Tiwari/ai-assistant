import { useRef, useState, type KeyboardEvent } from 'react';
import { Send, Square, Paperclip, Mic } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export default function MessageComposer({ onSend, onStop, isStreaming, disabled }: Props) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function handleSend() {
    if (!text.trim() || isStreaming) return;
    onSend(text.trim());
    setText('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    } else if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="border-t border-neutral-200 dark:border-neutral-800 bg-surface p-3 md:p-4">
      <div className="max-w-3xl mx-auto flex items-end gap-2 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-surface-raised px-3 py-2 focus-within:ring-2 focus-within:ring-accent">
        <button
          type="button"
          title="Attach a file"
          className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 shrink-0"
        >
          <Paperclip size={18} />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          disabled={disabled}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = 'auto';
            e.target.style.height = `${Math.min(e.target.scrollHeight, 160)}px`;
          }}
          onKeyDown={handleKeyDown}
          placeholder="Ask anything…"
          rows={1}
          className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 max-h-40"
        />

        <button
          type="button"
          title="Voice input"
          className="p-1.5 text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 shrink-0"
        >
          <Mic size={18} />
        </button>

        {isStreaming ? (
          <button
            onClick={onStop}
            className="shrink-0 rounded-full bg-neutral-800 dark:bg-neutral-200 text-white dark:text-neutral-900 p-2 hover:opacity-90"
            title="Stop generating"
          >
            <Square size={16} />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim() || disabled}
            className="shrink-0 rounded-full bg-accent hover:bg-accent-hover text-white p-2 disabled:opacity-40 transition-colors"
            title="Send (Enter)"
          >
            <Send size={16} />
          </button>
        )}
      </div>
      <p className="text-center text-[11px] text-neutral-400 mt-2">
        AI can make mistakes. Consider checking important information.
      </p>
    </div>
  );
}
