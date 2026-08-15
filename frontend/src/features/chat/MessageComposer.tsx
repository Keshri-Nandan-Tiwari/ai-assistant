import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send, Square, Paperclip, Mic, MicOff, ChevronDown, Volume2, VolumeX, FileText, X, Loader2 } from 'lucide-react';
import { api, ApiError } from '../../api/client';

interface Props {
  onSend: (text: string, attachmentIds: string[]) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  voiceReplyEnabled: boolean;
  onToggleVoiceReply: () => void;
  voiceLang: string;
  onVoiceLangChange: (lang: string) => void;
  conversationId?: string;
}

interface PendingAttachment {
  id: string;
  fileName: string;
  indexed: boolean;
  uploading: boolean;
  error?: string;
}

// A practical set covering all major Indian languages plus common foreign
// ones. BCP-47 codes are what the browser's speech APIs expect.
export const VOICE_LANGUAGES = [
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-US', label: 'English (US)' },
  { code: 'hi-IN', label: 'Hindi' },
  { code: 'bn-IN', label: 'Bengali' },
  { code: 'ta-IN', label: 'Tamil' },
  { code: 'te-IN', label: 'Telugu' },
  { code: 'mr-IN', label: 'Marathi' },
  { code: 'gu-IN', label: 'Gujarati' },
  { code: 'kn-IN', label: 'Kannada' },
  { code: 'ml-IN', label: 'Malayalam' },
  { code: 'pa-IN', label: 'Punjabi' },
  { code: 'ur-IN', label: 'Urdu' },
  { code: 'es-ES', label: 'Spanish' },
  { code: 'fr-FR', label: 'French' },
  { code: 'de-DE', label: 'German' },
  { code: 'zh-CN', label: 'Chinese (Mandarin)' },
  { code: 'ja-JP', label: 'Japanese' },
  { code: 'ar-SA', label: 'Arabic' },
  { code: 'pt-BR', label: 'Portuguese' },
  { code: 'ru-RU', label: 'Russian' },
];

interface SpeechRecognitionLike extends EventTarget {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: any) => void) | null;
  onerror: ((event: any) => void) | null;
  onend: (() => void) | null;
}

