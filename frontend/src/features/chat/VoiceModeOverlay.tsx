import { useEffect, useRef, useState } from 'react';
import { X, Mic, Settings2 } from 'lucide-react';
import VoiceOrb from './VoiceOrb';
import VoicePicker from './VoicePicker';
import { VOICE_LANGUAGES } from '../../constants/voiceLanguages';
import { useVoiceStore } from '../../stores/voiceStore';

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

interface Props {
  onSend: (text: string) => void;
  isStreaming: boolean;
  isSpeaking: boolean;
  onClose: () => void;
}

export default function VoiceModeOverlay({ onSend, isStreaming, isSpeaking, onClose }: Props) {
  const { voiceLang, voiceURI, setVoiceLang, setVoiceURI } = useVoiceStore();
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const SpeechRecognitionCtor = getSpeechRecognition();

  // Leaving voice mode should never leave the mic or a stray reply running.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // The real "hands-free conversation" behavior: the instant Keshri finishes
  // speaking, start listening again automatically — no re-tapping needed.
  // A tiny delay avoids the mic picking up the tail end of Keshri's own voice.
  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    const wasSpeaking = wasSpeakingRef.current;
    wasSpeakingRef.current = isSpeaking;
    if (wasSpeaking && !isSpeaking) {
      const t = setTimeout(() => startListening(), 500);
      return () => clearTimeout(t);
    }
  }, [isSpeaking]);

  function startListening() {
    if (!SpeechRecognitionCtor || listening || isStreaming) return;

    // Tapping the mic (or speaking) always interrupts Keshri if it's still
    // talking — a real conversation lets you cut in, not wait your turn.
    if (window.speechSynthesis?.speaking) window.speechSynthesis.cancel();

    setError(null);
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = voiceLang;
    recognition.continuous = false;
    recognition.interimResults = false;

    let finalText = '';
    recognition.onresult = (event: any) => {
      finalText = event.results[0][0].transcript;
    };
    recognition.onerror = (event: any) => {
      setListening(false);
      setError(
        event?.error === 'not-allowed' || event?.error === 'service-not-allowed'
          ? "Microphone permission is blocked — allow it in your browser's site settings."
          : event?.error === 'no-speech'
            ? "Didn't catch anything — tap the mic and try again."
            : 'Voice input failed — try again.'
      );
    };
    recognition.onend = () => {
      setListening(false);
      if (finalText.trim()) onSend(finalText.trim());
    };

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  const state = listening ? 'listening' : isSpeaking ? 'speaking' : 'idle';
  const statusText = listening
    ? 'Listening…'
    : isStreaming
      ? 'Thinking…'
      : isSpeaking
        ? 'Speaking… (tap to interrupt)'
        : 'Tap the mic to talk';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-surface/95 backdrop-blur-xl animate-fadeIn">
      <div className="w-full flex items-center justify-between px-4 py-4">
        <button
          onClick={() => setShowSettings((s) => !s)}
          className="p-2 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <Settings2 size={20} />
        </button>
        <p className="text-sm font-medium text-neutral-400">Keshri Voice</p>
        <button
          onClick={onClose}
          className="p-2 rounded-full text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200"
        >
          <X size={20} />
        </button>
      </div>

      {showSettings && (
        <div className="w-full max-w-xs px-4 -mt-2 animate-fadeIn space-y-3">
          <div className="glass-card rounded-xl p-3 flex items-center justify-between text-sm">
            <span className="text-neutral-500">Language</span>
            <select
              value={voiceLang}
              onChange={(e) => setVoiceLang(e.target.value)}
              className="bg-transparent text-right outline-none"
            >
              {VOICE_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="glass-card rounded-xl p-3 flex items-center justify-between text-sm">
            <span className="text-neutral-500">Voice</span>
            <VoicePicker selectedVoiceURI={voiceURI} onChange={setVoiceURI} langFilter={voiceLang.split('-')[0]} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-neutral-400">{statusText}</p>
        {error && <p className="text-xs text-red-500 max-w-xs text-center px-4">{error}</p>}
      </div>

      {/* Orb sits directly beside the mic button — the main control cluster. */}
      <div className="pb-12 flex items-center justify-center gap-6">
        <VoiceOrb state={state} size={90} />
        <button
          onClick={startListening}
          disabled={listening || isStreaming}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all glow-accent ${
            listening ? 'bg-red-500' : 'bg-accent hover:bg-accent-hover'
          } disabled:opacity-40`}
        >
          <Mic size={26} className="text-white" />
        </button>
      </div>
    </div>
  );
}
