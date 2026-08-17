import { create } from 'zustand';

interface VoiceState {
  voiceReplyEnabled: boolean;
  voiceLang: string;
  voiceURI: string | null;
  setVoiceReplyEnabled: (v: boolean) => void;
  setVoiceLang: (lang: string) => void;
  setVoiceURI: (uri: string | null) => void;
}

export const useVoiceStore = create<VoiceState>((set) => ({
  voiceReplyEnabled: localStorage.getItem('voice-reply-enabled') === 'true',
  voiceLang: localStorage.getItem('voice-lang') || 'en-IN',
  voiceURI: localStorage.getItem('voice-uri') || null,

  setVoiceReplyEnabled: (v) => {
    localStorage.setItem('voice-reply-enabled', String(v));
    set({ voiceReplyEnabled: v });
  },
  setVoiceLang: (lang) => {
    localStorage.setItem('voice-lang', lang);
    set({ voiceLang: lang });
  },
  setVoiceURI: (uri) => {
    if (uri) localStorage.setItem('voice-uri', uri);
    else localStorage.removeItem('voice-uri');
    set({ voiceURI: uri });
  },
}));
