import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Send, Square, Paperclip, Mic, MicOff, ChevronDown, Volume2, VolumeX } from 'lucide-react';

interface Props {
  onSend: (text: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  voiceReplyEnabled: boolean;
  onToggleVoiceReply: () => void;
  voiceLang: string;
  onVoiceLangChange: (lang: string) => void;
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
}: Props) {
  const [text, setText] = useState('');
  const [listening, setListening] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
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

  function handleSend(overrideText?: string) {
    const value = (overrideText ?? text).trim();
    if (!value || isStreaming) return;
    onSend(value);
    setText('');
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

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = voiceLang;
    recognition.continuous = true;
    recognition.interimResults = true;
    baseTextRef.current = text ? text + ' ' : '';
    finalTranscriptRef.current = '';

    recognition.onresult = (event: any) => {
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
    recognition.onerror = () => setListening(false);
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
    <div className="border-t border-neutral-200 dark:border-neutral-800 bg-surface p-3 md:p-4">
      <div className="max-w-3xl mx-auto">
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

        <div className="flex items-end gap-2 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-surface-raised px-3 py-2 focus-within:ring-2 focus-within:ring-accent">
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
              className="shrink-0 rounded-full bg-accent hover:bg-accent-hover text-white p-2 disabled:opacity-40 transition-colors"
              title="Send (Enter)"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
      <p className="text-center text-[11px] text-neutral-400 mt-2">
        {listening ? 'Listening — stop talking to send automatically.' : 'AI can make mistakes. Consider checking important information.'}
      </p>
    </div>
  );
}
