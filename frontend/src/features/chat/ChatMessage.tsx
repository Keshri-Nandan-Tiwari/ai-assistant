import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, User, Sparkles } from 'lucide-react';

export interface ChatMessageData {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  streaming?: boolean;
}

function CodeBlock({ className, children }: { className?: string; children: React.ReactNode }) {
  const [copied, setCopied] = useState(false);
  const language = /language-(\w+)/.exec(className || '')?.[1] ?? 'text';
  const code = String(children).replace(/\n$/, '');

  return (
    <div className="my-2 rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800">
      <div className="flex items-center justify-between px-3 py-1.5 bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-500">
        <span>{language}</span>
        <button
          onClick={() => {
            navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="flex items-center gap-1 hover:text-neutral-800 dark:hover:text-neutral-200"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="p-3 overflow-x-auto text-sm bg-neutral-950 text-neutral-100">
        <code>{code}</code>
      </pre>
    </div>
  );
}

export default function ChatMessage({ message }: { message: ChatMessageData }) {
  const isUser = message.role === 'USER';

  return (
    <div className={`flex gap-3 py-4 ${isUser ? 'justify-end' : 'justify-start'} animate-slideUp`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
          <Sparkles size={14} />
        </div>
      )}
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser ? 'bg-accent text-white' : 'bg-surface-raised'
        } ${message.streaming ? 'stream-caret' : ''}`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-pre:p-0 prose-pre:bg-transparent">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                code({ className, children, ...props }: any) {
                  const isBlock = /language-/.test(className || '');
                  return isBlock ? (
                    <CodeBlock className={className}>{children}</CodeBlock>
                  ) : (
                    <code className="bg-neutral-200 dark:bg-neutral-800 rounded px-1 py-0.5 text-[0.85em]" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
      {isUser && (
        <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center shrink-0">
          <User size={14} />
        </div>
      )}
    </div>
  );
}
