import { SOCIAL_LINKS } from '../constants/socialLinks';

export default function ContactSection() {
  return (
    <section className="max-w-3xl mx-auto px-6 pb-24">
      <h2 className="text-2xl md:text-3xl font-bold text-center mb-8">Let's connect</h2>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {SOCIAL_LINKS.map(({ icon: Icon, label, href }) => (
          <a
            key={label}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="flex flex-col items-center gap-2 p-5 rounded-2xl glass-card hover:border-accent/40 hover:glow-accent transition-all"
          >
            <Icon className="w-9 h-9 rounded-lg" />
            <p className="text-sm font-medium">{label}</p>
          </a>
        ))}
      </div>
    </section>
  );
}
