import { useEffect, useState } from 'react';
import { ChevronDown, User } from 'lucide-react';

interface Props {
  selectedVoiceURI: string | null;
  onChange: (voiceURI: string) => void;
  langFilter?: string; // BCP-47 prefix, e.g. "hi" to show only Hindi-ish voices
}

// Voice names vary a lot by device/OS, but usually hint at gender —
// this heuristic groups them so the picker feels organized rather than
// dumping a flat, unlabeled list on the user.
function guessGender(name: string): 'Male' | 'Female' | 'Other' {
  const n = name.toLowerCase();
  if (/\b(male|man|david|mark|guy|daniel|alex(?!a)|thomas|george|james)\b/.test(n)) return 'Male';
  if (/\b(female|woman|girl|zira|samantha|susan|karen|victoria|linda|moira|tessa|fiona)\b/.test(n)) return 'Female';
  return 'Other';
}

export default function VoicePicker({ selectedVoiceURI, onChange, langFilter }: Props) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    function loadVoices() {
      setVoices(window.speechSynthesis.getVoices());
    }
    loadVoices();
    // Voices often load asynchronously on first page visit.
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
    return () => window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
  }, []);

  if (voices.length === 0) return null;

  const filtered = langFilter ? voices.filter((v) => v.lang.toLowerCase().startsWith(langFilter.toLowerCase())) : voices;
  const list = filtered.length > 0 ? filtered : voices; // fall back to all voices if none match the language
  const grouped: Record<string, SpeechSynthesisVoice[]> = { Female: [], Male: [], Other: [] };
  for (const v of list) grouped[guessGender(v.name)].push(v);

  const current = voices.find((v) => v.voiceURI === selectedVoiceURI);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 px-2 py-1 max-w-[160px]"
      >
        <User size={12} className="shrink-0" />
        <span className="truncate">{current ? current.name.replace(/^Google |^Microsoft /, '') : 'Default voice'}</span>
        <ChevronDown size={12} className="shrink-0" />
      </button>
      {open && (
        <div className="absolute bottom-full right-0 mb-1 max-h-72 w-64 overflow-y-auto rounded-lg border border-neutral-200 dark:border-neutral-700 bg-surface-raised shadow-lg z-10">
          {(['Female', 'Male', 'Other'] as const).map(
            (group) =>
              grouped[group].length > 0 && (
                <div key={group}>
                  <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                    {group}
                  </p>
                  {grouped[group].map((v) => (
                    <button
                      key={v.voiceURI}
                      type="button"
                      onClick={() => {
                        onChange(v.voiceURI);
                        setOpen(false);
                      }}
                      className={`block w-full text-left px-3 py-1.5 text-xs hover:bg-neutral-100 dark:hover:bg-neutral-800 ${
                        v.voiceURI === selectedVoiceURI ? 'text-accent font-medium' : ''
                      }`}
                    >
                      {v.name.replace(/^Google |^Microsoft /, '')}
                      <span className="text-neutral-400 ml-1">({v.lang})</span>
                    </button>
                  ))}
                </div>
              )
          )}
        </div>
      )}
    </div>
  );
}
