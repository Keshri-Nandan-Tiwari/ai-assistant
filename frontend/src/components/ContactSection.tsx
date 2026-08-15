import { useState } from 'react';
import { Github, Linkedin, Instagram, Mail, Send, Loader2, Check } from 'lucide-react';
import { api, ApiError } from '../api/client';

const LINKS = [
  { icon: Mail, label: 'Email', value: 'keshrinandantiwari08@gmail.com', href: 'mailto:keshrinandantiwari08@gmail.com' },
  { icon: Github, label: 'GitHub', value: '@Keshri-Nandan-Tiwari', href: 'https://github.com/Keshri-Nandan-Tiwari' },
  {
    icon: Linkedin,
    label: 'LinkedIn',
    value: 'Keshri Nandan Tiwari',
    href: 'https://www.linkedin.com/in/keshri-nandan-tiwari-a68042290/',
  },
  { icon: Instagram, label: 'Instagram', value: '@keshri_08__', href: 'https://www.instagram.com/keshri_08__' },
];

export default function ContactSection() {
  const [form, setForm] = useState({ name: '', email: '', message: '' });
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await api.post('/api/contact', form);
      setSent(true);
      setForm({ name: '', email: '', message: '' });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send your message. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="max-w-5xl mx-auto px-6 pb-24">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Let's connect</h2>
      <p className="text-neutral-500 text-center mb-10">Questions, feedback, or just want to say hi?</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="grid grid-cols-2 gap-3 content-start">
          {LINKS.map(({ icon: Icon, label, value, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="flex flex-col items-start gap-2 p-4 rounded-2xl glass-card hover:border-accent/40 hover:glow-accent transition-all"
            >
              <Icon size={20} className="text-accent" />
              <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-xs text-neutral-500 truncate max-w-full">{value}</p>
              </div>
            </a>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="p-5 rounded-2xl glass-card space-y-3">
          {sent ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-8 gap-2">
              <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center glow-accent">
                <Check size={18} />
              </div>
              <p className="font-medium">Message sent</p>
              <p className="text-sm text-neutral-500">Thanks for reaching out — I'll get back to you soon.</p>
            </div>
          ) : (
            <>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <input
                required
                placeholder="Your name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
              />
              <input
                required
                type="email"
                placeholder="Your email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full rounded-lg border border-neutral-300 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
              />
              <textarea
                required
                rows={4}
                placeholder="Your message"
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                className="w-full resize-none rounded-lg border border-neutral-300 dark:border-white/10 bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-accent/50"
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent hover:bg-accent-hover text-white font-medium py-2.5 glow-accent transition-all disabled:opacity-60"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                {loading ? 'Sending…' : 'Send message'}
              </button>
            </>
          )}
        </form>
      </div>
    </section>
  );
}