function getSpeechRecognition(): (new () => SpeechRecognitionLike) | null {
  if (typeof window === 'undefined') return null;
  return (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;
}

export default function MessageComposer({
  onSend,
  onStop,
  isStreaming,
  disabled,
  voiceReplyEnabled,
  onToggleVoiceReply,
  voiceLang,
  onVoiceLangChange,
  conversationId,
}: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const [attachments, setAttachments] = useState<PendingAttachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const baseTextRef = useRef('');
  const finalTranscriptRef = useRef('');

  const SpeechRecognitionCtor = getSpeechRecognition();
  const voiceSupported = !!SpeechRecognitionCtor;

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  async function handleFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = ''; // allow re-selecting the same file later
    if (files.length === 0) return;

    for (const file of files) {
      const tempId = crypto.randomUUID();
      setAttachments((prev) => [...prev, { id: tempId, fileName: file.name, indexed: false, uploading: true }]);

      const formData = new FormData();
      formData.append('file', file);
      if (conversationId) formData.append('conversationId', conversationId);

      try {
        const res = await api.upload<{ data: { attachment: { id: string; indexed: boolean } } }>(
          '/api/attachments',
          formData
        );
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === tempId
              ? { id: res.data.attachment.id, fileName: file.name, indexed: res.data.attachment.indexed, uploading: false }
              : a
          )
        );
      } catch (err) {
        setAttachments((prev) =>
          prev.map((a) =>
            a.id === tempId
              ? { ...a, uploading: false, error: err instanceof ApiError ? err.message : 'Upload failed' }
              : a
          )
        );
      }
    }
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function handleSend(overrideText?: string) {
    const value = (overrideText ?? text).trim();
    if (!value || isStreaming) return;
    const readyAttachmentIds = attachments.filter((a) => !a.uploading && !a.error).map((a) => a.id);
    onSend(value, readyAttachmentIds);
    setText('');
    setAttachments([]);
    finalTranscriptRef.current = '';
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

  function toggleListening() {
    if (!SpeechRecognitionCtor) return;

    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }

    setVoiceError(null);
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = voiceLang;
    // continuous=true is unreliable on Android Chrome (stops unpredictably
    // early or hangs open) — a single-utterance capture per tap is far more
    // consistent, and the browser's own silence detection is still what
    // ends it, so it doesn't feel less natural in practice.
    recognition.continuous = false;
    recognition.interimResults = true;
    baseTextRef.current = text ? text + ' ' : '';
    finalTranscriptRef.current = '';

    recognition.onresult = (event: any) => {
      setVoiceError(null);
      let finalText = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += chunk;
        else interim += chunk;
      }
      finalTranscriptRef.current = finalText;
      setText(baseTextRef.current + finalText + interim);
    };
    recognition.onerror = (event: any) => {
      setListening(false);
      const reason =
        event?.error === 'not-allowed' || event?.error === 'service-not-allowed'
          ? 'Microphone permission is blocked — allow it in your browser\'s site settings.'
          : event?.error === 'no-speech'
            ? "Didn't catch any speech — try again."
            : event?.error === 'network'
              ? 'Network issue while listening — try again.'
              : 'Voice input failed — try again.';
      setVoiceError(reason);
    };
    recognition.onend = () => {
      setListening(false);
      // Voice-chat flow: once speech ends (silence detected by the browser),
      // send automatically — no separate tap needed, like a real voice call.
      const spoken = (baseTextRef.current + finalTranscriptRef.current).trim();
      if (spoken) handleSend(spoken);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  const currentLangLabel = VOICE_LANGUAGES.find((l) => l.code === voiceLang)?.label ?? voiceLang;

  return (
    <div className="border-t border-neutral-200 dark:border-white/5 bg-surface p-3 md:p-4">
      <div className="max-w-3xl mx-auto">
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {attachments.map((a) => (
              <div
                key={a.id}
                className={`flex items-center gap-1.5 rounded-lg border px-2 py-1 text-xs ${
                  a.error
                    ? 'border-red-300 text-red-500 bg-red-50 dark:bg-red-950/30'
                    : 'border-neutral-300 dark:border-neutral-700 bg-surface-raised'
                }`}
              >
                {a.uploading ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />}
                <span className="max-w-[140px] truncate">{a.fileName}</span>
                {!a.uploading && !a.error && !a.indexed && (
                  <span className="text-neutral-400" title="Keshri can't read this file type yet, but it's attached">
                    (not readable)
                  </span>
                )}
                {a.error && <span title={a.error}>failed</span>}
                <button type="button" onClick={() => removeAttachment(a.id)} className="hover:text-red-500">
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}

        {voiceSupported && (
          <div className="relative mb-1.5 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onToggleVoiceReply}
              title={voiceReplyEnabled ? 'Keshri will speak replies aloud — tap to mute' : 'Tap so Keshri speaks replies aloud'}
              className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full ${
                voiceReplyEnabled
                  ? 'text-accent bg-accent/10'
                  : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
              }`}
            >
              {voiceReplyEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
              {voiceReplyEnabled ? 'Voice replies on' : 'Voice replies off'}
            </button>

            <button
              type="button"
              onClick={() => setShowLangPicker((s) => !s)}
              className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 px-2 py-1"
            >
              🎤 {currentLangLabel}
              <ChevronDown size={12} />
            </button>
            {showLangPicker && (
              <div className="absolute bottom-full right-0 mb-1 max-h-64 w-52 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-surface-raised shadow-lg z-10">
                {VOICE_LANGUAGES.map((l) => (
                  <button
                    key={l.code}
                    type="button"
                    onClick={() => {
                      onVoiceLangChange(l.code);
                      setShowLangPicker(false);
                    }}
                    className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                      l.code === voiceLang ? 'text-accent font-medium' : ''
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex items-end gap-2 rounded-2xl glass-card px-3 py-2 focus-within:ring-2 focus-within:ring-accent/60 focus-within:glow-accent transition-shadow">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.txt,.csv,.docx,.png,.jpg,.jpeg,.webp"
            onChange={handleFileChosen}
            className="hidden"
          />
          <button
            type="button"
            title="Attach a file (PDF, Word, text, CSV, or image)"
            onClick={() => fileInputRef.current?.click()}
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
            placeholder={listening ? 'Listening… speak now' : 'Ask anything…'}
            rows={1}
            className="flex-1 resize-none bg-transparent outline-none text-sm py-1.5 max-h-40"
          />

          <button
            type="button"
            onClick={toggleListening}
            disabled={!voiceSupported}
            title={
              voiceSupported
                ? listening
                  ? 'Stop and send'
                  : `Talk to Keshri (${currentLangLabel})`
                : 'Voice input not supported in this browser'
            }
            className={`p-1.5 shrink-0 rounded-full transition-colors ${
              listening
                ? 'text-white bg-red-500 animate-pulse'
                : 'text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200'
            } ${!voiceSupported ? 'opacity-30 cursor-not-allowed' : ''}`}
          >
            {listening ? <MicOff size={18} /> : <Mic size={18} />}
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
              onClick={() => handleSend()}
              disabled={!text.trim() || disabled}
              className="shrink-0 rounded-full bg-accent hover:bg-accent-hover text-white p-2 disabled:opacity-40 transition-all glow-accent"
              title="Send (Enter)"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-[11px] text-neutral-400 mt-2">
        {voiceError ? (
          <span className="text-red-500">{voiceError}</span>
        ) : listening ? (
          'Listening — stop talking to send automatically.'
        ) : (
          'AI can make mistakes. Consider checking important information.'
        )}
      </p>
    </div>
  );
}
