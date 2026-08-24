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
  const [continuousMode, setContinuousMode] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const SpeechRecognitionCtor = getSpeechRecognition();

  // Leaving voice mode should never leave the mic or a stray reply running.
  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      window.speechSynthesis?.cancel();
    };
  }, []);

  // The "hands-free conversation" behavior: once Keshri finishes speaking,
  // start listening again automatically — no re-tapping needed. Can be
  // turned off via the Continuous toggle for a tap-each-time flow instead.
  // A tiny delay avoids the mic picking up the tail end of Keshri's own voice.
  const wasSpeakingRef = useRef(false);
  useEffect(() => {
    const wasSpeaking = wasSpeakingRef.current;
    wasSpeakingRef.current = isSpeaking;
    if (wasSpeaking && !isSpeaking && continuousMode) {
      const t = setTimeout(() => startListening(), 500);
      return () => clearTimeout(t);
    }
  }, [isSpeaking, continuousMode]);

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
  const stateLabel = listening
    ? 'LISTENING'
    : isStreaming
      ? 'THINKING'
      : isSpeaking
        ? 'RESPONDING'
        : 'READY';

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-black animate-spreadIn overflow-hidden">
      {/* Top bar: branding, state indicator, controls */}
      <div className="w-full flex items-center justify-between px-4 py-4">
        <div className="flex items-center gap-1.5 text-accent">
          <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulseGlow" />
          <span className="text-[11px] font-semibold tracking-[0.15em]">KESHRI</span>
        </div>

        {/* State indicator, cross-fades between READY/LISTENING/THINKING/RESPONDING */}
        <p
          key={stateLabel}
          className="absolute left-1/2 -translate-x-1/2 top-4 text-[11px] font-medium tracking-[0.2em] text-neutral-400 animate-fadeIn"
        >
          {stateLabel}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings((s) => !s)}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 bg-white/5 text-neutral-400 hover:border-accent/40 hover:text-accent transition-all"
          >
            <Settings2 size={16} />
          </button>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center border border-white/10 bg-white/5 text-neutral-400 hover:border-accent/40 hover:text-accent transition-all"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {showSettings && (
        <div className="w-full max-w-xs px-4 -mt-2 animate-fadeIn space-y-3 z-10">
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

      <div className="flex-1 flex flex-col items-center justify-center gap-4 -mt-8">
        <VoiceOrb state={state} size={Math.min(300, typeof window !== 'undefined' ? window.innerWidth * 0.75 : 280)} interactive />
        {error && <p className="text-xs text-red-500 max-w-xs text-center px-4">{error}</p>}
      </div>

      {/* Bottom: mic + continuous toggle */}
      <div className="pb-12 flex flex-col items-center gap-4">
        <button
          onClick={startListening}
          disabled={listening || isStreaming}
          className={`w-16 h-16 rounded-full flex items-center justify-center transition-all glow-accent ${
            listening ? 'bg-red-500' : 'bg-accent hover:bg-accent-hover'
          } disabled:opacity-40`}
        >
          <Mic size={26} className="text-white" />
        </button>
        <button
          onClick={() => setContinuousMode((c) => !c)}
          className="flex items-center gap-1.5 text-[11px] tracking-wide text-neutral-400 hover:text-accent transition-colors"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${continuousMode ? 'bg-accent' : 'bg-neutral-600'}`} />
          Continuous: {continuousMode ? 'ON' : 'OFF'}
        </button>
      </div>
    </div>
  );
}
