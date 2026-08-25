import { useEffect, useState } from 'react';
import { ChevronDown, Zap, Scale, BrainCircuit, Sparkles } from 'lucide-react';
import { api } from '../../api/client';

interface ModelInfo {
  id: string; // "provider:modelId", e.g. "anthropic:balanced"
  label: string;
  description: string;
  speed: string;
}

interface ProviderGroup {
  provider: string;
  models: ModelInfo[];
}

const ICONS: Record<string, any> = { fast: Zap, balanced: Scale, advanced: Sparkles, reasoning: BrainCircuit };
const PROVIDER_LABELS: Record<string, string> = { openai: 'OpenAI', anthropic: 'Anthropic' };

export default function ModelSelector({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const [groups, setGroups] = useState<ProviderGroup[]>([]);
  const [open, setOpen] = useState(false);
  const [providerConfigured, setProviderConfigured] = useState(true);

  useEffect(() => {
    api
      .get<{ data: { providers: ProviderGroup[] } }>('/api/chat/models')
      .then((res) => {
        setGroups(res.data.providers);
        setProviderConfigured(res.data.providers.length > 0);
      })
      .catch(() => setProviderConfigured(false));
  }, []);

  const models = groups.flatMap((g) => g.models);
  const active = models.find((m) => m.id === value) ?? models[0];
  const Icon = active ? ICONS[active.speed] ?? Sparkles : Sparkles;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm hover:bg-surface-raised transition-colors"
      >
        <Icon size={14} className="text-accent" />
        {active?.label ?? (providerConfigured ? 'Loading…' : 'No model configured')}
        <ChevronDown size={14} className="text-neutral-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-1 w-64 bg-surface-raised border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-40 py-1.5 animate-fadeIn">
          {!providerConfigured && (
            <p className="px-3 py-2 text-xs text-neutral-400">
              No AI provider configured. Set OPENAI_API_KEY and/or ANTHROPIC_API_KEY in the backend .env file.
            </p>
          )}
          {groups.map((group) => (
            <div key={group.provider}>
              <p className="px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-neutral-400">
                {PROVIDER_LABELS[group.provider] ?? group.provider}
              </p>
              {group.models.map((m) => {
                const ModelIcon = ICONS[m.speed] ?? Sparkles;
                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 flex items-start gap-2 ${
                      m.id === value ? 'bg-neutral-100 dark:bg-neutral-800' : ''
                    }`}
                  >
                    <ModelIcon size={16} className="text-accent mt-0.5 shrink-0" />
                    <span>
                      <span className="block text-sm font-medium">{m.label}</span>
                      <span className="block text-xs text-neutral-500">{m.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
