import { create } from 'zustand';

export type ThemeMode = 'light' | 'dark' | 'system';

export const ACCENT_PRESETS: Record<string, { accent: string; hover: string }> = {
  red: { accent: '#ef4444', hover: '#dc2626' },
  blue: { accent: '#3b82f6', hover: '#2563eb' },
  purple: { accent: '#8b5cf6', hover: '#7c3aed' },
  green: { accent: '#22c55e', hover: '#16a34a' },
  orange: { accent: '#f97316', hover: '#ea580c' },
  pink: { accent: '#ec4899', hover: '#db2777' },
};

interface ThemeState {
  mode: ThemeMode;
  accent: string;
  setMode: (mode: ThemeMode) => void;
  setAccent: (accent: string) => void;
  applyToDocument: () => void;
}

function resolveDark(mode: ThemeMode): boolean {
  if (mode === 'system') return window.matchMedia('(prefers-color-scheme: dark)').matches;
  return mode === 'dark';
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  mode: (localStorage.getItem('theme-mode') as ThemeMode) || 'system',
  accent: localStorage.getItem('theme-accent') || 'red',

  setMode: (mode) => {
    localStorage.setItem('theme-mode', mode);
    set({ mode });
    get().applyToDocument();
  },

  setAccent: (accent) => {
    localStorage.setItem('theme-accent', accent);
    set({ accent });
    get().applyToDocument();
  },

  applyToDocument: () => {
    const { mode, accent } = get();
    document.documentElement.classList.toggle('dark', resolveDark(mode));
    const preset = ACCENT_PRESETS[accent] ?? ACCENT_PRESETS.red;
    document.documentElement.style.setProperty('--accent', preset.accent);
    document.documentElement.style.setProperty('--accent-hover', preset.hover);
  },
}));
