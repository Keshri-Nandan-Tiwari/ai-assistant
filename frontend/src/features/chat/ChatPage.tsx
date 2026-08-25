import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Menu, Sparkles } from 'lucide-react';
import Sidebar from '../conversations/Sidebar';
import ChatMessage, { type ChatMessageData } from './ChatMessage';
import MessageComposer from './MessageComposer';
import ModelSelector from './ModelSelector';
import VoiceModeOverlay from './VoiceModeOverlay';
import WaveformIcon from './WaveformIcon';
import { useVoiceStore } from '../../stores/voiceStore';
import { api } from '../../api/client';
import { streamChatMessage } from '../../api/stream';

const SUGGESTIONS = [
  'Explain a complex topic simply',
  'Draft a professional email',
  'Debug a piece of code',
  'Brainstorm ideas for a project',
];

function speak(text: string, lang: string, voiceURI: string | null, onEnd: () => void) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    onEnd();
    return;
  }
  window.speechSynthesis.cancel(); // don't let replies overlap/queue up
  // Strip Markdown syntax so it doesn't read symbols aloud (e.g. "asterisk asterisk").
  const clean = text
    .replace(/```[\s\S]*?```/g, ' code block omitted ')
    .replace(/[*_#>`~]/g, '')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1');
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = lang;
  if (voiceURI) {
    const voice = window.speechSynthesis.getVoices().find((v) => v.voiceURI === voiceURI);
    if (voice) utterance.voice = voice;
  }
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
}

export default function ChatPage() {
  const { id: conversationId } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessageData[]>([]);
  const [model, setModel] = useState('balanced');
  const [isStreaming, setIsStreaming] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const { voiceReplyEnabled, voiceLang, voiceURI, setVoiceReplyEnabled, setVoiceLang } = useVoiceStore();
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!conversationId) {
      setMessages([]);
      return;
    }
    api
      .get<{ data: { messages: any[] } }>(`/api/conversations/${conversationId}/messages`)
      .then((res) =>
        setMessages(res.data.messages.map((m) => ({ id: m.id, role: m.role, content: m.content })))
      );
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend(text: string, attachmentIds: string[] = []) {
    const userMsg: ChatMessageData = { id: crypto.randomUUID(), role: 'USER', content: text };
    const assistantMsg: ChatMessageData = { id: crypto.randomUUID(), role: 'ASSISTANT', content: '', streaming: true };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setIsStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;
    let fullReply = '';

    await streamChatMessage(
      { conversationId, message: text, model, attachmentIds },
      {
        onConversationId: (id) => {
          if (!conversationId) navigate(`/chat/${id}`, { replace: true });
        },
        onDelta: (delta) => {
          fullReply += delta;
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: m.content + delta } : m))
          );
        },
        onDone: () => {
          setIsStreaming(false);
          setMessages((prev) => prev.map((m) => (m.id === assistantMsg.id ? { ...m, streaming: false } : m)));
          if ((voiceReplyEnabled || voiceModeOpen) && fullReply.trim()) {
            setIsSpeaking(true);
            speak(fullReply, voiceLang, voiceURI, () => setIsSpeaking(false));
          }
        },
        onError: (msg) => {
          setIsStreaming(false);
          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsg.id ? { ...m, content: msg, streaming: false } : m))
          );
        },
      },
      controller.signal
    );
  }

  function handleStop() {
    abortRef.current?.abort();
    setIsStreaming(false);
  }

  return (
    <div className="flex h-screen bg-surface">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <header className="relative z-30 flex items-center gap-2 px-3 py-2.5 border-b border-neutral-200 dark:border-white/5 glass-card">
          <button onClick={() => setSidebarOpen(true)} className="md:hidden p-1.5 text-neutral-500">
            <Menu size={20} />
          </button>
          <ModelSelector value={model} onChange={setModel} />
          <button
            onClick={() => setVoiceModeOpen(true)}
            title="Voice mode"
            className="ml-auto rounded-full overflow-hidden"
          >
            <WaveformIcon size={26} />
          </button>
        </header>

        <main className="flex-1 overflow-y-auto px-4 md:px-0">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[60vh] text-center px-4">
                <div className="w-12 h-12 rounded-2xl bg-accent/10 text-accent flex items-center justify-center mb-4 glow-accent">
                  <Sparkles size={22} />
                </div>
                <h2 className="text-xl font-semibold mb-1">Hi, I'm Keshri. How can I help you today?</h2>
                <p className="text-neutral-500 text-sm mb-6">Ask anything — in any language.</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-md">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => handleSend(s)}
                      className="text-left text-sm px-3 py-2.5 rounded-xl glass-card hover:border-accent/40 hover:bg-accent/5 transition-all"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-900">
                {messages.map((m) => (
                  <ChatMessage key={m.id} message={m} />
                ))}
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </main>

        <MessageComposer
          onSend={handleSend}
          onStop={handleStop}
          isStreaming={isStreaming}
          voiceReplyEnabled={voiceReplyEnabled}
          onToggleVoiceReply={() => setVoiceReplyEnabled(!voiceReplyEnabled)}
          voiceLang={voiceLang}
          onVoiceLangChange={setVoiceLang}
          conversationId={conversationId}
          onOpenVoiceMode={() => setVoiceModeOpen(true)}
        />
      </div>

      {voiceModeOpen && (
        <VoiceModeOverlay
          onSend={handleSend}
          isStreaming={isStreaming}
          isSpeaking={isSpeaking}
          onClose={() => {
            window.speechSynthesis?.cancel();
            setIsSpeaking(false);
            setVoiceModeOpen(false);
          }}
        />
      )}
    </div>
  );
}
