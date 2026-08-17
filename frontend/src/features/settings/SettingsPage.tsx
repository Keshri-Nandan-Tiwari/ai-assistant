import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Sun, Moon, Monitor, Check, Palette, ChevronDown, Volume2 } from 'lucide-react';
import { useThemeStore, ACCENT_PRESETS } from '../../stores/themeStore';
import { useVoiceStore } from '../../stores/voiceStore';
import { useAuthStore } from '../../stores/authStore';
import { api } from '../../api/client';
import { SOCIAL_LINKS } from '../../constants/socialLinks';
import { VOICE_LANGUAGES } from '../../constants/voiceLanguages';
import VoicePicker from '../chat/VoicePicker';

const LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'हिन्दी (Hindi)' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
  { code: 'ja', label: '日本語' },
];

export default function SettingsPage() {
  const { mode, accent, setMode, setAccent } = useThemeStore();
  const { voiceLang, voiceURI, setVoiceLang, setVoiceURI } = useVoiceStore();
  const { user, logout } = useAuthStore();
  const [language, setLanguage] = useState('en');
  const [saved, setSaved] = useState(false);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);

  async function persistSettings(partial: Record<string, unknown>) {
    try {
      await api.patch('/api/profile/settings', partial);
      setSaved(true);
      setTimeout(() => setSaved(false), 1200);
    } catch {
      // Non-fatal — theme still applies locally even if persistence fails
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-neutral-200 dark:border-neutral-800">
        <Link to="/chat" className="p-1.5 rounded hover:bg-surface-raised">
          <ArrowLeft size={18} />
        </Link>
        <h1 className="font-semibold">Settings</h1>
        {saved && <span className="text-xs text-green-500 ml-auto">Saved</span>}
      </header>

      <div className="max-w-2xl mx-auto p-4 md:p-8 space-y-10">
        {/* Appearance */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Appearance</h2>

          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Theme</p>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'light', label: 'Light', icon: Sun },
                  { key: 'dark', label: 'Dark', icon: Moon },
                  { key: 'system', label: 'System', icon: Monitor },
                ].map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    onClick={() => {
                      setMode(key as any);
                      persistSettings({ theme: key });
                    }}
                    className={`flex flex-col items-center gap-1.5 py-3 rounded-xl border text-sm transition-colors ${
                      mode === key ? 'border-accent bg-accent/5' : 'border-neutral-200 dark:border-neutral-800 hover:bg-surface-raised'
                    }`}
                  >
                    <Icon size={18} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <button
                type="button"
                onClick={() => setColorPickerOpen((o) => !o)}
                className="w-full flex items-center justify-between text-sm font-medium mb-2"
              >
                <span className="flex items-center gap-2">
                  <Palette size={15} className="text-accent" /> Accent color
                </span>
                <span className="flex items-center gap-1.5 text-neutral-400">
                  <span className="w-4 h-4 rounded-full" style={{ backgroundColor: ACCENT_PRESETS[accent]?.accent }} />
                  <ChevronDown size={14} className={`transition-transform ${colorPickerOpen ? 'rotate-180' : ''}`} />
                </span>
              </button>
              {colorPickerOpen && (
                <div className="flex flex-wrap gap-2.5 animate-fadeIn">
                  {Object.entries(ACCENT_PRESETS).map(([key, val]) => (
                    <button
                      key={key}
                      aria-label={key}
                      onClick={() => {
                        setAccent(key);
                        persistSettings({ accentColor: key });
                      }}
                      className="w-9 h-9 rounded-full flex items-center justify-center ring-offset-2 ring-offset-surface transition-all"
                      style={{ backgroundColor: val.accent, boxShadow: accent === key ? `0 0 0 2px ${val.accent}` : undefined }}
                    >
                      {accent === key && <Check size={16} className="text-white" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Language */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Language</h2>
          <select
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value);
              persistSettings({ language: e.target.value });
            }}
            className="w-full rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent"
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </select>
          <p className="text-xs text-neutral-400 mt-1.5">
            The assistant responds in whatever language you write in — this sets the interface language.
          </p>
        </section>

        {/* Account */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Account</h2>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
            <div className="px-4 py-3 flex justify-between text-sm">
              <span className="text-neutral-500">Email</span>
              <span>{user?.email}</span>
            </div>
            <div className="px-4 py-3 flex justify-between text-sm">
              <span className="text-neutral-500">Name</span>
              <span>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || `@${user?.username}`}</span>
            </div>
            <Link to="/settings/security" className="px-4 py-3 flex justify-between text-sm hover:bg-surface-raised">
              <span>Change password / sessions</span>
              <span>→</span>
            </Link>
          </div>
        </section>

        <button onClick={logout} className="text-sm text-red-500 hover:underline">
          Log out
        </button>

        {/* Voice */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Voice</h2>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
            <div className="px-4 py-3 flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-neutral-500">
                <Volume2 size={15} /> Speech language
              </span>
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
            <div className="px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-neutral-500">Voice (accent, male/female)</span>
              <VoicePicker selectedVoiceURI={voiceURI} onChange={setVoiceURI} langFilter={voiceLang.split('-')[0]} />
            </div>
          </div>
        </section>

        {/* Connect */}
        <section>
          <h2 className="text-sm font-semibold text-neutral-500 uppercase tracking-wide mb-3">Connect</h2>
          <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 divide-y divide-neutral-200 dark:divide-neutral-800">
            {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-3 flex items-center gap-3 text-sm hover:bg-surface-raised transition-colors"
              >
                <Icon className="w-5 h-5 rounded shrink-0" />
                <span className="font-medium">{label}</span>
              </a>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
