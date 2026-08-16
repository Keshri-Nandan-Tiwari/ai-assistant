import { Link } from 'react-router-dom';
import { Sparkles, Zap, ShieldCheck, Globe2, MessageSquare } from 'lucide-react';
import Typewriter from '../components/Typewriter';
import ContactSection from '../components/ContactSection';

const TAGLINES = [
  'Ask anything, get instant answers.',
  'Chat by voice, in your own language.',
  'Upload a file — Keshri reads it.',
  'Fast. Secure. Always available.',
];

const FEATURES = [
  { icon: MessageSquare, title: 'Natural conversation', desc: 'Streaming answers, markdown, code, and memory of your chat history.' },
  { icon: Globe2, title: 'Any language', desc: 'Ask in English, Hindi, French, German, or anything else — it just works.' },
  { icon: Zap, title: 'Real-time context', desc: 'Connect your knowledge base and tools so answers reflect current information.' },
  { icon: ShieldCheck, title: 'Private by design', desc: 'Your conversations are yours. Secure authentication, encrypted sessions.' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-surface overflow-hidden">
      {/* Aurora background */}
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40">
        <div className="absolute -top-40 left-1/4 w-96 h-96 bg-accent/30 rounded-full blur-3xl animate-pulseGlow" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulseGlow" />
      </div>

      <header className="flex items-center justify-between max-w-6xl mx-auto px-6 py-5">
        <div className="flex items-center gap-2 font-semibold">
          <Sparkles className="text-accent" size={20} /> Keshri
        </div>
        <div className="flex items-center gap-3 text-sm">
          <Link to="/login" className="px-3 py-1.5 hover:text-accent transition-colors">Log in</Link>
          <Link to="/register" className="px-3.5 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover glow-accent transition-all">Sign up</Link>
        </div>
      </header>

      <section className="max-w-3xl mx-auto text-center px-6 pt-16 pb-20 animate-fadeIn">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Meet Keshri.
          <br />
          <span className="text-accent block min-h-[2.6em] sm:min-h-[1.3em]">
            <Typewriter phrases={TAGLINES} />
          </span>
        </h1>
        <p className="text-neutral-500 max-w-xl mx-auto mb-8">
          A fast, secure AI assistant that understands your context, speaks your language, listens to your voice, and gets things done.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link to="/register" className="px-5 py-2.5 rounded-lg bg-accent text-white font-medium hover:bg-accent-hover glow-accent transition-all">
            Get started free
          </Link>
          <Link to="/login" className="px-5 py-2.5 rounded-lg glass-card hover:border-accent/40 transition-colors">
            Log in
          </Link>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FEATURES.map(({ icon: Icon, title, desc }) => (
          <div
            key={title}
            className="p-5 rounded-2xl glass-card hover:border-accent/40 hover:glow-accent transition-all"
          >
            <Icon className="text-accent mb-3" size={22} />
            <h3 className="font-semibold mb-1">{title}</h3>
            <p className="text-sm text-neutral-500">{desc}</p>
          </div>
        ))}
      </section>

      <ContactSection />

      <footer className="border-t border-neutral-200 dark:border-white/5 py-8 text-center text-xs text-neutral-400">
        © {new Date().getFullYear()} Keshri. All rights reserved.
      </footer>
    </div>
  );
}
